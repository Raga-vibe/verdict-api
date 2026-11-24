// Textile FX sweep (Track 1: Stablecoin Corridors, cNGN).
//
// Textile FX is an on-chain FX rail: request-for-quote per corridor,
// you name a size, makers price it, and the swap clears in a single
// on-chain transaction. cNGN <-> USDT is live on Celo 42220.
//
// RFQ API v2, base https://api.textilecredit.com:
//   POST /v2/rfq/preview  - indicative price, free, no taker, no slot
//   POST /v2/rfq/request  - firm quote, signed orders + calldata,
//                           bound to one taker wallet, 60s TTL
//   POST /v2/rfq/{id}/submit - report the tx hash (courtesy)
//   GET  /v2/rfq/{id}     - status, settled amounts once filled
//   POST /v2/rfq/{id}/cancel - release maker inventory
// With an API key send Authorization: Bearer <key> and no takerProof.
// Without a key, the taker signs a TakerControl proof instead.
// A test key (tx_test_...) cannot touch mainnet; a live key cannot
// touch testnets.
//
// TESTNET LIMIT, READ THIS: Textile runs a sandbox on BSC testnet
// (97, cNGN <-> USDT) and Base Sepolia (84532) ONLY. A test key
// pointed at Celo Sepolia gets a 400: that chain has no FX settlement
// contract. So a Celo Sepolia Textile test is not possible; test the
// integration on BSC testnet 97, and do the scored conversion as a
// small mainnet swap on Celo 42220.
//
// MAINNET FLOOR: the corridor floor is $1 of notional. A sweep only
// runs when the sell amount is at least TEXTILE_MIN_SWEEP_CNGN
// (default 2000 cNGN, about $1.30 at ~1500 NGN/USD).
//
// SAFETY: this module never broadcasts. previewQuote and requestQuote
// only talk to the API. Broadcasting happens only in
// scripts/textile-sweep.js, only with TEXTILE_SWEEP=live and an
// explicit --execute flag, and only after re-checking expiresAt.
// Default mode is dry-run: quote only, no money moves.
import { config, CELO_TOKENS } from "./config.js";
import { appendAttribution } from "./attribution.js";

export const TEXTILE_CHAIN_CELO = 42220;
export const TEXTILE_CHAIN_BSC_TESTNET = 97;
export const USDT_MAINNET = CELO_TOKENS.usdt.mainnet;
export const CNGN_MAINNET = CELO_TOKENS.cngn.mainnet;
// BSC testnet tokens, from the Textile testnet guide.
export const CNGN_BSC_TESTNET = "0x8a078b182bA9649c03982c2a80CDcc81cdc99dA8";
export const USDT_BSC_TESTNET = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";

function headers() {
  const h = { "Content-Type": "application/json" };
  if (config.textile.apiKey) h.Authorization = `Bearer ${config.textile.apiKey}`;
  return h;
}

async function post(path, body) {
  const res = await fetch(`${config.textile.baseUrl}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(75000),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* keep raw text in the error */ }
  if (!res.ok) {
    throw new Error(`Textile ${path} failed: HTTP ${res.status} ${data ? JSON.stringify(data) : text}`);
  }
  return data;
}

// Indicative price. No wallet, no lock, no RFQ slot. A preview is not
// a promise: the firm price can differ, and a size that previews fine
// can still come back no_quote.
export async function previewQuote({ chainId, sellToken, buyToken, sellAmount }) {
  const data = await post("/v2/rfq/preview", { chainId, sellToken, buyToken, sellAmount: String(sellAmount) });
  return data?.data ?? data;
}

// Firm quote. Blocks while makers answer (up to ~70s worst case; our
// client timeout is 75s). The taker wallet must already hold the sell
// token: /request reads the balance before waking makers. Returns the
// full data object: { rfqId, claimToken, status, quote: { takerPays,
// buyAmount, expiresAt }, transactions: { swap, approval } }.
// Throws on status no_quote, with the reason in the message.
export async function requestQuote({ chainId, sellToken, buyToken, sellAmount, taker }) {
  if (!taker) throw new Error("requestQuote needs a taker wallet address");
  const data = await post("/v2/rfq/request", {
    chainId,
    sellToken,
    buyToken,
    sellAmount: String(sellAmount),
    taker,
  });
  const d = data?.data ?? data;
  if (d?.status && d.status !== "ok" && d.status !== "quoted") {
    throw new Error(`Textile RFQ no_quote: ${d?.reason || d.status}`);
  }
  if (!d?.quote) throw new Error(`Textile RFQ returned no quote: ${JSON.stringify(d)}`);
  return d;
}

export async function submitQuote(rfqId, claimToken, txHash) {
  const res = await fetch(`${config.textile.baseUrl}/v2/rfq/${rfqId}/submit`, {
    method: "POST",
    headers: { ...headers(), "X-Rfq-Claim": claimToken, "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Textile submit failed: HTTP ${res.status} ${await res.text()}`);
  return res.json().catch(() => ({}));
}

export async function cancelQuote(rfqId, claimToken) {
  const res = await fetch(`${config.textile.baseUrl}/v2/rfq/${rfqId}/cancel`, {
    method: "POST",
    headers: { ...headers(), "X-Rfq-Claim": claimToken },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Textile cancel failed: HTTP ${res.status} ${await res.text()}`);
  return res.json().catch(() => ({}));
}

// Tag a Textile swap transaction with our ERC-8021 code, per Loops
// guidance: append our tag to transactions.swap.data before sending,
// and leave includeAttribution off (we never set it) so our tag is
// the only one. Do not append a second suffix.
export function tagSwapData(swapData) {
  return appendAttribution(swapData);
}

// The Corridors sweep: convert accumulated cNGN earnings to USDT.
// direction "cngn-to-usdt" is the earnings sweep; "usdt-to-cngn" is
// the payout leg (USDT earnings -> cNGN to pay a named user outside
// the team). Dry-run (default) only previews the price and returns
// it; it never requests a firm quote and never broadcasts.
export async function sweepQuote({ direction = "cngn-to-usdt", sellAmount, taker } = {}) {
  const chainId = config.textile.chainId;
  const isTestnet = chainId === TEXTILE_CHAIN_BSC_TESTNET;
  const sellToken = direction === "usdt-to-cngn"
    ? (isTestnet ? USDT_BSC_TESTNET : USDT_MAINNET)
    : (isTestnet ? CNGN_BSC_TESTNET : CNGN_MAINNET);
  const buyToken = direction === "usdt-to-cngn"
    ? (isTestnet ? CNGN_BSC_TESTNET : CNGN_MAINNET)
    : (isTestnet ? USDT_BSC_TESTNET : USDT_MAINNET);
  if (direction === "cngn-to-usdt" && chainId === TEXTILE_CHAIN_CELO) {
    const cngn = Number(sellAmount) / 1e6;
    if (cngn < config.textile.minSweepCngn) {
      throw new Error(`Sweep size ${cngn} cNGN is below the minimum ${config.textile.minSweepCngn} cNGN (mainnet $1 corridor floor). Accumulate more cNGN earnings first.`);
    }
  }
  const preview = await previewQuote({ chainId, sellToken, buyToken, sellAmount });
  return {
    mode: "dry-run",
    direction,
    chainId,
    sellToken,
    buyToken,
    sellAmount: String(sellAmount),
    preview,
    note: "Dry-run only. No firm quote was requested and nothing was broadcast. Run scripts/textile-sweep.js with TEXTILE_SWEEP=live and --execute for a real swap.",
  };
}
