import { WIDGET_STATES, DASHBOARD_STATES } from "./states.js";

// Judge-facing pages: landing (/) and dashboard (/dashboard).
// No frameworks, no new dependencies. All numbers on the landing page are
// rendered from the live server config, never hardcoded. Dashboard numbers
// come from /stats at runtime, so the page can never show stale figures.

const CSS = `
:root{--bg:#020617;--panel:#0e1223;--panel2:#111827;--line:#334155;--text:#f8fafc;--muted:#94a3b8;--accent:#f59e0b;--green:#22c55e;--amber:#fbbf24;--red:#ef4444;--blue:#60a5fa;--font-display:"Space Grotesk",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--font-mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace}
*{box-sizing:border-box}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55}
a{color:var(--blue);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1020px;margin:0 auto;padding:0 20px}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(10,15,30,.92);backdrop-filter:blur(6px);z-index:10}
header.top .wrap{display:flex;align-items:center;gap:20px;height:58px}
.logo{font-family:var(--font-display);font-weight:700;font-size:18px;color:#fff;letter-spacing:-.02em}
.logo span{color:var(--accent)}
nav{margin-left:auto;display:flex;gap:18px;font-size:14px}
nav a{color:var(--muted)}
nav a:hover{color:#fff;text-decoration:none}
.hero{padding:44px 0 28px}
.hero-grid{display:grid;gap:32px;align-items:start}
@media(min-width:860px){.hero-grid{grid-template-columns:1.05fr .95fr}}
.receipt{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px;position:relative}
.receipt-head{display:flex;justify-content:space-between;gap:12px;font-family:var(--font-mono);font-size:12px;color:var(--muted)}
.receipt-head .tag{color:var(--amber);font-weight:700}
.stamp{position:absolute;top:38px;right:16px;border:3px solid var(--red);color:var(--red);font-family:var(--font-display);font-weight:700;font-size:18px;letter-spacing:.08em;padding:2px 10px;border-radius:6px;transform:rotate(-4deg);animation:stamp-in .25s ease-out both}
@keyframes stamp-in{from{opacity:0;transform:rotate(-4deg) scale(1.4)}to{opacity:1;transform:rotate(-4deg) scale(1)}}
.receipt .row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px dashed var(--line);font-size:14px}
.receipt .row:last-of-type{border-bottom:0}
.receipt .k{color:var(--muted);flex:0 0 auto}
.receipt .v{color:#fff;text-align:right;word-break:break-word;font-family:var(--font-mono);font-size:13px}
.receipt .v .badge{font-family:var(--font-display)}
.receipt-foot{font-size:13px;color:var(--muted);margin:12px 0 0}
.eyebrow{color:var(--accent);font-weight:600;font-size:14px}
.hero h1{font-family:var(--font-display);font-size:38px;line-height:1.08;margin:14px 0 16px;letter-spacing:-.03em;color:#fff}
.hero p.lede{font-size:19px;color:var(--muted);max-width:640px;margin:0 0 24px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-block;padding:11px 20px;border-radius:8px;font-weight:700;font-size:15px;border:1px solid var(--line);color:#fff;background:var(--panel)}
.btn:hover{text-decoration:none;border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#111827}
.status{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.pill{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--muted);background:var(--panel)}
.pill b{color:var(--green);font-weight:700}
.pill .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px}
section{padding:28px 0}
h2{font-family:var(--font-display);font-size:24px;letter-spacing:-.02em;color:#fff;margin:0 0 8px}
.sub{color:var(--muted);margin:0 0 20px;max-width:640px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}
.card h3{margin:0 0 6px;font-size:16px;color:#fff}
.card p{margin:0;color:var(--muted);font-size:14px}
.card .price{font-family:var(--font-display);font-size:30px;font-weight:700;color:#fff}
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
.wall-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.wall-conf{font-size:13px;color:var(--muted);font-weight:700}
.wall-sub{font-family:var(--font-mono);font-size:13px;color:var(--accent);margin-bottom:8px}
.wall-meta{font-size:13px;color:var(--muted);margin-top:12px}
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
.dash-head{padding:36px 0 8px}
.dash-head h1{font-size:34px}
.refresh-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;font-size:13px;color:var(--muted)}
.refresh-row .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:6px}
.pause-btn{min-height:44px;padding:10px 16px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:14px;font-weight:600;cursor:pointer;transition:border-color .2s}
.pause-btn:hover{border-color:var(--accent)}
.kpi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:18px 0}
@media(min-width:900px){.kpi-grid{grid-template-columns:repeat(4,1fr)}}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}
.kpi .icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,.12);color:var(--accent);margin-bottom:12px}
.kpi .icon svg{width:20px;height:20px}
.kpi .label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700}
.kpi .value{font-family:var(--font-display);font-size:32px;font-weight:700;letter-spacing:-.02em;color:#fff;margin:6px 0 2px;line-height:1.1}
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
.vcard ul{margin:10px 0 0;padding-left:20px;color:var(--muted);font-size:14px}
.vcard li{margin:8px 0}
.vcard li b{color:#fff;font-weight:600}
.vcard blockquote{margin:4px 0 0;padding:6px 10px;border-left:3px solid var(--line);color:var(--muted);font-size:13px}
.flag{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:rgba(251,191,36,.12);color:var(--amber);font-size:12px;font-weight:700}
.empty h3{color:#fff;font-size:16px;margin:0 0 6px}
.empty p{margin:0 0 14px}
.empty .steps{text-align:left;max-width:420px;margin:0 auto}
.empty .steps li{margin:6px 0}
.wt-status{font-size:14px;color:var(--muted);margin:0 0 14px}
.wt-status b{color:#fff}
.wt-row{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.wt-row .btn{flex:1 1 auto;text-align:center}
button.btn{font-family:inherit;cursor:pointer}
button.btn:disabled{opacity:.45;cursor:not-allowed}
.wt-input{width:100%;padding:12px 14px;border-radius:8px;border:1px solid var(--line);background:#020617;color:var(--text);font-size:16px;font-family:var(--font-mono)}
.wt-input:focus{border-color:var(--accent);outline:none}
.wt-presets{display:flex;gap:8px;flex-wrap:wrap}
.wt-label{display:block;font-size:14px;color:var(--muted);margin:14px 0 6px}
.wt-note{font-size:13px;color:var(--muted);margin:12px 0 0}
.wt-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.45);color:#fca5a5;border-radius:10px;padding:12px 14px;font-size:14px;margin-top:14px}
.wt-error a{color:#fecaca}
.wt-ok{color:var(--green);font-weight:700}
.wt-result{margin-top:16px}
.wt-result ul{margin:8px 0 0;padding-left:20px;color:var(--muted);font-size:14px}
.wt-result li{margin:6px 0}
.wt-result li b{color:#fff;font-weight:600}
.wt-result blockquote{margin:4px 0 0;padding:6px 10px;border-left:3px solid var(--line);color:var(--muted);font-size:13px}
@media(max-width:640px){.wt-row .btn{flex:1 1 100%}}`;

function shell({ title, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<title>${title}</title><style>${CSS}</style></head>
<body>${body}</body></html>`;
}

function topNav(active) {
  const homeLinks = active === "home" ? `<a href="#try">Try it</a><a href="#pricing">Pricing</a>` : "";
  return `<header class="top"><div class="wrap">
<a class="logo" href="/">Verdict<span> API</span></a>
<nav>${homeLinks}<a href="/dashboard"${active === "dashboard" ? ' style="color:#fff"' : ""}>Dashboard</a><a href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">GitHub</a><a href="https://www.openserv.ai/hackathon-2" target="_blank" rel="noreferrer">Hackathon</a></nav>
</div></header>`;
}

export function landingPage({ prices, paymentsMode, network, asset, payTo }) {
  const shortAddr = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "not set");
  const body = `${topNav("home")}
<main class="wrap">
<div class="hero">
<div class="hero-grid">
<div>
<div class="eyebrow">OpenServ SERV Hackathon 02, Kite track</div>
<h1>A paid second opinion<br>for AI agents.</h1>
<p class="lede">Verdict is a pay-per-call API that lets AI agents check whether a link, claim, or token is a scam before they act on it. Reasoning by SERV, payments by x402 on Kite testnet.</p>
<div class="btns"><a class="btn primary" href="#try">Try it</a><a class="btn" href="/dashboard">Dashboard</a></div>
<div class="status">
<span class="pill"><span class="dot"></span><b>Live</b> &middot; payments ${paymentsMode}</span>
<span class="pill">Network ${network}</span>
<span class="pill">Token ${shortAddr(asset)}</span>
<span class="pill">Seller ${shortAddr(payTo)}</span>
</div>
</div>
<aside class="receipt" aria-label="Real paid verdict receipt">
<div class="receipt-head"><span>Verdict receipt</span><span class="tag">Real paid verdict</span></div>
<div class="stamp" aria-hidden="true">Scam</div>
<div class="row" style="margin-top:52px"><span class="k">Subject</span><span class="v">nike-super-deals.example</span></div>
<div class="row"><span class="k">Verdict</span><span class="v"><span class="badge scam">scam</span></span></div>
<div class="row"><span class="k">Confidence</span><span class="v">99%</span></div>
<div class="row"><span class="k">Evidence</span><span class="v">&ldquo;Payment accepted only in USDT. Send USDT directly to our personal wallet.&rdquo;</span></div>
<div class="row"><span class="k">Injection</span><span class="v">not flagged</span></div>
<div class="row"><span class="k">Paid</span><span class="v">3&cent; pieUSD</span></div>
<div class="row"><span class="k">Tx</span><span class="v"><a href="https://testnet.kitescan.ai/tx/0x460a644c56a5a8ac2d455c9fb3f335c0762e07a9d41170b0347ae71385eb3c19" target="_blank" rel="noreferrer">0x460a644c&hellip;eb3c19</a></span></div>
<p class="receipt-foot">A real paid check from the demo agent. See it on the <a href="/dashboard">dashboard</a>.</p>
</aside>
</div>
</div>

<section id="try">
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
<pre id="curl-example">curl -X POST https://verdict-api-t50q.onrender.com/v1/verdict/link -H "Content-Type: application/json" -d '{"url": "https://example.com"}'
# First reply: 402 with the terms above. Pay, resend with PAYMENT-SIGNATURE, get the verdict.</pre>
</section>

<section>
<h2>Try it for real, from this page</h2>
<p class="sub">No terminal, no PC needed. Connect a wallet on Kite testnet, pay 3&cent; in testnet pieUSD, and get a real verdict for a link.</p>
<div class="card" id="wt-card">
<p class="wt-status" id="wt-status">Checking for a wallet...</p>
<div class="wt-row" id="wt-actions"></div>
<div id="wt-wallet" hidden>
<div class="kv" style="margin-bottom:12px">
<div class="row"><div class="k">Wallet</div><div class="v" id="wt-addr">-</div></div>
<div class="row"><div class="k">Network</div><div class="v" id="wt-net">-</div></div>
<div class="row"><div class="k">pieUSD</div><div class="v" id="wt-bal">-</div></div>
</div>
<div class="wt-presets" role="group" aria-label="Sample pages">
<button type="button" class="chip" data-preset="scam">Scam sample</button>
<button type="button" class="chip" data-preset="honest">Honest sample</button>
</div>
<label class="wt-label" for="wt-url">Page to check</label>
<input class="wt-input" id="wt-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" value="https://raw.githubusercontent.com/Raga-vibe/verdict-api/master/tests/fixtures/scam-1.html">
<div class="wt-row"><button type="button" class="btn primary" id="wt-check" disabled>Check this link &middot; 3&cent;</button></div>
<p class="wt-note">You sign one payment of 3&cent; in your wallet. Nothing is charged until you approve the signature in your wallet. Testnet only, so the pieUSD is free testnet money.</p>
</div>
<div id="wt-error" class="wt-error" hidden></div>
<div id="wt-result" class="wt-result"></div>
</div>
<p class="sub" style="margin-top:14px">Need testnet pieUSD? Get free KITE at the <a href="https://faucet.gokite.ai" target="_blank" rel="noreferrer">Kite testnet faucet</a>, and testnet pieUSD from the Kite Passport sandbox (<code>kpass sandbox on</code>, then <code>kpass faucet drop</code>). No wallet yet? Install <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">MetaMask</a>, or open this page inside your wallet app&rsquo;s browser.</p>
</section>

<section>
<h2>How a call works</h2>
<p class="sub">Three steps, every time. No account, no API key on the agent side. The agent just pays.</p>
<div class="steps">
<div class="step"><div class="n">1</div><div><h3>Agent asks, gets a 402</h3><p>The agent calls an endpoint with no payment and gets a 402 with the exact x402 terms: price, token, seller and timeout.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>Agent pays over x402 on Kite</h3><p>The agent signs a few cents in pieUSD and resends the call with a payment signature. The Pieverse facilitator verifies and settles it.</p></div></div>
<div class="step"><div class="n">3</div><div><h3>SERV Reasoning decides, quotes verified</h3><p>SERV Reasoning reads the gathered evidence with Prompt Guard and Shadow Agent on. Our code checks every quoted reason really exists in the evidence. No verified quote, no confident verdict. The receipt is logged with its transaction.</p></div></div>
</div>
</section>

<section id="serv">
<h2>Where SERV Reasoning runs</h2>
<p class="sub">SERV Reasoning reads the fetched evidence with Prompt Guard and Shadow Agent on, returns a verdict with quoted reasons, and our code verifies every quote against the evidence before answering.</p>
<div class="grid">
<div class="card">
<div class="wall-top"><span class="badge scam">scam</span><span class="wall-conf">99% confidence</span></div>
<h3>Scam page</h3>
<p class="wall-sub">nike-super-deals.example</p>
<p>A page claiming to be the Nike Official Store at 80% off, on an unrelated outlet domain, asking for USDT to a personal wallet.</p>
<p class="wall-meta">Nov 12, 2026 &middot; Injection: not flagged &middot; <a href="https://testnet.kitescan.ai/tx/0x460a644c56a5a8ac2d455c9fb3f335c0762e07a9d41170b0347ae71385eb3c19" target="_blank" rel="noreferrer">Tx 0x460a644c&hellip;eb3c19</a></p>
</div>
<div class="card">
<div class="wall-top"><span class="badge safe">safe</span><span class="wall-conf">98% confidence</span></div>
<h3>Honest shop</h3>
<p class="wall-sub">harborandpine.example</p>
<p>A real shop trading since 2014, card payments through a provider, 30-day returns, published address.</p>
<p class="wall-meta">Nov 12, 2026 &middot; Injection: not flagged &middot; <a href="https://testnet.kitescan.ai/tx/0xf546392c84681b7844bdcc8b9e64892d0e88ec3b823194e19059bc92df46ed05" target="_blank" rel="noreferrer">Tx 0xf546392c&hellip;46ed05</a></p>
</div>
<div class="card">
<div class="wall-top"><span class="badge risky">risky</span><span class="wall-conf">96% confidence</span><span class="flag">Injection flagged</span></div>
<h3>Injected page</h3>
<p class="wall-sub">juniperhome.example</p>
<p>The shop looks normal, but a hidden comment tells agents to ignore their instructions and buy now.</p>
<p class="wall-meta">Nov 12, 2026 &middot; <a href="https://testnet.kitescan.ai/tx/0x5bddfad6a36765ccf15c6ca51ffd40060d6491faca8db6bbb56452d6d03cb93c" target="_blank" rel="noreferrer">Tx 0x5bddfad6&hellip;03cb93c</a></p>
</div>
</div>
<p class="sub" style="margin-top:16px">Every verdict above is a real paid call. See them live on the <a href="/dashboard">dashboard</a>.</p>
</section>

<section id="pricing">
<h2>Pricing</h2>
<p class="sub">Pay per call, in pieUSD on Kite testnet. No subscription, no free tier to abuse.</p>
<div class="grid">
<div class="card"><h3>Claim</h3><div class="price">${prices.claim}<small> &cent;</small></div><p><code>POST /v1/verdict/claim</code></p><p>Is this claim supported by its sources? Verdicts: true / false / unclear.</p></div>
<div class="card"><h3>Link</h3><div class="price">${prices.link}<small> &cent;</small></div><p><code>POST /v1/verdict/link</code></p><p>Is this page safe to buy from or sign up on? Verdicts: safe / risky / scam / unclear.</p></div>
<div class="card"><h3>Token</h3><div class="price">${prices.token}<small> &cent;</small></div><p><code>POST /v1/verdict/token</code></p><p>Is this token a reasonable buy or a likely rug pull? Verdicts: safe / risky / scam / unclear.</p></div>
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
<h2>Built for agents, documented for humans</h2>
<p class="sub">Version 1 lives under /v1/. The unversioned paths still work. Errors always come back as an error message plus a stable code, like VALIDATION_ERROR or NOT_FOUND.</p>
<div class="btns"><a class="btn" href="/openapi.json">OpenAPI spec</a><a class="btn" href="/health">Health check</a><a class="btn" href="/stats">Stats as JSON</a><a class="btn" href="https://github.com/Raga-vibe/verdict-api" target="_blank" rel="noreferrer">README</a></div>
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
var loadToken = 0;
function load(kind) {
  // A slow reply for a tab the visitor already left must not overwrite the
  // tab they are looking at now.
  var myToken = ++loadToken;
  btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-kind") === kind); });
  curlPre.textContent = 'curl -X POST https://verdict-api-t50q.onrender.com/v1/verdict/' + kind + ' -H "Content-Type: application/json" -d \\'' + JSON.stringify(curlBodies[kind]) + "'\\n# First reply: 402 with the terms above. Pay, resend with PAYMENT-SIGNATURE, get the verdict.";
  box.replaceChildren(row("Terms", "Loading..."));
  full.textContent = "Loading...";
  fetch("/v1/verdict/" + kind + "/terms").then(function (r) { return r.json(); }).then(function (j) {
    if (myToken !== loadToken) return;
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
    if (myToken !== loadToken) return;
    box.replaceChildren(row("Terms", "Could not load. Is the API awake?"));
    full.textContent = "Could not load payment terms.";
  });
}
btns.forEach(function (b) { b.addEventListener("click", function () { load(b.getAttribute("data-kind")); }); });
load("link");
</script>
<script>var WT_STATES = ${JSON.stringify(WIDGET_STATES)};</script>
<script>
(function () {
  var statusEl = document.getElementById("wt-status");
  var actionsEl = document.getElementById("wt-actions");
  var walletEl = document.getElementById("wt-wallet");
  var addrEl = document.getElementById("wt-addr");
  var netEl = document.getElementById("wt-net");
  var balEl = document.getElementById("wt-bal");
  var urlEl = document.getElementById("wt-url");
  var checkBtn = document.getElementById("wt-check");
  var errorEl = document.getElementById("wt-error");
  var resultEl = document.getElementById("wt-result");
  var eth = (typeof window !== "undefined" && window.ethereum) ? window.ethereum : null;
  var account = null;
  var terms = null;
  var busy = false;
  // The widget's one state variable. Every status line the visitor sees
  // comes from WIDGET_STATES (src/states.js, embedded above as WT_STATES);
  // the current state is also on the card as data-wt-state for debugging.
  var wtState = "detecting";
  var cardEl = document.getElementById("wt-card");
  var CHAIN_ID = 2368;
  var CHAIN_HEX = "0x940";
  var NETWORK = "eip155:2368";
  var RPC_URL = "https://rpc-testnet.gokite.ai/";
  var EXPLORER = "https://testnet.kitescan.ai/";
  var FAUCET = "https://faucet.gokite.ai";
  var PRESETS = {
    scam: "https://raw.githubusercontent.com/Raga-vibe/verdict-api/master/tests/fixtures/scam-1.html",
    honest: "https://raw.githubusercontent.com/Raga-vibe/verdict-api/master/tests/fixtures/honest-1.html"
  };
  var MAX_UNITS_PER_CALL = 50000000000000000n;
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function shortAddr(a) { return a ? a.slice(0, 6) + "..." + a.slice(-4) : "-"; }
  function b64encode(s) {
    var bytes = new TextEncoder().encode(s);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(s) {
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function fmtUnits(u) {
    var n = BigInt(u);
    var whole = n / 1000000000000000000n;
    var frac = n % 1000000000000000000n;
    var f = frac.toString();
    while (f.length < 18) f = "0" + f;
    return whole.toString() + "." + f.slice(0, 4);
  }
  function centsOf(u) { return (Number(BigInt(u)) / 1e16).toFixed(0); }
  // Fill a {placeholder} template. Split/join on purpose, not a regex:
  // backslashes do not survive this file's template literal (the same
  // trap that once broke the try-it widget), so no regex lives here.
  function fmtState(template, ctx) {
    var out = String(template);
    if (ctx) for (var key in ctx) out = out.split("{" + key + "}").join(ctx[key] == null ? "" : ctx[key]);
    return out;
  }
  function setWtState(name, ctx) {
    wtState = name;
    if (cardEl) cardEl.setAttribute("data-wt-state", name);
    var entry = (typeof WT_STATES !== "undefined" && WT_STATES[name]) || null;
    statusEl.textContent = entry ? fmtState(entry.message, ctx) : "";
  }
  function showError(msg, linkLabel, linkHref) {
    errorEl.replaceChildren();
    errorEl.appendChild(document.createTextNode(msg));
    if (linkLabel && linkHref) {
      errorEl.appendChild(document.createTextNode(" "));
      var a = document.createElement("a");
      a.href = linkHref; a.target = "_blank"; a.rel = "noreferrer"; a.textContent = linkLabel;
      errorEl.appendChild(a);
    }
    errorEl.hidden = false;
  }
  function clearError() { errorEl.replaceChildren(); errorEl.hidden = true; }
  function isUserRejection(e) {
    return !!e && (e.code === 4001 || /user rejected|user denied/i.test(String((e && e.message) || "")));
  }
  function randomNonce() {
    if (!window.crypto || !window.crypto.getRandomValues) throw new Error("This browser cannot make a secure random nonce.");
    var b = new Uint8Array(32);
    window.crypto.getRandomValues(b);
    var hex = "";
    for (var i = 0; i < b.length; i++) hex += ("0" + b[i].toString(16)).slice(-2);
    return "0x" + hex;
  }
  function balanceCallData(addr) {
    var a = addr.slice(2).toLowerCase();
    while (a.length < 64) a = "0" + a;
    return "0x70a08231" + a;
  }
  function requirement() {
    if (!terms || !terms.accepts || !terms.accepts[0]) return null;
    return terms.accepts[0];
  }
  function addActionButton(label, primary, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn" + (primary ? " primary" : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    actionsEl.appendChild(b);
    return b;
  }
  function addActionLink(label, href) {
    var a = document.createElement("a");
    a.className = "btn";
    a.href = href; a.target = "_blank"; a.rel = "noreferrer";
    a.textContent = label;
    actionsEl.appendChild(a);
    return a;
  }
  function ensureChain() {
    return eth.request({ method: "eth_chainId" }).then(function (id) {
      if (String(id).toLowerCase() === CHAIN_HEX) return true;
      return eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] }).then(function () { return true; }).catch(function (e) {
        if (e && e.code === 4902) {
          return eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN_HEX, chainName: "KiteAI Testnet", nativeCurrency: { name: "KITE", symbol: "KITE", decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: [EXPLORER] }] }).then(function () { return true; }).catch(function (e2) {
            if (isUserRejection(e2)) showError("Adding Kite testnet was cancelled in your wallet. Nothing was changed.");
            else showError("Could not add Kite testnet to your wallet: " + String((e2 && e2.message) || e2));
            return false;
          });
        }
        if (isUserRejection(e)) showError("Switching to Kite testnet was cancelled in your wallet. Nothing was changed.");
        else showError("Could not switch to Kite testnet: " + String((e && e.message) || e));
        return false;
      });
    });
  }
  function quietBalance() {
    var req = requirement();
    if (!req || !account) return;
    eth.request({ method: "eth_call", params: [{ to: req.asset, data: balanceCallData(account) }, "latest"] }).then(function (hex) {
      var bal = BigInt(hex || "0x0");
      balEl.textContent = fmtUnits(bal.toString()) + " pieUSD";
      var tooLow = bal < BigInt(req.amount);
      checkBtn.disabled = tooLow;
      // The check button going dead with no message is how a visitor used
      // to learn their balance had run out. Say so, but only while the
      // widget is waiting for a check; a finished check keeps its status.
      if (tooLow && (wtState === "ready" || wtState === "balance_low")) setWtState("balance_low", { cents: centsOf(req.amount) });
      if (!tooLow && wtState === "balance_low") setWtState("ready", { cents: centsOf(req.amount), address: shortAddr(account) });
    }).catch(function () {});
  }
  function refreshBalance() {
    var req = requirement();
    if (!req || !account) return Promise.resolve(false);
    return eth.request({ method: "eth_call", params: [{ to: req.asset, data: balanceCallData(account) }, "latest"] }).then(function (hex) {
      var bal = BigInt(hex || "0x0");
      var amount = BigInt(req.amount);
      balEl.textContent = fmtUnits(bal.toString()) + " pieUSD";
      actionsEl.replaceChildren();
      if (bal < amount) {
        checkBtn.disabled = true;
        setWtState("balance_low", { cents: centsOf(req.amount) });
        addActionLink("Get testnet pieUSD", FAUCET);
        addActionButton("I have pieUSD, check again", false, function () { clearError(); refreshBalance(); });
        return false;
      }
      setWtState("ready", { cents: centsOf(req.amount), address: shortAddr(account) });
      checkBtn.disabled = false;
      return true;
    }).catch(function (e) {
      balEl.textContent = "Could not read balance";
      checkBtn.disabled = true;
      actionsEl.replaceChildren();
      addActionButton("Retry balance check", false, function () { clearError(); refreshBalance(); });
      showError("Could not read your pieUSD balance: " + String((e && e.message) || e));
      return false;
    });
  }
  function syncWallet() {
    clearError();
    return ensureChain().then(function (ok) {
      if (!ok) {
        actionsEl.replaceChildren();
        addActionButton("Switch to Kite testnet", true, function () { clearError(); syncWallet(); });
        return;
      }
      walletEl.hidden = false;
      addrEl.textContent = shortAddr(account);
      netEl.textContent = "Kite testnet (2368)";
      return refreshBalance();
    });
  }
  function connect() {
    clearError();
    setWtState("connecting");
    return eth.request({ method: "eth_requestAccounts" }).then(function (accounts) {
      if (!accounts || !accounts.length) {
        showError("No account was shared by your wallet. Connect again and pick an account.");
        return;
      }
      account = accounts[0];
      actionsEl.replaceChildren();
      return syncWallet();
    }).catch(function (e) {
      if (isUserRejection(e)) showError("Connection cancelled in your wallet. Nothing was changed.");
      else if (e && e.code === -32002) showError("A wallet request is already open. Check your wallet app and approve or dismiss it, then try again.");
      else showError("Could not connect to your wallet: " + String((e && e.message) || e));
      setWtState("not_connected");
    });
  }
  function txFromHeader(res) {
    var h = res.headers.get("payment-response") || res.headers.get("x-payment-response");
    if (!h) return null;
    try {
      var s = JSON.parse(b64decode(h));
      return s.transaction || s.transactionHash || s.txHash || null;
    } catch (e) { return null; }
  }
  function renderVerdict(d, url, tx) {
    resultEl.replaceChildren();
    var card = el("div", null, "vcard");
    var top = el("div", null, "vcard-top");
    top.appendChild(el("span", url.length > 90 ? url.slice(0, 89) + "..." : url, "subject"));
    top.appendChild(el("span", d.verdict, "badge " + String(d.verdict).toLowerCase()));
    if (d.injection_detected) top.appendChild(el("span", "Injection flagged", "flag"));
    card.appendChild(top);
    if (d.summary) card.appendChild(el("p", d.summary, "vsummary"));
    var pct = Math.round(Number(d.confidence || 0) * 100);
    var conf = el("div", null, "conf");
    conf.appendChild(el("span", "Confidence " + pct + "%"));
    var bar = el("span", null, "bar");
    var fill = document.createElement("i");
    fill.style.width = Math.max(4, pct) + "%";
    var v = String(d.verdict).toLowerCase();
    fill.style.background = v === "scam" || v === "false" ? "#ef4444" : v === "risky" ? "#fbbf24" : v === "unclear" ? "#94a3b8" : "#22c55e";
    bar.appendChild(fill);
    conf.appendChild(bar);
    card.appendChild(conf);
    if (d.reasons && d.reasons.length) {
      var list = document.createElement("ul");
      d.reasons.forEach(function (r) {
        var li = document.createElement("li");
        li.appendChild(el("b", r.point || "Reason"));
        if (r.quote) {
          var q = document.createElement("blockquote");
          q.textContent = r.quote;
          li.appendChild(q);
        }
        list.appendChild(li);
      });
      card.appendChild(list);
    }
    var meta = el("div", null, "vmeta");
    meta.appendChild(el("span", "Link check, 3c paid"));
    if (d.model) meta.appendChild(el("span", "Model " + d.model));
    if (d.receipt) meta.appendChild(el("span", "Receipt " + String(d.receipt).slice(0, 12) + "..."));
    if (tx) {
      var txa = document.createElement("a");
      txa.href = EXPLORER + "tx/" + tx;
      txa.textContent = "View payment tx " + tx.slice(0, 10) + "...";
      txa.target = "_blank"; txa.rel = "noreferrer";
      meta.appendChild(txa);
    }
    var dash = document.createElement("a");
    dash.href = "/dashboard"; dash.textContent = "See it on the dashboard";
    meta.appendChild(dash);
    card.appendChild(meta);
    resultEl.appendChild(card);
  }
  function doCheck() {
    if (busy) return;
    if (!account) { showError("Connect your wallet first, using the button above."); return; }
    var url = urlEl.value.trim();
    var lowerUrl = url.toLowerCase();
    if (lowerUrl.indexOf("http://") !== 0 && lowerUrl.indexOf("https://") !== 0) {
      showError("Enter a page URL starting with http:// or https://, or tap one of the sample pages above.");
      return;
    }
    var req = requirement();
    if (!req) { showError("Payment terms are not loaded yet. Reload the page and try again."); return; }
    busy = true;
    checkBtn.disabled = true;
    clearError();
    resultEl.replaceChildren();
    setWtState("asking_terms");
    var body = JSON.stringify({ url: url });
    fetch("/v1/verdict/link", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: body }).then(function (probe) {
      if (probe.ok) return probe.json().then(function (d) { return { done: true, data: d, res: probe }; });
      if (probe.status !== 402) return probe.text().then(function (t) { var msg = t; try { var j = JSON.parse(t); msg = j.error || t; } catch (e) { msg = t; } throw new Error("Verdict call failed: HTTP " + probe.status + " " + String(msg).slice(0, 300)); });
      return probe.text().then(function (text) {
        var challenge = null;
        try { challenge = JSON.parse(text); } catch (e) { challenge = null; }
        if (!challenge || !challenge.accepts) {
          var h = probe.headers.get("payment-required") || probe.headers.get("x-payment-required");
          if (h) { try { challenge = JSON.parse(b64decode(h)); } catch (e2) { challenge = null; } }
        }
        if (!challenge || challenge.x402Version !== 2 || !challenge.accepts) throw new Error("The server answered 402 but without usable payment terms. Try again in a moment.");
        return { done: false, challenge: challenge };
      });
    }).then(function (step) {
      if (!step) return null;
      if (step.done) {
        setWtState("done_free");
        renderVerdict(step.data, url, txFromHeader(step.res));
        return null;
      }
      var challenge = step.challenge;
      var req2 = null;
      for (var i = 0; i < challenge.accepts.length; i++) {
        var a = challenge.accepts[i];
        if (a.scheme === "exact" && a.network === NETWORK) { req2 = a; break; }
      }
      if (!req2) throw new Error("The server did not offer an exact pieUSD payment on Kite testnet. Nothing was signed.");
      if (String(req2.asset).toLowerCase() !== String(req.asset).toLowerCase()) throw new Error("The server asked to be paid in an unexpected token. Nothing was signed.");
      var amount = BigInt(req2.amount);
      if (amount <= 0n || amount > MAX_UNITS_PER_CALL) throw new Error("Refusing to sign: this check costs more than 5c. Nothing was signed.");
      var now = Math.floor(Date.now() / 1000);
      var validBefore = now + Number(req2.maxTimeoutSeconds || 60);
      var nonce = randomNonce();
      var extra = req2.extra || {};
      setWtState("awaiting_signature", { amount: fmtUnits(req2.amount), cents: centsOf(req2.amount) });
      var typed = {
        domain: { name: extra.name || "pieUSD", version: extra.version || "1", chainId: CHAIN_ID, verifyingContract: req2.asset },
        message: { from: account, to: req2.payTo, value: String(req2.amount), validAfter: "0", validBefore: String(validBefore), nonce: nonce },
        primaryType: "TransferWithAuthorization",
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
          ],
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" }
          ]
        }
      };
      return eth.request({ method: "eth_signTypedData_v4", params: [account, JSON.stringify(typed)] }).then(function (sig) {
        var payload = {
          x402Version: 2,
          payload: { authorization: { from: account, to: req2.payTo, value: String(req2.amount), validAfter: "0", validBefore: String(validBefore), nonce: nonce }, signature: sig },
          resource: challenge.resource,
          accepted: req2
        };
        setWtState("sending");
        return fetch("/v1/verdict/link", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "PAYMENT-SIGNATURE": b64encode(JSON.stringify(payload)) }, body: body });
      }).then(function (paid) {
        if (paid.ok) return paid.json().then(function (d) { return { data: d, res: paid }; });
        return paid.text().then(function (t) {
          var msg = t;
          try { var j = JSON.parse(t); msg = j.error || j.code || t; } catch (e) { msg = t; }
          if (paid.status === 402) throw new Error("The payment was rejected: " + String(msg).slice(0, 300) + " Your wallet was not charged. Check your pieUSD balance and try again.");
          throw new Error("Paid request failed: HTTP " + paid.status + " " + String(msg).slice(0, 300));
        });
      }).then(function (out) {
        if (!out) return;
        setWtState("done_paid");
        renderVerdict(out.data, url, txFromHeader(out.res));
      });
    }).catch(function (e) {
      if (isUserRejection(e)) showError("Signature cancelled in your wallet. No payment was made, nothing was charged.");
      else showError(String((e && e.message) || e));
      setWtState("incomplete");
    }).then(function () {
      busy = false;
      quietBalance();
    });
  }
  document.querySelectorAll("#wt-card [data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      urlEl.value = PRESETS[b.getAttribute("data-preset")] || "";
      clearError();
      resultEl.replaceChildren();
      urlEl.focus();
    });
  });
  checkBtn.addEventListener("click", doCheck);
  if (eth && eth.on) {
    eth.on("accountsChanged", function (accs) {
      if (!accs || !accs.length) { account = null; walletEl.hidden = true; actionsEl.replaceChildren(); setWtState("wallet_disconnected"); addActionButton("Connect wallet", true, connect); return; }
      account = accs[0];
      syncWallet();
    });
    eth.on("chainChanged", function () { if (account) syncWallet(); });
  }
  if (!eth) {
    setWtState("no_wallet");
    return;
  }
  setWtState("terms_loading");
  fetch("/v1/verdict/link/terms").then(function (r) { return r.json(); }).then(function (j) {
    terms = j;
    if (!requirement()) throw new Error("no terms");
    setWtState("wallet_found", { cents: centsOf(requirement().amount) });
    addActionButton("Connect wallet", true, connect);
  }).catch(function () {
    setWtState("terms_failed");
  });
})();
</script>`;
  return shell({ title: "Verdict API - a paid second opinion for AI agents", body });
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
<script>var DASH_STATES = ${JSON.stringify(DASHBOARD_STATES)};</script>
<script>
var recentData = [];
var currentFilter = "all";
var paused = false;
var timer = null;
// The dashboard's refresh state. A refresh already in flight is never
// started twice, so a slow reply cannot overwrite newer data; a failed
// refresh keeps the last good board and only changes the note line.
var dashState = "loading";
var inFlight = false;
var lastGoodAt = null;
function fmtDash(template, ctx) {
  // Split/join, not a regex: backslashes do not survive this file's
  // template literal, so no regex lives in these page scripts.
  var out = String(template);
  if (ctx) for (var key in ctx) out = out.split("{" + key + "}").join(ctx[key] == null ? "" : ctx[key]);
  return out;
}
function setDashState(name, ctx) {
  dashState = name;
  document.body.setAttribute("data-dash-state", name);
  var entry = (typeof DASH_STATES !== "undefined" && DASH_STATES[name]) || null;
  if (entry) document.getElementById("updated").textContent = fmtDash(entry.note, ctx);
}
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
  if (inFlight) return;
  inFlight = true;
  fetch("/stats").then(function (r) { return r.json(); }).then(function (s) {
    inFlight = false;
    lastGoodAt = new Date();
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
    setDashState("live", { time: lastGoodAt.toLocaleTimeString() });
    recentData = s.recent || [];
    renderRecent();
  }).catch(function () {
    inFlight = false;
    // Keep the last good board on screen; only the note line changes, so
    // a transient blip never wipes the data the visitor is reading.
    if (!lastGoodAt) {
      dashState = "error";
      document.body.setAttribute("data-dash-state", "error");
      document.getElementById("updated").textContent = "Couldn't load stats. Is the API awake?";
      return;
    }
    setDashState("error", { time: lastGoodAt.toLocaleTimeString() });
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
  if (paused) {
    clearInterval(timer); timer = null;
    setDashState("paused", { time: (lastGoodAt || new Date()).toLocaleTimeString() });
  }
  else { refresh(); timer = setInterval(refresh, 3000); }
});
setDashState("loading", {});
refresh();
timer = setInterval(refresh, 3000);
</script>`;
  return shell({ title: "Verdict API dashboard - live earnings", body });
}
