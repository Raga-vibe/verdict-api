import "dotenv/config";

// Verdict API, Celo branch (Loops House: Agents Open for Business).
// This branch is Celo-only. The OpenServ / Kite version lives on `master`
// and is untouched by this branch; do not merge this branch into master.
//
// Networks are CAIP-2 strings. Celo mainnet is eip155:42220, Celo Sepolia
// testnet is eip155:11142220. Defaults are Sepolia so a fresh checkout can
// be tested with no real money; set X402_NETWORK=eip155:42220 for mainnet.
function normalizeNetwork(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "mainnet" || v === "42220" || v === "eip155:42220") return "eip155:42220";
  if (v === "testnet" || v === "sepolia" || v === "11142220" || v === "eip155:11142220") return "eip155:11142220";
  return v || "eip155:11142220";
}

const paymentNetwork = normalizeNetwork(
  process.env.X402_NETWORK || process.env.CELO_NETWORK || "eip155:11142220"
);
const isMainnet = paymentNetwork === "eip155:42220";
const isSepolia = paymentNetwork === "eip155:11142220";

// Celo x402 facilitator (https://x402.celo.org/skill.md). The skill passes
// the base URL with no /v2 suffix to HTTPFacilitatorClient, so unlike the
// old Kite config we do NOT append /v2 here.
const facilitatorUrl = (
  process.env.FACILITATOR_URL ||
  (isMainnet ? "https://api.x402.celo.org" : "https://api.x402.sepolia.celo.org")
).replace(/\/+$/, "");

// ERC-8021 builder code. Any string matching [a-z0-9_], 1-32 chars, is a
// valid code. If Loops / Celo issues an assigned code (celo_xxxxxxxx),
// set ATTRIBUTION_CODE to that assigned code; programs only credit the
// assigned code, not one derived here. Assigned code from Loops House, 27 Nov 2026.
function normalizeAttributionCode(raw) {
  const v = String(raw || "celo_2d4c610c6d49").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  return /^[a-z0-9_]{1,32}$/.test(v) ? v : "celo_2d4c610c6d49";
}

// Celo token addresses, from the x402 Celo skill token table.
// USDC: 6 decimals, EIP-3009, extra { name: "USDC", version: "2" }.
// cNGN: 6 decimals, Permit2, extra { name: "cNGN", version: "1" }.
// cNGN has no Celo Sepolia deployment in the skill table, so it is only
// offered as a payment option on mainnet (see src/payment.js).
export const CELO_TOKENS = {
  usdc: {
    mainnet: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    sepolia: "0x01C5C0122039549AD1493B8220cABEdD739BC44E",
    decimals: 6,
    extra: { name: "USDC", version: "2" },
  },
  usdt: {
    mainnet: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    sepolia: null,
    decimals: 6,
    extra: { name: "Tether USD", version: "1" },
  },
  cngn: {
    mainnet: "0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f",
    sepolia: null,
    decimals: 6,
    extra: { name: "cNGN", version: "1", assetTransferMethod: "permit2" },
  },
};

// Self Agent ID registry, Celo docs (docs.celo.org/build/agents/self-agent-id).
// The SDK picks these from the network name; they are recorded here for
// the README and for /health, not hard-coded into verification calls.
export const SELF_REGISTRY = {
  mainnet: "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944",
  sepolia: "0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379",
};

export const config = {
  port: Number(process.env.PORT || 3000),
  publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/+$/, ""),
  serv: {
    apiKey: process.env.SERV_API_KEY,
    model: process.env.SERV_MODEL || "gpt-5.4-mini",
    hardModel: process.env.SERV_HARD_MODEL || "gpt-5.4-mini-serv-multipath",
  },
  debug: process.env.DEBUG === "1",
  payments: {
    mode: process.env.PAYMENTS_MODE || "off",
    network: paymentNetwork,
    isMainnet,
    isSepolia,
    facilitator: facilitatorUrl,
    // X402_API_KEY is created by a human at https://x402.celo.org
    // (Create API key, sign, copy once). It is sent only to the
    // facilitator as X-API-Key. Without it /settle returns 401.
    apiKey: process.env.X402_API_KEY || "",
    payTo: process.env.PAY_TO,
    asset: isMainnet ? CELO_TOKENS.usdc.mainnet : CELO_TOKENS.usdc.sepolia,
    decimals: CELO_TOKENS.usdc.decimals,
    cngnAsset: CELO_TOKENS.cngn.mainnet,
    cngnDecimals: CELO_TOKENS.cngn.decimals,
    // cNGN is mainnet-only: there is no Sepolia cNGN in the x402 table.
    cngnAvailable: isMainnet,
  },
  attributionCode: normalizeAttributionCode(process.env.ATTRIBUTION_CODE),
  self: {
    // "testnet" (Celo Sepolia, mock documents accepted) or "mainnet"
    // (real passport/ID only). Defaults follow the payment network.
    network: (process.env.SELF_NETWORK || (isMainnet ? "mainnet" : "testnet")).toLowerCase(),
    // SELF_VERIFY=on enforces Self Agent ID on POST /verdict/claim.
    // Default off so Sepolia testing works before registration.
    verify: process.env.SELF_VERIFY === "on",
    rpcUrl: process.env.SELF_RPC_URL || (isMainnet ? "https://forno.celo.org" : "https://forno.celo-sepolia.celo-testnet.org"),
  },
  textile: {
    apiKey: process.env.TEXTILE_API_KEY || "",
    baseUrl: (process.env.TEXTILE_BASE_URL || "https://api.textilecredit.com").replace(/\/+$/, ""),
    // Mainnet sweep chain is Celo 42220. Testnet has no Celo Sepolia
    // settlement contract (testnets are BSC 97 and Base Sepolia 84532
    // only), so a test sweep uses TEXTILE_CHAIN=97 with a tx_test_ key.
    chainId: Number(process.env.TEXTILE_CHAIN || (isMainnet ? 42220 : 97)),
    // "dry-run" (default: quote only, never broadcast) or "live".
    sweep: (process.env.TEXTILE_SWEEP || "dry-run").toLowerCase(),
    // Minimum sweep size. Mainnet corridor floor is $1 of notional;
    // 2000 cNGN is about $1.30 at ~1500 NGN/USD, a safe margin.
    minSweepCngn: Number(process.env.TEXTILE_MIN_SWEEP_CNGN || 2000),
  },
};

// Price list in US cents (USDC). Change freely.
export const PRICES = {
  claim: 2,
  link: 3,
  token: 5,
};

// Price list in cNGN (Permit2, mainnet only). 30 / 45 / 75 cNGN is
// approx 2c / 3c / 5c at ~1500 NGN per USD. This is a fixed-price
// assumption, not a live FX rate: re-check the NGN/USD rate before
// mainnet, and re-price if it has moved materially.
export const PRICES_CNGN = {
  claim: 30,
  link: 45,
  token: 75,
};

// API version. The canonical paths are /v1/...; the unversioned
// /verdict/... paths still work for existing clients.
export const API_VERSION = "1.1.0";
