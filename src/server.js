import express from "express";
import { config, PRICES, API_VERSION } from "./config.js";
import { requirePayment, paymentTerms } from "./payment.js";
import { linkEvidence, claimEvidence, tokenEvidence } from "./evidence.js";
import { runVerdict } from "./verdict.js";
import { logReceipt, readReceipts } from "./receipts.js";
import { landingPage, dashboardPage } from "./pages.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

// Standard error envelope: { "error": "<human message>", "code": "<MACHINE_CODE>", ... }
// The "error" string is kept so existing clients keep working; "code" is the
// stable machine-readable part. Validation errors are 400, unknown resources
// 404, wrong method 405, verdict failures 500.
function apiError(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra });
}

// Browsers get the landing page, API clients get JSON. curl sends */*,
// so machine callers keep the JSON they already use.
app.get("/", (req, res) => {
  const info = {
    name: "Verdict API",
    version: API_VERSION,
    about: "Agents pay a few cents before acting and get a verdict with quoted evidence. Reasoning by SERV, payments by x402 on Kite.",
    endpoints: Object.fromEntries(Object.entries(PRICES).map(([k, c]) => [`POST /v1/verdict/${k}`, `${c} cents`])),
    payments: config.payments.mode,
    health: "/health",
    openapi: "/openapi.json",
    dashboard: "/dashboard",
  };
  if ((req.headers.accept || "").includes("text/html")) {
    return res.type("html").send(landingPage({
      prices: PRICES,
      paymentsMode: config.payments.mode,
      network: config.payments.network,
      asset: config.payments.asset,
      payTo: config.payments.payTo,
    }));
  }
  res.json(info);
});

// Health check: cheap, no keys, no payment.
app.get("/health", (req, res) => {
  res.json({ status: "ok", version: API_VERSION, payments: config.payments.mode, timestamp: new Date().toISOString() });
});

// Machine-readable API reference, generated from the live config so prices
// and payment details can never go stale in the docs.
app.get("/openapi.json", (req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json(openapiDoc());
});

function openapiDoc() {
  const kindParam = { name: "kind", in: "path", required: true, schema: { type: "string", enum: ["claim", "link", "token"] }, description: "What to check: a claim, a link, or a token." };
  const verdictSchema = {
    type: "object",
    properties: {
      verdict: { type: "string", description: "claim: true | false | unclear. link/token: safe | risky | scam | unclear" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      summary: { type: "string", description: "One-sentence reason for the verdict" },
      reasons: { type: "array", items: { type: "object", properties: { point: { type: "string" }, quote: { type: "string", description: "Quoted word for word from the evidence, verified in code" } } } },
      injection_detected: { type: "boolean" },
      checks: { type: "object", properties: { quotes_verified: { type: "integer" }, quotes_dropped: { type: "integer" } } },
      model: { type: "string", description: "SERV model that produced the verdict" },
      receipt: { type: "string", description: "Receipt id for this paid call" },
    },
  };
  const errorSchema = {
    type: "object",
    properties: {
      error: { type: "string", description: "Human-readable message" },
      code: { type: "string", description: "Stable machine-readable code: VALIDATION_ERROR, UNKNOWN_KIND, METHOD_NOT_ALLOWED, NOT_FOUND, PAYMENT_REQUIRED, VERDICT_FAILED, INTERNAL_ERROR" },
      detail: { type: "string" },
      path: { type: "string" },
    },
  };
  const verdictOp = (description) => ({
    summary: "Request a paid verdict",
    description,
    parameters: [kindParam],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { type: "object", properties: { claim: { type: "string" }, sources: { type: "array", items: { type: "string" } }, url: { type: "string" }, address: { type: "string" }, chain: { type: "string" } } },
          examples: {
            claim: { value: { claim: "Example Domain is for documentation", sources: ["https://example.com"] } },
            link: { value: { url: "https://example.com" } },
            token: { value: { address: "0xTokenContractAddress" } },
          },
        },
      },
    },
    responses: {
      200: { description: "Verdict with quoted evidence", content: { "application/json": { schema: verdictSchema } } },
      400: { description: "Validation error", content: { "application/json": { schema: errorSchema } } },
      402: { description: "Payment required: x402 v2 terms for this check, plus the standard error envelope", content: { "application/json": { schema: { type: "object", properties: { x402Version: { type: "integer" }, resource: { type: "object" }, accepts: { type: "array" }, error: { type: "string", description: "Human-readable message saying what the check costs and how to pay" }, code: { type: "string", description: "PAYMENT_REQUIRED" } } } } } },
      405: { description: "Wrong method for this path", content: { "application/json": { schema: errorSchema } } },
      500: { description: "Verdict failed", content: { "application/json": { schema: errorSchema } } },
    },
  });
  const termsOp = (description) => ({
    summary: "Read the payment terms, free",
    description,
    parameters: [kindParam],
    responses: {
      200: { description: "x402 v2 payment terms", content: { "application/json": { schema: { type: "object", properties: { x402Version: { type: "integer" }, resource: { type: "object" }, accepts: { type: "array" }, outputSchema: { type: "object" } } } } } },
      404: { description: "Unknown kind", content: { "application/json": { schema: errorSchema } } },
    },
  });
  return {
    openapi: "3.0.3",
    info: {
      title: "Verdict API",
      version: API_VERSION,
      description: "Agents pay a few cents before acting and get a verdict with quoted evidence. Reasoning by SERV, payments by x402 on Kite. Prices: claim 2c, link 3c, token 5c, in pieUSD on Kite testnet.",
    },
    servers: [{ url: config.publicUrl }],
    paths: {
      "/": { get: { summary: "API info (JSON) or landing page (HTML)", responses: { 200: { description: "API info" } } } },
      "/health": { get: { summary: "Health check", responses: { 200: { description: "Service is up", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, version: { type: "string" }, payments: { type: "string" }, timestamp: { type: "string" } } } } } } } } },
      "/openapi.json": { get: { summary: "This OpenAPI document", responses: { 200: { description: "OpenAPI 3.0 document" } } } },
      "/v1/verdict/{kind}": { post: verdictOp("Canonical, versioned verdict endpoint. Call with no payment first to get a 402 with the exact x402 terms, pay, then resend with a PAYMENT-SIGNATURE header.") },
      "/verdict/{kind}": { post: verdictOp("Unversioned alias of /v1/verdict/{kind}. Still works; new clients should use /v1/.") },
      "/v1/verdict/{kind}/terms": { get: termsOp("Canonical, versioned payment terms. Free, no payment needed.") },
      "/verdict/{kind}/terms": { get: termsOp("Unversioned alias of /v1/verdict/{kind}/terms. Still works; new clients should use /v1/.") },
      "/stats": {
        get: {
          summary: "Calls and earnings",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 10 }, description: "How many recent verdicts to return" },
            { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 }, description: "How many recent verdicts to skip" },
          ],
          responses: {
            200: { description: "Stats and the most recent verdicts, newest first", content: { "application/json": { schema: { type: "object", properties: { calls: { type: "integer" }, paid_calls: { type: "integer" }, earned_cents: { type: "integer" }, by_kind: { type: "object" }, by_verdict: { type: "object" }, earned_by_kind: { type: "object" }, limit: { type: "integer" }, offset: { type: "integer" }, total: { type: "integer" }, recent: { type: "array" } } } } } },
            400: { description: "Bad limit or offset", content: { "application/json": { schema: errorSchema } } },
          },
        },
      },
      "/dashboard": { get: { summary: "HTML earnings dashboard", responses: { 200: { description: "Dashboard page" } } } },
    },
    components: { schemas: { VerdictResponse: verdictSchema, ErrorEnvelope: errorSchema } },
  };
}

function handler(kind, getEvidence, validate, base) {
  return [
    (req, res, next) => {
      const err = validate(req.body || {});
      return err ? apiError(res, 400, "VALIDATION_ERROR", err) : next();
    },
    requirePayment(kind, base),
    async (req, res) => {
      const started = Date.now();
      try {
        const fetched = await getEvidence(req.body);
        const evidence = typeof fetched === "string" ? fetched : fetched.evidence;
        const result = await runVerdict(kind, evidence, { rawHtml: fetched.rawHtml || "" });
        const receipt = logReceipt({ kind, input: req.body, verdict: result.verdict, confidence: result.confidence, summary: String(result.summary || "").slice(0, 280), injection_detected: result.injection_detected, model: result.model, quotes_verified: result.checks.quotes_verified, paid_cents: req.payment.amountCents, payment_mode: req.payment.mode, tx: req.payment.tx ?? null, ms: Date.now() - started });
        res.json({ ...result, receipt });
      } catch (e) {
        console.error(e);
        apiError(res, 500, "VERDICT_FAILED", "verdict failed", { detail: String(e.message || e) });
      }
    },
  ];
}

// The canonical paths are /v1/...; the unversioned /verdict/... paths are
// kept working for existing clients. Terms fetched from one base always
// describe the resource under that same base, so a payment can never be
// issued for one URL and spent on another.
function mountVerdictRoutes(base) {
  // Free discovery: lets agents read the terms without calling
  app.get(`${base}/verdict/:kind/terms`, (req, res) => {
    if (!PRICES[req.params.kind]) return apiError(res, 404, "UNKNOWN_KIND", "unknown kind");
    res.json(paymentTerms(req.params.kind, base));
  });

  app.post(`${base}/verdict/claim`, ...handler("claim", (b) => claimEvidence(b.claim, b.sources || []), (b) => (!b.claim ? "claim is required" : null), base));
  app.post(`${base}/verdict/link`, ...handler("link", (b) => linkEvidence(b.url), (b) => (!/^https?:\/\//.test(b.url || "") ? "url must start with http(s)://" : null), base));
  app.post(`${base}/verdict/token`, ...handler("token", (b) => tokenEvidence(b.address, b.chain), (b) => (!b.address ? "address is required" : null), base));

  // A GET on a POST-only verdict path is a 405, not a 404.
  app.get(`${base}/verdict/:kind`, (req, res) => {
    if (!PRICES[req.params.kind]) return apiError(res, 404, "UNKNOWN_KIND", "unknown kind");
    res.set("Allow", "POST");
    return apiError(res, 405, "METHOD_NOT_ALLOWED", `Use POST ${base}/verdict/${req.params.kind} to request a verdict.`);
  });
}
mountVerdictRoutes("");
mountVerdictRoutes("/v1");

// Earnings dashboard (see src/pages.js). Polls /stats every 3 seconds.
// Tx links go to the Kite testnet explorer.
app.get("/dashboard", (req, res) => {
  res.type("html").send(dashboardPage());
});

// Earnings for the dashboard. ?limit= (default 10, max 50) and ?offset=
// page through recent verdicts, newest first.
app.get("/stats", (req, res) => {
  res.set("Cache-Control", "no-store");
  let limit = 10;
  let offset = 0;
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return apiError(res, 400, "VALIDATION_ERROR", "limit must be an integer between 1 and 50");
  }
  if (req.query.offset !== undefined) {
    offset = Number(req.query.offset);
    if (!Number.isInteger(offset) || offset < 0) return apiError(res, 400, "VALIDATION_ERROR", "offset must be an integer of 0 or more");
  }
  const r = readReceipts();
  const byKind = {};
  const byVerdict = {};
  const earnedByKind = {};
  let paidCalls = 0;
  for (const x of r) {
    byKind[x.kind] = (byKind[x.kind] || 0) + 1;
    byVerdict[x.verdict] = (byVerdict[x.verdict] || 0) + 1;
    if (x.payment_mode === "x402") {
      paidCalls += 1;
      earnedByKind[x.kind] = (earnedByKind[x.kind] || 0) + x.paid_cents;
    }
  }
  const recent = r.slice().reverse().slice(offset, offset + limit);
  res.json({ calls: r.length, paid_calls: paidCalls, earned_cents: r.reduce((s, x) => s + (x.payment_mode === "x402" ? x.paid_cents : 0), 0), by_kind: byKind, by_verdict: byVerdict, earned_by_kind: earnedByKind, limit, offset, total: r.length, recent });
});

// Anything else is a JSON 404, never Express's HTML error page: this is
// a JSON API first, and the only browser pages are / and /dashboard.
app.use((req, res) => apiError(res, 404, "NOT_FOUND", "Not found", { path: req.path }));

// JSON errors for body-parse failures and anything the payment middleware
// or a handler passes to next(error).
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err?.type === "entity.parse.failed") return apiError(res, 400, "BAD_REQUEST", "Request body is not valid JSON");
  return apiError(res, err?.status || 500, "INTERNAL_ERROR", "Internal server error", { detail: String(err?.message || err) });
});

app.listen(config.port, () => console.log(`Verdict API v${API_VERSION} on :${config.port} (payments ${config.payments.mode})`));
