// Gathers evidence the verdict must be based on. Plain fetch, no paid APIs.

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " [HTML COMMENT: $1] ") // keep hidden comments: injections hide here
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url, limit = 12000) {
  const res = await fetch(url, { headers: { "User-Agent": "VerdictAPI/0.1" }, redirect: "follow", signal: AbortSignal.timeout(10000) });
  const raw = await res.text();
  const type = res.headers.get("content-type") || "";
  const text = type.includes("html") ? htmlToText(raw) : raw;
  return { url: res.url, status: res.status, text: text.slice(0, limit), rawHtml: type.includes("html") ? raw : "" };
}

export async function linkEvidence(url) {
  const page = await fetchText(url);
  const host = new URL(page.url).hostname;
  const evidence = [
    `URL requested: ${url}`,
    `Final URL after redirects: ${page.url}`,
    `Domain: ${host}`,
    `HTTP status: ${page.status}`,
    `PAGE TEXT: ${page.text}`,
  ].join("\n");
  return { evidence, rawHtml: page.rawHtml };
}

export async function claimEvidence(claim, sources = []) {
  const parts = [`CLAIM: ${claim}`];
  for (const s of sources.slice(0, 3)) {
    try {
      const page = await fetchText(s, 6000);
      parts.push(`SOURCE ${page.url}: ${page.text}`);
    } catch (e) {
      parts.push(`SOURCE ${s}: could not be fetched`);
    }
  }
  return parts.join("\n\n");
}

export async function tokenEvidence(address, chain) {
  // DexScreener public API: pairs, liquidity, age, volume.
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  let pairs = data.pairs || [];
  if (chain) pairs = pairs.filter((p) => p.chainId === chain.toLowerCase());
  if (!pairs.length) return `Token ${address}: no trading pairs found.`;
  const lines = pairs.slice(0, 5).map((p) => {
    const ageDays = p.pairCreatedAt ? ((Date.now() - p.pairCreatedAt) / 86400000).toFixed(1) : "unknown";
    return `Pair ${p.baseToken?.symbol}/${p.quoteToken?.symbol} on ${p.dexId} (${p.chainId}): liquidity USD ${p.liquidity?.usd ?? "unknown"}, 24h volume USD ${p.volume?.h24 ?? "unknown"}, age days ${ageDays}, 24h buys ${p.txns?.h24?.buys ?? "?"}, 24h sells ${p.txns?.h24?.sells ?? "?"}, FDV ${p.fdv ?? "unknown"}`;
  });
  return `Token ${address}\n` + lines.join("\n");
}
