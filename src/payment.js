// x402 v2 seller flow: exact EVM payment on Celo, verified and settled
// by the Celo x402 facilitator (https://x402.celo.org/skill.md).
//
// Two payment options, both explicit price objects (the "$0.01" shorthand
// throws on Celo, so it is never used here):
//   1. USDC, EIP-3009, 6 decimals, extra { name: "USDC", version: "2" }.
//      Sepolia 0x01C5C0122039549AD1493B8220cABEdD739BC44E,
//      mainnet 0xcebA9300f2b948710d2653dD7B07f33A8B32118C.
//   2. cNGN, Permit2, 6 decimals, extra { name: "cNGN", version: "1",
//      assetTransferMethod: "permit2" }. Mainnet only: there is no
//      Sepolia cNGN in the x402 token table, so on Sepolia only USDC is
//      offered. The first cNGN payer approves Permit2 onchain.
import { AsyncLocalStorage } from "node:async_hooks";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { declareBuilderCodeExtension } from "@x402/extensions/builder-code";
import { config, PRICES, PRICES_CNGN, CELO_TOKENS } from "./config.js";
import { paymentRequiredBody, paymentFailedBody } from "./states.js";

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

function cngnToUnits(cngn) {
  return (BigInt(cngn) * 10n ** BigInt(config.payments.cngnDecimals)).toString();
}

// ERC-8021 builder-code extension for x402 settlements. The facilitator
// submits the settlement transaction, so we cannot append a calldata
// suffix ourselves; instead the 402 response declares our code under
// extensions["builder-code"].info.a, the client echoes it, and the
// facilitator appends the Schema 2 suffix at settlement. Per Celo docs
// this is ignored until the facilitator update ships, then applies
// automatically. It only applies to x402 v2 payments.
export function builderCodeExtension() {
  return { "builder-code": declareBuilderCodeExtension(config.attributionCode) };
}

function usdcOption(kind) {
  return {
    scheme: "exact",
    network: config.payments.network,
    price: {
      asset: config.payments.asset,
      amount: centsToUnits(PRICES[kind]),
      extra: { ...CELO_TOKENS.usdc.extra },
    },
    payTo: config.payments.payTo,
    maxTimeoutSeconds: 60,
  };
}

function cngnOption(kind) {
  return {
    scheme: "exact",
    network: config.payments.network,
    price: {
      asset: config.payments.cngnAsset,
      amount: cngnToUnits(PRICES_CNGN[kind]),
      extra: { ...CELO_TOKENS.cngn.extra },
    },
    payTo: config.payments.payTo,
    maxTimeoutSeconds: 60,
  };
}

// All payment options for a kind, USDC first. cNGN only on mainnet.
export function paymentOptions(kind) {
  const options = [usdcOption(kind)];
  if (config.payments.cngnAvailable) options.push(cngnOption(kind));
  return options;
}

// Flat accept shape used in the 402 terms body (the middleware takes the
// nested price shape above; the terms body uses the flat shape, as on
// master, so existing x402 clients keep working).
function acceptShape(option) {
  return {
    scheme: option.scheme,
    network: option.network,
    amount: option.price.amount,
    asset: option.price.asset,
    payTo: option.payTo,
    maxTimeoutSeconds: option.maxTimeoutSeconds,
    extra: option.price.extra,
  };
}

export function paymentTerms(kind, base = "") {
  const usdcPrice = `${PRICES[kind]} cents USDC`;
  const priceText = config.payments.cngnAvailable
    ? `${usdcPrice} or ${PRICES_CNGN[kind]} cNGN`
    : usdcPrice;
  const description = `Verdict API - ${kind} check (${priceText})`;
  return {
    x402Version: 2,
    resource: {
      url: `${config.publicUrl}${base}/verdict/${kind}`,
      description,
      mimeType: "application/json",
    },
    accepts: paymentOptions(kind).map(acceptShape),
    extensions: builderCodeExtension(),
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

// The Celo facilitator is metered: X402_API_KEY is sent as X-API-Key on
// every facilitator call the middleware makes. Without it /settle
// returns 401. The key is never exposed to buyers or the browser.
// If it is missing we warn once at startup and let the middleware fail
// settlement helpfully, instead of crashing /health or the server.
if (!config.payments.apiKey && config.payments.mode === "on") {
  console.warn("[celo] X402_API_KEY is not set. Paid calls will fail at /settle with 401. Create a key at https://x402.celo.org (Create API key, sign, copy once) and set X402_API_KEY. /health and free endpoints still work.");
}
const baseFacilitator = new HTTPFacilitatorClient({
  url: config.payments.facilitator,
  createAuthHeaders: async () => {
    if (!config.payments.apiKey) return {};
    const h = { "X-API-Key": config.payments.apiKey };
    return { verify: h, settle: h, supported: h };
  },
});
// Per-request payment context. The facilitator's verify outcome for a paid
// call lives here, not in a module-level variable, so two paid calls in
// flight at once can never read each other's reason. The middleware runs
// inside paymentContext.run() below, and verify() writes into that store.
const paymentContext = new AsyncLocalStorage();
const loggedFacilitator = {
  getSupported: (...args) => baseFacilitator.getSupported(...args),
  async verify(payload, requirements) {
    if (config.debug) console.log("[DEBUG] Decoded PAYMENT-SIGNATURE payload:", JSON.stringify(payload, null, 2));
    try {
      const response = await baseFacilitator.verify(payload, requirements);
      const store = paymentContext.getStore();
      if (store) store.verifyResult = response;
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
      accepts: paymentOptions(kind),
      description: `Verdict API - ${kind} check (${PRICES[kind]} cents USDC${config.payments.cngnAvailable ? ` or ${PRICES_CNGN[kind]} cNGN` : ""})`,
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
      return res.status(402).json(paymentRequiredBody({
        kind,
        cents: PRICES[kind],
        network: config.payments.network,
        base,
        terms,
      }));
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
    // Swap that one case for the payment table's error body, using this
    // request's own facilitator outcome from the payment context.
    // Successful payments and any non-empty body pass through untouched.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 402 && body && typeof body === "object" && Object.keys(body).length === 0) {
        const verifyResult = paymentContext.getStore()?.verifyResult ?? null;
        return originalJson(paymentFailedBody({ verifyResult }));
      }
      return originalJson(body);
    };
    // Run the library middleware inside this request's payment context, so
    // verify() and the 402 body above always see the same request's outcome.
    return paymentContext.run({ verifyResult: null }, () =>
      Promise.resolve(middleware(req, res, continueAfterPayment)).catch(next));
  };
}
