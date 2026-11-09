// Judge-facing pages: landing (/) and dashboard (/dashboard).
// No frameworks, no new dependencies. All numbers on the landing page are
// rendered from the live server config, never hardcoded. Dashboard numbers
// come from /stats at runtime, so the page can never show stale figures.

const CSS = `
:root{--bg:#020617;--panel:#0e1223;--panel2:#111827;--line:#334155;--text:#f8fafc;--muted:#94a3b8;--accent:#f59e0b;--green:#22c55e;--amber:#fbbf24;--red:#ef4444;--blue:#60a5fa}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
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
@media(max-width:640px){.hero h1{font-size:32px}.hero{padding:40px 0 24px}.wrap{padding:0 16px}nav{gap:12px;font-size:13px}.kpi .value{font-size:28px}}
.dash-head{padding:48px 0 8px}
.dash-head h1{font-size:34px}
.refresh-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;font-size:13px;color:var(--muted)}
.refresh-row .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px}
.pause-btn{min-height:44px;padding:10px 16px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:14px;font-weight:600;cursor:pointer;transition:border-color .2s}
.pause-btn:hover{border-color:var(--accent)}
.kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:24px 0}
@media(min-width:900px){.kpi-grid{grid-template-columns:repeat(4,1fr)}}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}
.kpi .icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,.12);color:var(--accent);margin-bottom:12px}
.kpi .icon svg{width:20px;height:20px}
.kpi .label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}
.kpi .value{font-size:32px;font-weight:800;letter-spacing:-.02em;color:#fff;margin:6px 0 2px;line-height:1.1}
.kpi .sub{font-size:13px;color:var(--muted)}
.panels{display:grid;gap:16px;margin:8px 0}
@media(min-width:860px){.panels{grid-template-columns:1fr 1fr}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}
.panel h3{margin:0 0 4px;font-size:16px;color:#fff}
.panel .hint{font-size:13px;color:var(--muted);margin:0 0 16px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 4px}
.chip{min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:14px;cursor:pointer;transition:border-color .2s,color .2s}
.chip:hover{border-color:var(--accent)}
.chip[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);background:rgba(245,158,11,.08)}
.verdict-list{display:grid;gap:12px;list-style:none;margin:16px 0 0;padding:0}
.vcard{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 20px}
.vcard-top{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.vcard .subject{flex:1;min-width:200px;font-weight:700;color:#fff;font-size:15px;word-break:break-word}
.vsummary{color:var(--muted);font-size:14px;margin:10px 0 0}
.conf{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted);margin-top:12px}
.conf .bar{flex:1;height:6px;max-width:180px;background:#1e293b;border-radius:3px;overflow:hidden}
.conf .bar i{display:block;height:100%;background:var(--green)}
.vmeta{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.flag{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:rgba(251,191,36,.12);color:var(--amber);font-size:12px;font-weight:700}
.empty h3{color:#fff;font-size:16px;margin:0 0 6px}
.empty p{margin:0 0 14px}
.empty .steps{text-align:left;max-width:420px;margin:0 auto}
.empty .steps li{margin:6px 0}`;

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
<pre id="curl-example">curl -X POST https://verdict-api-t50q.onrender.com/verdict/link -H "Content-Type: application/json" -d '{"url": "https://example.com"}'
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
var curlPre = document.getElementById("curl-example");
var btns = document.querySelectorAll(".tabs button");
var curlBodies = {
  claim: { claim: "Example Domain is for documentation", sources: ["https://example.com"] },
  link: { url: "https://example.com" },
  token: { address: "0xTokenContractAddress" }
};
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
  curlPre.textContent = 'curl -X POST https://verdict-api-t50q.onrender.com/verdict/' + kind + ' -H "Content-Type: application/json" -d \\'' + JSON.stringify(curlBodies[kind]) + "'\\n# First reply: 402 with the terms above. Pay, resend with PAYMENT-SIGNATURE, get the verdict.";
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
<div class="dash-head">
<div class="eyebrow">Live earnings &middot; Kite testnet</div>
<h1>Dashboard</h1>
<p class="lede" style="font-size:16px">Every paid verdict, as it happens. Payments by x402 on Kite testnet, reasoning by SERV.</p>
<div class="refresh-row"><span><span class="dot"></span><b style="color:var(--green)">Live</b></span><span id="updated" role="status">Updated just now</span><button class="pause-btn" id="pause-btn" type="button" aria-pressed="false">Pause updates</button><a href="/stats">Raw stats JSON</a></div>
</div>

<section style="padding-top:8px" aria-label="Key numbers">
<div class="kpi-grid">
<div class="kpi"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></div><div class="label">Total calls</div><div class="value" id="kpi-calls">-</div><div class="sub" id="kpi-calls-sub">-</div></div>
<div class="kpi"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5c0-1.5-1.3-2.5-3-2.5s-3 .8-3 2 1 1.8 3 2.2 3 .8 3 2.3-1.3 2.5-3 2.5-3-1-3-2.5"/></svg></div><div class="label">Earned</div><div class="value" id="kpi-earned">-</div><div class="sub" id="kpi-earned-sub">Paid calls only</div></div>
<div class="kpi"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg></div><div class="label">Paid calls</div><div class="value" id="kpi-paid">-</div><div class="sub" id="kpi-paid-sub">-</div></div>
<div class="kpi"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/><path d="M12 8v4M12 16h.01"/></svg></div><div class="label">Scams stopped</div><div class="value" id="kpi-scam">-</div><div class="sub" id="kpi-scam-sub">-</div></div>
</div>

<div class="panels">
<div class="panel"><h3>Calls by endpoint</h3><p class="hint">Price per call: claim 2&cent;, link 3&cent;, token 5&cent;.</p><div id="by-kind">Loading...</div></div>
<div class="panel"><h3>Verdict mix</h3><p class="hint">Scam and risky are the calls that stopped a bad spend.</p><div id="by-verdict">Loading...</div></div>
</div>

<h2 style="margin-top:32px">Recent verdicts</h2>
<p class="sub">Newest first, with the reason SERV gave. Transaction links open on the Kite testnet explorer.</p>
<div class="filters" role="group" aria-label="Filter verdicts">
<button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>
<button class="chip" type="button" data-filter="safe" aria-pressed="false">Safe</button>
<button class="chip" type="button" data-filter="risky" aria-pressed="false">Risky</button>
<button class="chip" type="button" data-filter="scam" aria-pressed="false">Scam</button>
<button class="chip" type="button" data-filter="true" aria-pressed="false">True</button>
<button class="chip" type="button" data-filter="false" aria-pressed="false">False</button>
<button class="chip" type="button" data-filter="unclear" aria-pressed="false">Unclear</button>
</div>
<div id="recent-wrap"><div class="empty"><h3>Loading...</h3></div></div>
<p class="sub" style="margin-top:16px">Receipts live on the server and reset when Render redeploys or restarts the free instance. That is a property of free hosting, not of the verdicts: every paid call still settles on chain, and its transaction link stays valid.</p>
</section>
</main>
<footer><div class="wrap">Verdict API &middot; <a href="/">Back to the API</a> &middot; <a href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">Source on GitHub</a></div></footer>
<script>
var recentData = [];
var currentFilter = "all";
var paused = false;
var timer = null;
function el(tag, text, cls) {
  var n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function bars(host, obj, colors) {
  host.replaceChildren();
  var keys = Object.keys(obj || {});
  if (!keys.length) { host.appendChild(el("div", "None yet.", "hint")); return; }
  var max = Math.max.apply(null, keys.map(function (k) { return obj[k]; }));
  keys.sort(function (a, b) { return obj[b] - obj[a]; }).forEach(function (k) {
    var row = el("div", null, "bar-row");
    row.appendChild(el("span", k, "name"));
    var bar = el("span", null, "bar");
    var fill = document.createElement("i");
    fill.style.width = Math.max(4, Math.round((obj[k] / max) * 100)) + "%";
    fill.style.background = colors ? (colors[k] || "#f59e0b") : "#f59e0b";
    bar.appendChild(fill);
    row.appendChild(bar);
    row.appendChild(el("span", String(obj[k]), "count"));
    host.appendChild(row);
  });
}
function subjectFor(x) {
  var inp = x.input || {};
  if (inp.claim) return inp.claim;
  if (inp.url) return inp.url;
  if (inp.address) return inp.address;
  return x.kind + " check";
}
function shortText(s, n) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n - 1) + "..." : s;
}
function renderRecent() {
  var wrap = document.getElementById("recent-wrap");
  wrap.replaceChildren();
  var items = recentData.filter(function (x) { return currentFilter === "all" || String(x.verdict).toLowerCase() === currentFilter; });
  if (!recentData.length) {
    var empty = el("div", null, "empty");
    empty.appendChild(el("h3", "No calls yet"));
    empty.appendChild(el("p", "The first paid verdict will appear here, with the reason SERV gave for it."));
    var steps = document.createElement("ol");
    steps.className = "steps";
    var li1 = el("li"); li1.appendChild(document.createTextNode("Run the demo agent: ")); li1.appendChild(el("code", "npm run demo")); steps.appendChild(li1);
    var li2 = el("li"); li2.appendChild(document.createTextNode("Or try a link, free, in the Try it section on the ")); var a = document.createElement("a"); a.href = "/"; a.textContent = "landing page"; li2.appendChild(a); steps.appendChild(li2);
    var li3 = el("li", "Paid calls appear here within seconds.");
    steps.appendChild(li3);
    empty.appendChild(steps);
    wrap.appendChild(empty);
    return;
  }
  if (!items.length) {
    var none = el("div", null, "empty");
    none.appendChild(el("h3", "No " + currentFilter + " verdicts yet"));
    none.appendChild(el("p", "Try another filter, or wait for the next call."));
    wrap.appendChild(none);
    return;
  }
  var list = document.createElement("ul");
  list.className = "verdict-list";
  items.forEach(function (x) {
    var li = document.createElement("li");
    li.className = "vcard";
    var top = el("div", null, "vcard-top");
    top.appendChild(el("span", shortText(subjectFor(x), 140), "subject"));
    var badge = el("span", x.verdict, "badge " + String(x.verdict).toLowerCase());
    top.appendChild(badge);
    if (x.injection_detected) {
      var flag = el("span", "Injection flagged", "flag");
      top.appendChild(flag);
    }
    li.appendChild(top);
    li.appendChild(el("p", x.summary || "No summary returned for this call.", "vsummary"));
    var pct = Math.round(Number(x.confidence || 0) * 100);
    var conf = el("div", null, "conf");
    conf.appendChild(el("span", "Confidence " + pct + "%"));
    var bar = el("span", null, "bar");
    var fill = document.createElement("i");
    fill.style.width = Math.max(4, pct) + "%";
    var v = String(x.verdict).toLowerCase();
    fill.style.background = v === "scam" || v === "false" ? "#ef4444" : v === "risky" ? "#fbbf24" : v === "unclear" ? "#94a3b8" : "#22c55e";
    bar.appendChild(fill);
    conf.appendChild(bar);
    li.appendChild(conf);
    var meta = el("div", null, "vmeta");
    meta.appendChild(el("span", new Date(x.at).toLocaleString()));
    meta.appendChild(el("span", x.kind + " check"));
    meta.appendChild(el("span", x.payment_mode === "x402" ? x.paid_cents + "c paid" : "free, no payment"));
    if (x.model) meta.appendChild(el("span", "Model " + x.model));
    if (x.tx && /^[0-9a-fx]+$/i.test(x.tx)) {
      var txa = document.createElement("a");
      txa.href = "https://testnet.kitescan.ai/tx/" + x.tx;
      txa.textContent = "View tx " + x.tx.slice(0, 10) + "...";
      txa.target = "_blank"; txa.rel = "noreferrer";
      meta.appendChild(txa);
    }
    li.appendChild(meta);
    list.appendChild(li);
  });
  wrap.appendChild(list);
}
function refresh() {
  fetch("/stats").then(function (r) { return r.json(); }).then(function (s) {
    var paid = s.paid_calls || 0;
    document.getElementById("kpi-calls").textContent = s.calls;
    document.getElementById("kpi-calls-sub").textContent = paid + " paid, " + (s.calls - paid) + " free";
    document.getElementById("kpi-earned").textContent = "$" + (s.earned_cents / 100).toFixed(2);
    document.getElementById("kpi-earned-sub").textContent = paid ? "Avg " + (s.earned_cents / paid).toFixed(1) + "c per paid call" : "No paid calls yet";
    document.getElementById("kpi-paid").textContent = paid;
    document.getElementById("kpi-paid-sub").textContent = s.calls ? Math.round((paid / s.calls) * 100) + "% of all calls" : "No calls yet";
    var bv = s.by_verdict || {};
    document.getElementById("kpi-scam").textContent = bv.scam || 0;
    document.getElementById("kpi-scam-sub").textContent = (bv.risky || 0) + " risky flagged";
    bars(document.getElementById("by-kind"), s.by_kind || {}, { claim: "#f59e0b", link: "#60a5fa", token: "#22c55e" });
    bars(document.getElementById("by-verdict"), bv, { safe: "#22c55e", "true": "#22c55e", risky: "#fbbf24", scam: "#ef4444", "false": "#ef4444", unclear: "#94a3b8" });
    document.getElementById("updated").textContent = "Updated " + new Date().toLocaleTimeString();
    recentData = s.recent || [];
    renderRecent();
  }).catch(function () {
    var wrap = document.getElementById("recent-wrap");
    wrap.replaceChildren(el("div", "Could not load stats. Is the API awake?", "empty"));
  });
}
document.querySelectorAll(".chip").forEach(function (b) {
  b.addEventListener("click", function () {
    currentFilter = b.getAttribute("data-filter");
    document.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
    renderRecent();
  });
});
var pauseBtn = document.getElementById("pause-btn");
pauseBtn.addEventListener("click", function () {
  paused = !paused;
  pauseBtn.setAttribute("aria-pressed", String(paused));
  pauseBtn.textContent = paused ? "Resume updates" : "Pause updates";
  if (paused) { clearInterval(timer); timer = null; }
  else { refresh(); timer = setInterval(refresh, 3000); }
});
refresh();
timer = setInterval(refresh, 3000);
</script>`;
  return shell({ title: "Verdict API dashboard — live earnings", body });
}
