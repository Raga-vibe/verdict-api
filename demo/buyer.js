import "dotenv/config";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

const BASE = process.env.VERDICT_URL || "https://verdict-api-t50q.onrender.com";
const URL = `${BASE.replace(/\/+$/, "")}/verdict/claim`;
const BODY = {
  claim: "Example Domain is for documentation",
  sources: ["https://example.com"],
};
const TESTNET = "eip155:2368";
const TESTNET_PIEUSD = "0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A";
const ONE_CENT_WEI = 10_000_000_000_000_000n;

const configuredPrivateKey = process.env.BUYER_PRIVATE_KEY?.trim() || "";
const privateKey = configuredPrivateKey.startsWith("0x") ? configuredPrivateKey : `0x${configuredPrivateKey}`;
if (!/^0x[0-9a-f]{64}$/i.test(privateKey)) {
  throw new Error("Set BUYER_PRIVATE_KEY in the ignored local .env file as a 32-byte hex key. Never paste it into chat.");
}

const account = privateKeyToAccount(privateKey);
const baseHeaders = { "Content-Type": "application/json", Accept: "application/json" };

async function readResponse(response) {
  const text = await response.text();
  try { return { text, data: JSON.parse(text) }; } catch { return { text, data: null }; }
}

const probe = await fetch(URL, {
  method: "POST",
  headers: baseHeaders,
  body: JSON.stringify(BODY),
});
const probeResponse = await readResponse(probe);

if (probe.status !== 402) {
  console.error(`Expected HTTP 402 challenge; got HTTP ${probe.status}: ${probeResponse.text}`);
  process.exitCode = 1;
} else {
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
  if (amount <= 0n || amount > ONE_CENT_WEI) {
    throw new Error(`Refusing to sign ${amount} units: the demo is capped at 1 cent per attempt.`);
  }

  const now = Math.floor(Date.now() / 1000);
  const validBefore = BigInt(now + Math.min(Number(requirement.maxTimeoutSeconds || 60), 60));
  const nonce = `0x${randomBytes(32).toString("hex")}`;
  const signature = await account.signTypedData({
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
    message: {
      from: account.address,
      to: requirement.payTo,
      value: amount,
      validAfter: 0n,
      validBefore,
      nonce,
    },
  });

  const signatureHex = signature.slice(2);
  let v = Number.parseInt(signatureHex.slice(128, 130), 16);
  if (v < 27) v += 27;
  const payload = {
    x402Version: 2,
    scheme: "exact",
    network: TESTNET,
    authorization: {
      from: account.address,
      to: requirement.payTo,
      value: amount.toString(),
      validAfter: 0,
      validBefore: Number(validBefore),
      nonce,
      v,
      r: `0x${signatureHex.slice(0, 64)}`,
      s: `0x${signatureHex.slice(64, 128)}`,
    },
  };
  const paymentSignature = Buffer.from(JSON.stringify(payload)).toString("base64");

  const paid = await fetch(URL, {
    method: "POST",
    headers: { ...baseHeaders, "PAYMENT-SIGNATURE": paymentSignature },
    body: JSON.stringify(BODY),
  });
  const paidResponse = await readResponse(paid);
  if (!paid.ok) {
    console.error(`Paid request failed: HTTP ${paid.status} ${paid.statusText}`);
    console.error(paidResponse.text);
    process.exitCode = 1;
  } else {
    const receiptHeader = paid.headers.get("payment-response") || paid.headers.get("x-payment-response");
    let settlement = null;
    if (receiptHeader) {
      try { settlement = JSON.parse(Buffer.from(receiptHeader, "base64").toString("utf8")); }
      catch { settlement = { raw: receiptHeader }; }
    }
    const txHash = settlement?.transaction ?? settlement?.transactionHash ?? settlement?.txHash ?? null;
    console.log(JSON.stringify({ verdict: paidResponse.data?.verdict, confidence: paidResponse.data?.confidence, response: paidResponse.data, settlement, transactionHash: txHash, explorerUrl: txHash ? `https://testnet.kitescan.ai/tx/${txHash}` : null }, null, 2));
  }
}
