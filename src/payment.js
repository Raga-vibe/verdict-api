// x402 seller side, following docs.gokite.ai/passport/seller
// Flow: no X-PAYMENT -> 402 with terms. With X-PAYMENT -> verify -> settle -> next().
import { config, PRICES } from "./config.js";

const OUTPUT_SCHEMA = {
  properties: {
    verdict: { type: "string", description: "safe | risky | scam | true | false | unclear" },
    confidence: { type: "number", description: "0 to 1" },
    reasons: { type: "array", description: "Reasons, each with a quote from the evidence" },
  },
  required: ["verdict", "confidence", "reasons"],
  type: "object",
};

function centsToWei(cents) {
  // 1 token = 1 USD (stablecoin). cents/100 * 10^decimals
  return (BigInt(cents) * 10n ** BigInt(config.payments.decimals) / 100n).toString();
}

export function paymentTerms(kind, req) {
  return {
    scheme: "gokite-aa",
    network: config.payments.network,
    maxAmountRequired: centsToWei(PRICES[kind]),
    resource: `${config.publicUrl}/verdict/${kind}`,
    description: `Verdict API - ${kind} check (${PRICES[kind]} cents)`,
    mimeType: "application/json",
    outputSchema: {
      input: {
        discoverable: true,
        method: "POST",
        bodyFields: inputFields(kind),
        type: "http",
      },
      output: OUTPUT_SCHEMA,
    },
    payTo: config.payments.payTo,
    maxTimeoutSeconds: 300,
    asset: config.payments.asset,
    extra: null,
    merchantName: "Verdict API",
  };
}

function inputFields(kind) {
  if (kind === "claim") return { claim: { type: "string", required: true, description: "The claim to check" }, sources: { type: "array", required: false, description: "Optional URLs to use as evidence" } };
  if (kind === "link") return { url: { type: "string", required: true, description: "Page, offer or store to check" } };
  return { address: { type: "string", required: true, description: "Token contract address" }, chain: { type: "string", required: false, description: "e.g. base, bsc, solana" } };
}

async function post(path, body) {
  const res = await fetch(config.payments.facilitator + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function requirePayment(kind) {
  return async (req, res, next) => {
    if (config.payments.mode === "off") {
      req.payment = { mode: "off", amountCents: PRICES[kind] };
      return next();
    }

    const header = req.get("X-PAYMENT");
    const terms = paymentTerms(kind, req);
    if (!header) {
      return res.status(402).json({ error: "X-PAYMENT header is required", accepts: [terms], x402Version: 1 });
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    } catch {
      return res.status(402).json({ error: "X-PAYMENT is not valid base64 JSON", accepts: [terms], x402Version: 1 });
    }

    // Body shape from Kite docs: { authorization, signature, network }.
    // VERIFY THIS against a real kpass payment on day 1-2 and adjust here only.
    const body = {
      authorization: payload.authorization ?? payload.payload?.authorization,
      signature: payload.signature ?? payload.payload?.signature,
      network: config.payments.network,
      paymentRequirements: terms,
    };

    const verify = await post("/v2/verify", body);
    if (!verify.ok || verify.data?.isValid === false) {
      return res.status(402).json({ error: "Payment verification failed", details: verify.data, accepts: [terms], x402Version: 1 });
    }

    const settle = await post("/v2/settle", body);
    if (!settle.ok || settle.data?.success === false) {
      return res.status(402).json({ error: "Payment settlement failed", details: settle.data, accepts: [terms], x402Version: 1 });
    }

    req.payment = { mode: "x402", amountCents: PRICES[kind], tx: settle.data?.transaction ?? settle.data?.txHash ?? null, settle: settle.data };
    res.set("X-PAYMENT-RESPONSE", Buffer.from(JSON.stringify(settle.data)).toString("base64"));
    next();
  };
}
