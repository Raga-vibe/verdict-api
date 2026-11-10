// x402 v2 seller flow: exact EVM payment on Kite, verified and settled by Pieverse.
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
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

function centsToUnits(cents) {
  return (BigInt(cents) * 10n ** BigInt(config.payments.decimals) / 100n).toString();
}

function paymentOption(kind) {
  return {
    scheme: "exact",
    network: config.payments.network,
    price: {
      asset: config.payments.asset,
      amount: centsToUnits(PRICES[kind]),
      extra: { name: "pieUSD", version: "1" },
    },
    payTo: config.payments.payTo,
    maxTimeoutSeconds: 60,
  };
}

export function paymentTerms(kind, base = "") {
  const description = `Verdict API - ${kind} check (${PRICES[kind]} cents)`;
  return {
    x402Version: 2,
    resource: {
      url: `${config.publicUrl}${base}/verdict/${kind}`,
      description,
      mimeType: "application/json",
    },
    accepts: [{
      scheme: "exact",
      network: config.payments.network,
      amount: centsToUnits(PRICES[kind]),
      asset: config.payments.asset,
      payTo: config.payments.payTo,
      maxTimeoutSeconds: 60,
      extra: { name: "pieUSD", version: "1" },
    }],
    outputSchema: {
      input: { discoverable: true, method: "POST", bodyFields: inputFields(kind), type: "http" },
      output: OUTPUT_SCHEMA,
    },
  };
}

function inputFields(kind) {
  if (kind === "claim") return { claim: { type: "string", required: true, description: "The claim to check" }, sources: { type: "array", required: false, description: "Optional URLs to use as evidence" } };
  if (kind === "link") return { url: { type: "string", required: true, description: "Page, offer or store to check" } };
  return { address: { type: "string", required: true, description: "Token contract address" }, chain: { type: "string", required: false, description: "e.g. base, bsc, solana" } };
}

const baseFacilitator = new HTTPFacilitatorClient({ url: config.payments.facilitator });
// Last verify outcome, so a failed payment can be explained instead of
// answered with the library's empty {} body. Set and read in the same
// request flow (verify, then the middleware answers), never across requests.
let lastVerifyResult = null;
const loggedFacilitator = {
  getSupported: (...args) => baseFacilitator.getSupported(...args),
  async verify(payload, requirements) {
    if (config.debug) console.log("[DEBUG] Decoded PAYMENT-SIGNATURE payload:", JSON.stringify(payload, null, 2));
    try {
      const response = await baseFacilitator.verify(payload, requirements);
      lastVerifyResult = response;
      if (config.debug) console.log("[DEBUG] Full /v2/verify response:", JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      if (config.debug) console.error("[DEBUG] /v2/verify error:", String(error?.stack || error));
      throw error;
    }
  },
  async settle(payload, requirements) {
    try {
      const response = await baseFacilitator.settle(payload, requirements);
      if (config.debug) console.log("[DEBUG] Full /v2/settle response:", JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      if (config.debug) console.error("[DEBUG] /v2/settle error:", String(error?.stack || error));
      throw error;
    }
  },
};

const resourceServer = new x402ResourceServer(loggedFacilitator)
  .register(config.payments.network, new ExactEvmScheme());

export function requirePayment(kind, base = "") {
  if (config.payments.mode === "off") {
    return (req, res, next) => {
      req.payment = { mode: "off", amountCents: PRICES[kind] };
      next();
    };
  }

  const middleware = paymentMiddleware({
    [`POST ${base}/verdict/${kind}`]: {
      accepts: [paymentOption(kind)],
      description: `Verdict API - ${kind} check (${PRICES[kind]} cents)`,
      mimeType: "application/json",
    },
  }, resourceServer);

  return (req, res, next) => {
    // No payment attached yet: answer the 402 ourselves instead of the
    // library's empty {} body, so a human testing with curl sees what to
    // do next. The body is the same x402 terms object the
    // payment-required header carries, plus the standard error envelope,
    // so x402 clients and demo/buyer.js keep working exactly as before.
    const signature = req.headers["payment-signature"] || req.headers["x-payment-signature"];
    if (!signature) {
      const terms = paymentTerms(kind, base);
      const encoded = Buffer.from(JSON.stringify(terms)).toString("base64");
      res.setHeader("payment-required", encoded);
      res.setHeader("x-payment-required", encoded);
      return res.status(402).json({
        ...terms,
        error: `Payment required: this ${kind} check costs ${PRICES[kind]} cents in pieUSD on Kite testnet (${config.payments.network}). Pay with x402 and resend with a PAYMENT-SIGNATURE header, or read the free terms at GET ${base}/verdict/${kind}/terms.`,
        code: "PAYMENT_REQUIRED",
      });
    }
    const continueAfterPayment = (error) => {
      if (error) return next(error);
      let settlement = null;
      const responseHeader = res.getHeader("PAYMENT-RESPONSE") || res.getHeader("X-PAYMENT-RESPONSE");
      if (responseHeader) {
        try { settlement = JSON.parse(Buffer.from(String(responseHeader), "base64").toString("utf8")); } catch {}
      }
      req.payment = {
        mode: "x402",
        amountCents: PRICES[kind],
        tx: settlement?.transaction ?? settlement?.transactionHash ?? settlement?.txHash ?? null,
        settle: settlement,
      };
      next();
    };
    // The library answers a failed verification with an empty {} body.
    // Swap that one case for a helpful error in the standard envelope,
    // using the facilitator's reason when one was captured. Successful
    // payments and any non-empty body pass through untouched.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 402 && body && typeof body === "object" && Object.keys(body).length === 0) {
        const reason = lastVerifyResult?.invalidReason || lastVerifyResult?.error || null;
        const detail = reason ? ` The facilitator said: ${reason}.` : "";
        return originalJson({
          error: `Payment verification failed.${detail} Check your pieUSD balance on Kite testnet and that the payment matches the terms, then try again.`,
          code: "PAYMENT_FAILED",
          ...(reason ? { reason } : {}),
        });
      }
      return originalJson(body);
    };
    Promise.resolve(middleware(req, res, continueAfterPayment)).catch(next);
  };
}
