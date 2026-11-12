// Demo shopping agent (Step 6 of PROMPTS.md).
//
// The agent is told to buy sneakers. Before it pays any shop, it asks
// Verdict API first and pays 3 cents per check over x402 on Kite testnet:
//   1. Scam page  -> verdict "scam", the agent refuses to buy.
//   2. Honest page -> verdict "safe", the agent proceeds (demo only,
//      no real purchase is made).
//
// Run it locally (recommended for a screen recording):
//   npm run dev          # terminal 1, PAYMENTS_MODE=off for a free run
//   npm run fixtures     # terminal 2, serves tests/fixtures on :4000
//   npm run demo         # terminal 3
//
// Paid run against the live API:
//   VERDICT_URL=https://verdict-api-t50q.onrender.com \
//   SCAM_URL=https://<public-scam-page> HONEST_URL=https://<public-honest-page> \
//   INJECTED_URL=https://<public-injected-page> \
//   BUYER_PRIVATE_KEY=<funded testnet key> npm run demo
// The key is only needed when the server answers 402. With
// PAYMENTS_MODE=off the demo runs without a key. Never commit the key
// or paste it into chat; keep it in the ignored local .env file.
//
// Usage: node demo/buyer.js [scam-url] [honest-url] [injected-url]
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { demoDecision } from "../src/states.js";

const BASE = (process.env.VERDICT_URL || "http://localhost:3000").replace(/\/+$/, "");
const URL = `${BASE}/v1/verdict/link`;
const TESTNET = "eip155:2368";
const TESTNET_PIEUSD = "0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A";
// 5 cents in pieUSD units (18 decimals): the most this demo will sign per call.
const MAX_UNITS_PER_CALL = 50_000_000_000_000_000n;

const isLocal = BASE.includes("localhost") || BASE.includes("127.0.0.1");
const SCAM_URL = process.argv[2] || process.env.SCAM_URL
  || (isLocal ? "http://localhost:4000/scam-1.html" : "");
const HONEST_URL = process.argv[3] || process.env.HONEST_URL
  || (isLocal ? "http://localhost:4000/honest-1.html" : "");
const INJECTED_URL = process.argv[4] || process.env.INJECTED_URL
  || (isLocal ? "http://localhost:4000/inject-1.html" : "");
if (!SCAM_URL || !HONEST_URL || !INJECTED_URL) {
  console.error("Usage: node demo/buyer.js [scam-url] [honest-url] [injected-url]");
  console.error("Against the live API, pass three public page URLs (the server cannot fetch localhost).");
  process.exit(1);
}

const baseHeaders = { "Content-Type": "application/json", Accept: "application/json" };

function account() {
  const raw = (process.env.BUYER_PRIVATE_KEY || "").trim();
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-f]{64}$/i.test(key)) {
    throw new Error("Server asked for payment, but no buyer key is set. Set BUYER_PRIVATE_KEY in the ignored local .env file as a 32-byte hex key (funded with testnet pieUSD), or run the server with PAYMENTS_MODE=off. Never paste the key into chat.");
  }
  return privateKeyToAccount(key);
}

async function readResponse(response) {
  const text = await response.text();
  try { return { text, data: JSON.parse(text) }; } catch { return { text, data: null }; }
}

function settlementFrom(response) {
  const header = response.headers.get("payment-response") || response.headers.get("x-payment-response");
  if (!header) return { settlement: null, txHash: null };
  let settlement = null;
  try { settlement = JSON.parse(Buffer.from(header, "base64").toString("utf8")); }
  catch { settlement = { raw: header }; }
  const txHash = settlement?.transaction ?? settlement?.transactionHash ?? settlement?.txHash ?? null;
  return { settlement, txHash };
}

// One paid (or free, when payments are off) verdict check.
async function checkPage(pageUrl, label) {
  console.log(`\n--- ${label}: ${pageUrl}`);
  console.log("Step 1: Asking Verdict API before buying anything.");
  const body = JSON.stringify({ url: pageUrl });
  const probe = await fetch(URL, { method: "POST", headers: baseHeaders, body });
  const probeResponse = await readResponse(probe);

  if (probe.ok) {
    console.log("Step 2: No payment needed (server is running with PAYMENTS_MODE=off).");
    return { ...probeResponse.data, paid: false, txHash: null };
  }

  if (probe.status === 503) {
    // The reasoning service is not configured: the call was refused
    // before any payment, so this is not a verdict failure and not a
    // refusal to buy. Say so plainly and stop.
    const code = probeResponse.data?.code || "SERVICE_UNAVAILABLE";
    throw new Error(`Verdict service unavailable (${code}): ${probeResponse.data?.error || "the reasoning service is not configured"}. No payment was taken.`);
  }

  if (probe.status !== 402) {
    throw new Error(`Verdict call failed: HTTP ${probe.status} ${probeResponse.text}`);
  }

  let challenge = probeResponse.data;
  const paymentRequired = probe.headers.get("payment-required") || probe.headers.get("x-payment-required");
  if (paymentRequired) {
    try { challenge = JSON.parse(Buffer.from(paymentRequired, "base64").toString("utf8")); }
    catch { throw new Error("Server returned a malformed PAYMENT-REQUIRED header"); }
  }
  if (challenge?.x402Version !== 2) throw new Error(`Expected x402Version 2; received ${challenge?.x402Version ?? "none"}`);
  const requirement = challenge.accepts?.find((item) => item.scheme === "exact" && item.network === TESTNET);
  if (!requirement) throw new Error("The challenge does not offer exact payments on Kite testnet (eip155:2368).");
  if (requirement.asset?.toLowerCase() !== TESTNET_PIEUSD.toLowerCase()) {
    throw new Error(`Unexpected payment token in challenge: ${requirement.asset}`);
  }
  const amount = BigInt(requirement.amount);
  if (amount <= 0n || amount > MAX_UNITS_PER_CALL) {
    throw new Error(`Refusing to sign ${amount} units: the demo is capped at 5 cents per call.`);
  }
  console.log(`Step 2: Paying ${(Number(amount) / 1e18).toFixed(3)} pieUSD (3 cents) over x402 on Kite testnet.`);

  const buyer = account();
  const now = Math.floor(Date.now() / 1000);
  const validBefore = BigInt(now + Math.min(Number(requirement.maxTimeoutSeconds || 60), 60));
  const nonce = `0x${randomBytes(32).toString("hex")}`;
  const signature = await buyer.signTypedData({
    domain: {
      name: requirement.extra?.name || "pieUSD",
      version: requirement.extra?.version || "1",
      chainId: 2368,
      verifyingContract: requirement.asset,
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: { from: buyer.address, to: requirement.payTo, value: amount, validAfter: 0n, validBefore, nonce },
  });
  const payload = {
    x402Version: 2,
    payload: {
      authorization: {
        from: buyer.address,
        to: requirement.payTo,
        value: amount.toString(),
        validAfter: "0",
        validBefore: String(validBefore),
        nonce,
      },
      signature,
    },
    resource: challenge.resource,
    accepted: requirement,
  };
  const paid = await fetch(URL, {
    method: "POST",
    headers: { ...baseHeaders, "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify(payload)).toString("base64") },
    body,
  });
  const paidResponse = await readResponse(paid);
  if (!paid.ok) throw new Error(`Paid request failed: HTTP ${paid.status} ${paidResponse.text}`);
  const { txHash } = settlementFrom(paid);
  if (txHash) console.log(`Step 3: Payment settled. Tx: https://testnet.kitescan.ai/tx/${txHash}`);
  else console.log("Step 3: Payment settled (no tx hash returned).");
  return { ...paidResponse.data, paid: true, txHash };
}

function printVerdict(result) {
  console.log(`Verdict: ${result.verdict} (confidence ${result.confidence})`);
  if (result.summary) console.log(`Why: ${result.summary}`);
  if (result.injection_detected) console.log("Note: hidden instruction-like text was detected on this page.");
}

console.log("Shopping agent: I was told to buy sneakers.");
console.log(`Verdict API: ${BASE}`);

const scam = await checkPage(SCAM_URL, "Check 1: the sneakers page");
printVerdict(scam);
const refused = demoDecision(scam.verdict) === "refuse";
if (refused) console.log("Decision: REFUSING to buy. Verdict is scam/risky, so no money goes to this shop.");
else console.log(`Decision: WARNING, expected scam/risky but got "${scam.verdict}". Not buying anyway in this demo.`);

const honest = await checkPage(HONEST_URL, "Check 2: an honest shop instead");
printVerdict(honest);
const proceeded = demoDecision(honest.verdict) === "proceed";
if (proceeded) console.log("Decision: PROCEEDING to checkout at the honest shop (demo only, no real purchase).");
else console.log(`Decision: NOT proceeding. Honest shop came back "${honest.verdict}", so the agent stops.`);

const injected = await checkPage(INJECTED_URL, "Check 3: a page with hidden instruction-like text");
printVerdict(injected);
console.log(`Hidden instruction-like text detected: ${injected.injection_detected ? "yes" : "no"}`);
console.log("Decision: REFUSING to follow any instructions embedded in page content.");

console.log("\n--- Demo summary ---");
console.log(JSON.stringify({
  scam_page: { url: SCAM_URL, verdict: scam.verdict, confidence: scam.confidence, paid: scam.paid, tx: scam.txHash },
  honest_page: { url: HONEST_URL, verdict: honest.verdict, confidence: honest.confidence, paid: honest.paid, tx: honest.txHash },
  injected_page: { url: INJECTED_URL, verdict: injected.verdict, confidence: injected.confidence, injection_detected: injected.injection_detected, paid: injected.paid, tx: injected.txHash },
  refused_scam: refused,
  proceeded_honest: proceeded,
  refused_hidden_instructions: true,
}, null, 2));

if (!refused || !proceeded) {
  console.error("\nDemo expectation not met: expected scam/risky then safe.");
  process.exitCode = 1;
}
