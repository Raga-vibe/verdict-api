// Demo buyer for the Celo branch: a verified agent pays for a claim
// verdict in USDC over x402 on Celo Sepolia.
//
//   npm run dev            # terminal 1, PAYMENTS_MODE=off for a free run
//   node demo/celo-buyer.js
//
// Paid run on Sepolia:
//   VERDICT_URL=http://localhost:3000 \
//   BUYER_PRIVATE_KEY=<funded Sepolia key with test USDC> \
//   node demo/celo-buyer.js
//
// With a Self Agent ID (Track 3), also set:
//   AGENT_PRIVATE_KEY=<registered agent key> SELF_NETWORK=testnet
// The buyer then calls the API with agent.fetch(), which adds the
// three signed Self headers (x-self-agent-address,
// x-self-agent-signature, x-self-agent-timestamp) to every request.
// Without AGENT_PRIVATE_KEY it falls back to plain fetch and says so
// plainly; the server only enforces Self when SELF_VERIFY=on.
//
// Registration (human step, on a phone):
//   npx @selfxyz/agent-sdk self-agent register init \
//     --mode agent-identity --human-address 0xYourWallet --network testnet
//   npx @selfxyz/agent-sdk self-agent register open --session .self/session.json
//   npx @selfxyz/agent-sdk self-agent register wait --session .self/session.json
//   npx @selfxyz/agent-sdk self-agent register export --session .self/session.json --unsafe --print-private-key
// Scan the QR code in the Self app. Mock documents are accepted on
// testnet; mainnet needs a real passport/ID. Never commit the exported
// key or paste it into chat; keep it in the ignored local .env.
//
// This buyer pays in USDC (EIP-3009) only. cNGN is Permit2, so it
// needs a Permit2 client, not the EIP-3009 signing below; the server
// offers cNGN on mainnet, but this demo deliberately picks the USDC
// accept from the 402 terms.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

const BASE = (process.env.VERDICT_URL || "http://localhost:3000").replace(/\/+$/, "");
const NETWORK = (process.env.VERDICT_NETWORK || process.env.X402_NETWORK || "eip155:11142220").toLowerCase();
const IS_MAINNET = NETWORK === "eip155:42220" || NETWORK === "mainnet";
const CHAIN_ID = IS_MAINNET ? 42220 : 11142220;
const NETWORK_CAIP = IS_MAINNET ? "eip155:42220" : "eip155:11142220";
const USDC = IS_MAINNET
  ? "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
  : "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
const EXPLORER = IS_MAINNET ? "https://celoscan.io/tx/" : "https://celo-sepolia.blockscout.com/tx/";
// 2 cents in USDC units (6 decimals) is the claim price; cap at 5 cents.
const MAX_UNITS_PER_CALL = 50_000n;

const URL = `${BASE}/v1/verdict/claim`;
const BODY = JSON.stringify({
  claim: "Example Domain is for documentation",
  sources: ["https://example.com"],
});
const baseHeaders = { "Content-Type": "application/json", Accept: "application/json" };

let agent = null;
const agentKey = (process.env.AGENT_PRIVATE_KEY || "").trim();
if (agentKey) {
  const { SelfAgent } = await import("@selfxyz/agent-sdk");
  agent = new SelfAgent({
    privateKey: agentKey.startsWith("0x") ? agentKey : `0x${agentKey}`,
    network: IS_MAINNET ? "mainnet" : "testnet",
  });
  console.log(`Self Agent ID: calling as verified agent ${agent.address} on ${IS_MAINNET ? "mainnet" : "testnet"}.`);
  try {
    const info = await agent.getInfo();
    console.log(`Self Agent ID: registered=${info.isRegistered ?? info.isVerified ?? "unknown"}, agentId=${info.agentId ?? "?"}.`);
  } catch (error) {
    console.log(`Self Agent ID: could not read on-chain status (${String(error?.message || error)}). The call will still be attempted; the server rejects it if SELF_VERIFY=on and the agent is not registered.`);
  }
} else {
  console.log("Self Agent ID: no AGENT_PRIVATE_KEY set, calling with plain fetch. Set AGENT_PRIVATE_KEY to call as a verified agent.");
}

async function doFetch(url, options) {
  return agent ? agent.fetch(url, options) : fetch(url, options);
}

function buyerAccount() {
  const raw = (process.env.BUYER_PRIVATE_KEY || "").trim();
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-f]{64}$/i.test(key)) {
    throw new Error("Server asked for payment, but no buyer key is set. Set BUYER_PRIVATE_KEY in the ignored local .env file as a 32-byte hex key (funded with Sepolia USDC), or run the server with PAYMENTS_MODE=off. Never paste the key into chat.");
  }
  return privateKeyToAccount(key);
}

async function readResponse(response) {
  const text = await response.text();
  try { return { text, data: JSON.parse(text) }; } catch { return { text, data: null }; }
}

console.log(`Verdict API (Celo): ${BASE}  network ${NETWORK_CAIP}`);
console.log(`Claim: "Example Domain is for documentation"`);

const probe = await doFetch(URL, { method: "POST", headers: baseHeaders, body: BODY });
const probeResponse = await readResponse(probe);
if (probe.ok) {
  console.log("No payment needed (server is running with PAYMENTS_MODE=off).");
  console.log(JSON.stringify(probeResponse.data, null, 2));
  process.exit(0);
}
if (probe.status === 503) {
  throw new Error(`Verdict service unavailable (${probeResponse.data?.code || "SERVICE_UNAVAILABLE"}): ${probeResponse.data?.error || "the reasoning service is not configured"}. No payment was taken.`);
}
if (probe.status === 401) {
  throw new Error(`Self Agent ID rejected the call (${probeResponse.data?.error || "unauthorized"}). Register the agent (see the header of demo/celo-buyer.js) or run the server with SELF_VERIFY off.`);
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
console.log(`Builder code declared in 402: ${challenge?.extensions?.["builder-code"]?.info?.a ?? "(none)"}`);
const requirement = challenge.accepts?.find((item) => item.scheme === "exact" && item.network === NETWORK_CAIP && item.asset?.toLowerCase() === USDC.toLowerCase());
if (!requirement) throw new Error(`The challenge does not offer exact USDC payments on ${NETWORK_CAIP}. Accepts: ${JSON.stringify(challenge.accepts)}`);
const amount = BigInt(requirement.amount);
if (amount <= 0n || amount > MAX_UNITS_PER_CALL) {
  throw new Error(`Refusing to sign ${amount} units: the demo is capped at 5 cents per call.`);
}
console.log(`Paying ${Number(amount) / 1e6} USDC over x402 on Celo ${IS_MAINNET ? "mainnet" : "Sepolia"}.`);

const buyer = buyerAccount();
const now = Math.floor(Date.now() / 1000);
const validBefore = BigInt(now + Math.min(Number(requirement.maxTimeoutSeconds || 60), 60));
const nonce = `0x${randomBytes(32).toString("hex")}`;
const signature = await buyer.signTypedData({
  domain: {
    name: requirement.extra?.name || "USDC",
    version: requirement.extra?.version || "2",
    chainId: CHAIN_ID,
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
const paid = await doFetch(URL, {
  method: "POST",
  headers: { ...baseHeaders, "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify(payload)).toString("base64") },
  body: BODY,
});
const paidResponse = await readResponse(paid);
if (!paid.ok) throw new Error(`Paid request failed: HTTP ${paid.status} ${paidResponse.text}`);
const header = paid.headers.get("payment-response") || paid.headers.get("x-payment-response");
if (header) {
  try {
    const settlement = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    const tx = settlement?.transaction ?? settlement?.transactionHash ?? settlement?.txHash ?? null;
    if (tx) console.log(`Payment settled. Tx: ${EXPLORER}${tx}`);
  } catch {}
}
console.log(JSON.stringify(paidResponse.data, null, 2));
