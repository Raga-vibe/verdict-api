import express from "express";
import { config, PRICES } from "./config.js";
import { requirePayment, paymentTerms } from "./payment.js";
import { linkEvidence, claimEvidence, tokenEvidence } from "./evidence.js";
import { runVerdict } from "./verdict.js";
import { logReceipt, readReceipts } from "./receipts.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.json({
    name: "Verdict API",
    about: "Agents pay a few cents before acting and get a verdict with quoted evidence. Reasoning by SERV, payments by x402 on Kite.",
    endpoints: Object.fromEntries(Object.entries(PRICES).map(([k, c]) => [`POST /verdict/${k}`, `${c} cents`])),
    payments: config.payments.mode,
    dashboard: "/dashboard",
  });
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

// Earnings dashboard: one plain HTML page, no frameworks. Polls /stats
// every 3 seconds. Tx links go to the Kite testnet explorer.
app.get("/dashboard", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Verdict API dashboard</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;color:#111}h1{font-size:24px}.cards{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #ddd;border-radius:8px;padding:12px 16px;min-width:140px}.card b{font-size:24px;display:block}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border-bottom:1px solid #eee;text-align:left;padding:8px 4px;font-size:14px}.muted{color:#666;font-size:14px}</style>
</head><body>
<h1>Verdict API</h1>
<p class="muted">Pay-per-call verdicts for AI agents. Payments by x402 on Kite testnet, reasoning by SERV. Refreshes every 3 seconds.</p>
<div class="cards">
<div class="card">Total calls<b id="calls">-</b></div>
<div class="card">Earned<b id="earned">-</b></div>
<div class="card">Calls by endpoint<b id="by-kind" style="font-size:16px">-</b></div>
</div>
<h2>Last 10 verdicts</h2>
<table><thead><tr><th>When</th><th>Kind</th><th>Verdict</th><th>Paid</th><th>Tx</th></tr></thead><tbody id="recent"><tr><td colspan="5">Loading...</td></tr></tbody></table>
<p class="muted">Free (payments off) calls count toward total calls but not earnings. <a href="/stats">Raw stats JSON</a></p>
<script>
async function refresh() {
  try {
    const r = await fetch("/stats");
    const s = await r.json();
    document.getElementById("calls").textContent = s.calls;
    document.getElementById("earned").textContent = (s.earned_cents / 100).toFixed(2) + " USD";
    document.getElementById("by-kind").textContent = Object.entries(s.by_kind || {}).map(([k, v]) => k + ": " + v).join("  ") || "none yet";
    const tbody = document.getElementById("recent");
    tbody.replaceChildren();
    if (!s.recent || !s.recent.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5; td.textContent = "No calls yet.";
      tr.appendChild(td); tbody.appendChild(tr);
      return;
    }
    for (const x of s.recent) {
      const tr = document.createElement("tr");
      const when = document.createElement("td"); when.textContent = new Date(x.at).toLocaleString();
      const kind = document.createElement("td"); kind.textContent = x.kind;
      const verdict = document.createElement("td"); verdict.textContent = x.verdict + " (" + x.confidence + ")";
      const paid = document.createElement("td"); paid.textContent = x.payment_mode === "x402" ? (x.paid_cents + "c") : "free";
      const tx = document.createElement("td");
      if (x.tx && /^[0-9a-fx]+$/i.test(x.tx)) {
        const a = document.createElement("a");
        a.href = "https://testnet.kitescan.ai/tx/" + x.tx;
        a.textContent = x.tx.slice(0, 10) + "..."; a.target = "_blank"; a.rel = "noreferrer";
        tx.appendChild(a);
      } else { tx.textContent = "-"; }
      tr.append(when, kind, verdict, paid, tx);
      tbody.appendChild(tr);
    }
  } catch (e) {
    document.getElementById("recent").innerHTML = "<tr><td colspan=5>Could not load stats.</td></tr>";
  }
}
refresh();
setInterval(refresh, 3000);
</script>
</body></html>`);
});

// Earnings for the dashboard
app.get("/stats", (req, res) => {
  const r = readReceipts();
  const byKind = {};
  for (const x of r) byKind[x.kind] = (byKind[x.kind] || 0) + 1;
  res.json({ calls: r.length, earned_cents: r.reduce((s, x) => s + (x.payment_mode === "x402" ? x.paid_cents : 0), 0), by_kind: byKind, recent: r.slice(-10).reverse() });
});

app.listen(config.port, () => console.log(`Verdict API on :${config.port} (payments ${config.payments.mode})`));
