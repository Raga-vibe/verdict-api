import express from "express";
import { config, PRICES } from "./config.js";
import { requirePayment, paymentTerms } from "./payment.js";
import { linkEvidence, claimEvidence, tokenEvidence } from "./evidence.js";
import { runVerdict } from "./verdict.js";
import { logReceipt, readReceipts } from "./receipts.js";
import { landingPage, dashboardPage } from "./pages.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

// Browsers get the landing page, API clients get JSON. curl sends */*,
// so machine callers keep the JSON they already use.
app.get("/", (req, res) => {
  const info = {
    name: "Verdict API",
    about: "Agents pay a few cents before acting and get a verdict with quoted evidence. Reasoning by SERV, payments by x402 on Kite.",
    endpoints: Object.fromEntries(Object.entries(PRICES).map(([k, c]) => [`POST /verdict/${k}`, `${c} cents`])),
    payments: config.payments.mode,
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

// Free discovery: lets agents read the terms without calling
app.get("/verdict/:kind/terms", (req, res) => {
  if (!PRICES[req.params.kind]) return res.status(404).json({ error: "unknown kind" });
  res.json(paymentTerms(req.params.kind, req));
});

function handler(kind, getEvidence, validate) {
  return [
    (req, res, next) => {
      const err = validate(req.body || {});
      return err ? res.status(400).json({ error: err }) : next();
    },
    requirePayment(kind),
    async (req, res) => {
      const started = Date.now();
      try {
        const fetched = await getEvidence(req.body);
        const evidence = typeof fetched === "string" ? fetched : fetched.evidence;
        const result = await runVerdict(kind, evidence, { rawHtml: fetched.rawHtml || "" });
        const receipt = logReceipt({ kind, input: req.body, verdict: result.verdict, confidence: result.confidence, paid_cents: req.payment.amountCents, payment_mode: req.payment.mode, tx: req.payment.tx ?? null, ms: Date.now() - started });
        res.json({ ...result, receipt });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "verdict failed", detail: String(e.message || e) });
      }
    },
  ];
}

app.post("/verdict/claim", ...handler("claim", (b) => claimEvidence(b.claim, b.sources || []), (b) => (!b.claim ? "claim is required" : null)));
app.post("/verdict/link", ...handler("link", (b) => linkEvidence(b.url), (b) => (!/^https?:\/\//.test(b.url || "") ? "url must start with http(s)://" : null)));
app.post("/verdict/token", ...handler("token", (b) => tokenEvidence(b.address, b.chain), (b) => (!b.address ? "address is required" : null)));

// Earnings dashboard (see src/pages.js). Polls /stats every 3 seconds.
// Tx links go to the Kite testnet explorer.
app.get("/dashboard", (req, res) => {
  res.type("html").send(dashboardPage());
});

// Earnings for the dashboard
app.get("/stats", (req, res) => {
  const r = readReceipts();
  const byKind = {};
  const byVerdict = {};
  let paidCalls = 0;
  for (const x of r) {
    byKind[x.kind] = (byKind[x.kind] || 0) + 1;
    byVerdict[x.verdict] = (byVerdict[x.verdict] || 0) + 1;
    if (x.payment_mode === "x402") paidCalls += 1;
  }
  res.json({ calls: r.length, paid_calls: paidCalls, earned_cents: r.reduce((s, x) => s + (x.payment_mode === "x402" ? x.paid_cents : 0), 0), by_kind: byKind, by_verdict: byVerdict, recent: r.slice(-10).reverse() });
});

app.listen(config.port, () => console.log(`Verdict API on :${config.port} (payments ${config.payments.mode})`));
