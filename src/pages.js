// Judge-facing pages: landing (/) and dashboard (/dashboard).
// No frameworks, no new dependencies. All numbers on the landing page are
// rendered from the live server config, never hardcoded. Dashboard numbers
// come from /stats at runtime, so the page can never show stale figures.

const CSS = `
:root{--bg:#0a0f1e;--panel:#111827;--panel2:#0f172a;--line:#1e293b;--text:#e5e7eb;--muted:#94a3b8;--accent:#f59e0b;--green:#34d399;--amber:#fbbf24;--red:#f87171;--blue:#60a5fa}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55}
a{color:var(--blue);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1020px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(10,15,30,.92);backdrop-filter:blur(6px);z-index:10}
header.top .wrap{display:flex;align-items:center;gap:20px;height:58px}
.logo{font-weight:800;font-size:18px;color:#fff;letter-spacing:-.02em}
.logo span{color:var(--accent)}
nav{margin-left:auto;display:flex;gap:18px;font-size:14px}
nav a{color:var(--muted)}
nav a:hover{color:#fff;text-decoration:none}
.hero{padding:64px 0 40px}
.eyebrow{color:var(--accent);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
.hero h1{font-size:44px;line-height:1.1;margin:14px 0 16px;letter-spacing:-.03em;color:#fff}
.hero p.lede{font-size:19px;color:var(--muted);max-width:640px;margin:0 0 24px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-block;padding:11px 20px;border-radius:8px;font-weight:700;font-size:15px;border:1px solid var(--line);color:#fff;background:var(--panel)}
.btn:hover{text-decoration:none;border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#111827}
.status{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.pill{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--muted);background:var(--panel)}
.pill b{color:var(--green);font-weight:700}
.pill .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px}
section{padding:36px 0}
h2{font-size:24px;letter-spacing:-.02em;color:#fff;margin:0 0 8px}
.sub{color:var(--muted);margin:0 0 20px;max-width:640px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}
.card h3{margin:0 0 6px;font-size:16px;color:#fff}
.card p{margin:0;color:var(--muted);font-size:14px}
.card .price{font-size:30px;font-weight:800;color:#fff}
.card .price small{font-size:14px;color:var(--muted);font-weight:600}
.card code{color:var(--accent);font-size:13px}
.steps{counter-reset:step}
.step{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)}
.step:last-child{border-bottom:0}
.step .n{flex:0 0 32px;height:32px;border-radius:50%;background:var(--accent);color:#111827;font-weight:800;display:flex;align-items:center;justify-content:center}
.step h3{margin:2px 0 4px;font-size:16px;color:#fff}
.step p{margin:0;color:var(--muted);font-size:14px}
pre{background:#020617;border:1px solid var(--line);border-radius:10px;padding:16px;font-size:13px;line-height:1.5;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;overflow-x:hidden}
code{word-break:break-word}
.kv{background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.kv .row{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);font-size:14px;align-items:baseline}
.kv .row:last-child{border-bottom:0}
.kv .k{flex:0 0 118px;color:var(--muted)}
.kv .v{color:#fff;word-break:break-all}
.kv .v small{color:var(--muted)}
details{margin-top:12px}
details summary{cursor:pointer;color:var(--muted);font-size:14px}
details summary:hover{color:#fff}
details pre{margin-top:10px;max-height:320px;overflow-y:auto}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.tabs button{background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:8px;padding:8px 14px;font-size:14px;cursor:pointer}
.tabs button.active{border-color:var(--accent);color:var(--accent)}
footer{border-top:1px solid var(--line);padding:28px 0;color:var(--muted);font-size:13px}
.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;text-transform:capitalize}
.badge.safe,.badge.true{background:rgba(52,211,153,.15);color:var(--green)}
.badge.scam,.badge.false{background:rgba(248,113,113,.15);color:var(--red)}
.badge.risky{background:rgba(251,191,36,.15);color:var(--amber)}
.badge.unclear{background:rgba(148,163,184,.15);color:var(--muted)}
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}
.stat .label{font-size:13px;color:var(--muted)}
.stat .value{font-size:30px;font-weight:800;color:#fff;margin-top:4px}
.stat .note{font-size:13px;color:var(--muted)}
.bar-row{display:flex;align-items:center;gap:10px;font-size:13px;margin:6px 0}
.bar-row .name{width:90px;color:var(--muted);text-transform:capitalize}
.bar-row .bar{flex:1;height:8px;background:#1e293b;border-radius:4px;overflow:hidden}
.bar-row .bar i{display:block;height:100%;background:var(--accent)}
.bar-row .count{width:32px;text-align:right;color:#fff;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.empty{background:var(--panel);border:1px dashed var(--line);border-radius:12px;padding:28px;text-align:center;color:var(--muted)}
.empty code{color:var(--accent)}
.live{font-size:13px;color:var(--muted)}
.live b{color:var(--green)}
@media(max-width:640px){.hero h1{font-size:32px}.hero{padding:40px 0 24px}}
`;

function shell({ title, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${CSS}</style></head>
<body>${body}</body></html>`;
}

function topNav(active) {
  return `<header class="top"><div class="wrap">
<a class="logo" href="/">Verdict<span> API</span></a>
<nav><a href="/dashboard"${active === "dashboard" ? ' style="color:#fff"' : ""}>Dashboard</a><a href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">GitHub</a><a href="https://www.openserv.ai/hackathon-2" target="_blank" rel="noreferrer">Hackathon</a></nav>
</div></header>`;
}

export function landingPage({ prices, paymentsMode, network, asset, payTo }) {
  const shortAddr = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "not set");
  const body = `${topNav("home")}
<main class="wrap">
<div class="hero">
<div class="eyebrow">OpenServ SERV Hackathon 02 &middot; Kite track</div>
<h1>A paid second opinion<br>for AI agents.</h1>
<p class="lede">Before an agent buys, signs up or trades, it asks Verdict API &ldquo;is this safe?&rdquo;, pays a few cents over x402 on Kite, and gets a clear verdict with quoted evidence. Reasoning by SERV, payments by Kite Passport.</p>
<div class="btns"><a class="btn primary" href="/dashboard">View the dashboard</a><a class="btn" href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">Read the README</a></div>
<div class="status">
<span class="pill"><span class="dot"></span><b>Live</b> &middot; payments ${paymentsMode}</span>
<span class="pill">Network ${network}</span>
<span class="pill">Token ${shortAddr(asset)}</span>
<span class="pill">Seller ${shortAddr(payTo)}</span>
</div>
</div>

<section>
<h2>How a call works</h2>
<p class="sub">Four steps, every time. No account, no API key on the agent side. The agent just pays.</p>
<div class="steps">
<div class="step"><div class="n">1</div><div><h3>Agent asks, gets a 402</h3><p>The agent calls an endpoint with no payment and gets a 402 with the exact x402 terms: price, token, seller and timeout.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>Agent pays over x402 on Kite</h3><p>Its Kite Passport pays a few cents in pieUSD and resends the call with a payment signature. The Pieverse facilitator verifies and settles it.</p></div></div>
<div class="step"><div class="n">3</div><div><h3>We gather the evidence</h3><p>Page text, sources or DexScreener data, depending on the endpoint. Hidden instruction-like text on the page is flagged by our own scanner.</p></div></div>
<div class="step"><div class="n">4</div><div><h3>SERV Reasoning decides, with receipts</h3><p>SERV Reasoning judges with Prompt Guard and Shadow Agent on. Our code then checks every quoted reason really exists in the evidence. No verified quote, no confident verdict. The receipt is logged with its transaction.</p></div></div>
</div>
</section>

<section>
<h2>Pricing</h2>
<p class="sub">Pay per call, in pieUSD on Kite testnet. No subscription, no free tier to abuse.</p>
<div class="grid">
<div class="card"><h3>Claim</h3><div class="price">${prices.claim}<small> &cent;</small></div><p><code>POST /verdict/claim</code></p><p>Is this claim supported by its sources? Verdicts: true / false / unclear.</p></div>
<div class="card"><h3>Link</h3><div class="price">${prices.link}<small> &cent;</small></div><p><code>POST /verdict/link</code></p><p>Is this page safe to buy from or sign up on? Verdicts: safe / risky / scam / unclear.</p></div>
<div class="card"><h3>Token</h3><div class="price">${prices.token}<small> &cent;</small></div><p><code>POST /verdict/token</code></p><p>Is this token a reasonable buy or a likely rug pull? Verdicts: safe / risky / scam / unclear.</p></div>
</div>
</section>

<section>
<h2>Why trust a verdict?</h2>
<div class="grid">
<div class="card"><h3>Quoted evidence, checked in code</h3><p>Every reason must quote the evidence word for word. Our code drops any reason whose quote is not in the evidence, and refuses a confident verdict with no verified reason.</p></div>
<div class="card"><h3>Prompt-injection detection</h3><p>Hidden text that tries to instruct the agent, in comments or hidden elements, is flagged by the scanner and can only push a verdict toward risky, never toward safe.</p></div>
<div class="card"><h3>Two SERV passes on hard calls</h3><p>Low-confidence or unparseable first answers are retried with the hard SERV model before we give up and answer unclear.</p></div>
<div class="card"><h3>Auditable receipts</h3><p>Every paid call is logged with its verdict, price and settlement transaction, linked from the dashboard to the Kite testnet explorer.</p></div>
</div>
</section>

<section>
<h2>Try it: read the payment terms, free</h2>
<p class="sub">Pick an endpoint to see exactly what an agent is asked to pay, before any payment happens.</p>
<div class="tabs">
<button data-kind="claim">Claim &middot; ${prices.claim}&cent;</button>
<button data-kind="link" class="active">Link &middot; ${prices.link}&cent;</button>
<button data-kind="token">Token &middot; ${prices.token}&cent;</button>
</div>
<div class="kv" id="terms"><div class="row"><div class="k">Terms</div><div class="v">Loading...</div></div></div>
<details><summary>View the full terms as JSON</summary><pre id="terms-json">Loading...</pre></details>
<p class="sub" style="margin-top:20px">Then pay it for real:</p>
<pre>curl -X POST https://verdict-api-t50q.onrender.com/verdict/link -H "Content-Type: application/json" -d '{"url": "https://example.com"}'
# First reply: 402 with the terms above. Pay, resend with PAYMENT-SIGNATURE, get the verdict.</pre>
</section>

<section>
<h2>What an agent gets back</h2>
<pre>{
  "verdict": "scam",
  "confidence": 0.86,
  "summary": "Brand store on an unrelated domain asking for crypto to a personal wallet.",
  "reasons": [{ "point": "Payment only in USDT to a wallet", "quote": "send USDT to 0x..." }],
  "injection_detected": true,
  "checks": { "quotes_verified": 3, "quotes_dropped": 0 },
  "receipt": "..."
}</pre>
</section>
</main>
<footer><div class="wrap">Verdict API &middot; Built for the OpenServ SERV Hackathon Edition 02, Kite track. Reasoning by SERV, payments by x402 on Kite. <a href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">Source on GitHub</a></div></footer>
<script>
var box = document.getElementById("terms");
var full = document.getElementById("terms-json");
var btns = document.querySelectorAll(".tabs button");
function shortAddr(a) { return a ? a.slice(0, 6) + "..." + a.slice(-4) : "-"; }
function row(k, v, sub) {
  var r = document.createElement("div"); r.className = "row";
  var kk = document.createElement("div"); kk.className = "k"; kk.textContent = k;
  var vv = document.createElement("div"); vv.className = "v"; vv.textContent = v;
  if (sub) { vv.appendChild(document.createElement("br")); var s = document.createElement("small"); s.textContent = sub; vv.appendChild(s); }
  r.appendChild(kk); r.appendChild(vv);
  return r;
}
function load(kind) {
  btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-kind") === kind); });
  box.replaceChildren(row("Terms", "Loading..."));
  full.textContent = "Loading...";
  fetch("/verdict/" + kind + "/terms").then(function (r) { return r.json(); }).then(function (j) {
    var a = (j.accepts && j.accepts[0]) || {};
    var cents = a.amount ? (Number(a.amount) / 1e16).toFixed(0) : "?";
    var fields = j.outputSchema && j.outputSchema.input && j.outputSchema.input.bodyFields
      ? Object.keys(j.outputSchema.input.bodyFields).map(function (f) { return f + (j.outputSchema.input.bodyFields[f].required ? " (required)" : " (optional)"); }).join(", ")
      : "-";
    box.replaceChildren(
      row("Price", cents + " cents", "in pieUSD on Kite testnet"),
      row("Network", a.network || "-"),
      row("Token", shortAddr(a.asset), a.asset || ""),
      row("Pay to", shortAddr(a.payTo), a.payTo || ""),
      row("You send", fields),
      row("You get back", "verdict, confidence, reasons with quotes")
    );
    full.textContent = JSON.stringify(j, null, 2);
  }).catch(function () {
    box.replaceChildren(row("Terms", "Could not load. Is the API awake?"));
    full.textContent = "Could not load payment terms.";
  });
}
btns.forEach(function (b) { b.addEventListener("click", function () { load(b.getAttribute("data-kind")); }); });
load("link");
</script>`;
  return shell({ title: "Verdict API — a paid second opinion for AI agents", body });
}

export function dashboardPage() {
  const body = `${topNav("dashboard")}
<main class="wrap">
<div class="hero" style="padding:44px 0 8px">
<div class="eyebrow">Live earnings</div>
<h1 style="font-size:34px">Dashboard</h1>
<p class="lede" style="font-size:16px">Every paid verdict, as it happens. Payments by x402 on Kite testnet, reasoning by SERV.</p>
<p class="live"><b>&#9679; Live</b> &middot; refreshes every 3 seconds &middot; <a href="/stats">raw stats JSON</a></p>
</div>

<section style="padding-top:8px">
<div class="statgrid">
<div class="stat"><div class="label">Total calls</div><div class="value" id="calls">-</div><div class="note" id="paid-note">-</div></div>
<div class="stat"><div class="label">Earned</div><div class="value" id="earned">-</div><div class="note">Paid calls only. Free calls earn nothing.</div></div>
<div class="stat"><div class="label">Calls by endpoint</div><div id="by-kind" style="margin-top:10px">-</div></div>
<div class="stat"><div class="label">Verdicts</div><div id="by-verdict" style="margin-top:10px">-</div></div>
</div>

<h2>Recent verdicts</h2>
<p class="sub">Newest first. Transaction links open on the Kite testnet explorer.</p>
<div id="recent-wrap"><div class="empty">Loading...</div></div>
<p class="sub" style="margin-top:16px">Receipts live on the server and reset when Render redeploys or restarts the free instance. That is a property of free hosting, not of the verdicts: every paid call still settles on chain, and its transaction link stays valid.</p>
</section>
</main>
<footer><div class="wrap">Verdict API &middot; <a href="/">Back to the API</a> &middot; <a href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">Source on GitHub</a></div></footer>
<script>
function el(tag, text, cls) {
  var n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function bars(host, obj, color) {
  host.replaceChildren();
  var keys = Object.keys(obj || {});
  if (!keys.length) { host.appendChild(el("div", "None yet.", "note")); return; }
  var max = Math.max.apply(null, keys.map(function (k) { return obj[k]; }));
  keys.sort(function (a, b) { return obj[b] - obj[a]; }).forEach(function (k) {
    var row = el("div", null, "bar-row");
    row.appendChild(el("span", k, "name"));
    var bar = el("span", null, "bar");
    var fill = document.createElement("i");
    fill.style.width = Math.max(4, Math.round((obj[k] / max) * 100)) + "%";
    if (color) fill.style.background = color;
    bar.appendChild(fill);
    row.appendChild(bar);
    row.appendChild(el("span", String(obj[k]), "count"));
    host.appendChild(row);
  });
}
function refresh() {
  fetch("/stats").then(function (r) { return r.json(); }).then(function (s) {
    document.getElementById("calls").textContent = s.calls;
    document.getElementById("earned").textContent = "$" + (s.earned_cents / 100).toFixed(2);
    document.getElementById("paid-note").textContent = (s.paid_calls || 0) + " paid, " + (s.calls - (s.paid_calls || 0)) + " free";
    bars(document.getElementById("by-kind"), s.by_kind || {});
    bars(document.getElementById("by-verdict"), s.by_verdict || {});
    var wrap = document.getElementById("recent-wrap");
    wrap.replaceChildren();
    if (!s.recent || !s.recent.length) {
      var empty = el("div", null, "empty");
      empty.appendChild(document.createTextNode("No calls yet. The first paid verdict will appear here. Run the demo agent: "));
      var code = el("code", "npm run demo");
      empty.appendChild(code);
      wrap.appendChild(empty);
      return;
    }
    var table = document.createElement("table");
    var head = document.createElement("thead");
    var hr = document.createElement("tr");
    ["When", "Kind", "Verdict", "Paid", "Tx"].forEach(function (h) { hr.appendChild(el("th", h)); });
    head.appendChild(hr);
    table.appendChild(head);
    var body = document.createElement("tbody");
    s.recent.forEach(function (x) {
      var tr = document.createElement("tr");
      tr.appendChild(el("td", new Date(x.at).toLocaleString()));
      tr.appendChild(el("td", x.kind));
      var vt = el("td");
      var badge = el("span", x.verdict, "badge " + String(x.verdict).toLowerCase());
      vt.appendChild(badge);
      vt.appendChild(document.createTextNode(" " + x.confidence));
      tr.appendChild(vt);
      tr.appendChild(el("td", x.payment_mode === "x402" ? x.paid_cents + "c" : "free"));
      var tx = el("td");
      if (x.tx && /^[0-9a-fx]+$/i.test(x.tx)) {
        var a = document.createElement("a");
        a.href = "https://testnet.kitescan.ai/tx/" + x.tx;
        a.textContent = x.tx.slice(0, 10) + "...";
        a.target = "_blank"; a.rel = "noreferrer";
        tx.appendChild(a);
      } else { tx.textContent = "-"; }
      tr.appendChild(tx);
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
  }).catch(function () {
    document.getElementById("recent-wrap").replaceChildren(el("div", "Could not load stats. Is the API awake?", "empty"));
  });
}
refresh();
setInterval(refresh, 3000);
</script>`;
  return shell({ title: "Verdict API dashboard — live earnings", body });
}
