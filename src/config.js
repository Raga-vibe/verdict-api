import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  publicUrl: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000",
  serv: {
    apiKey: process.env.SERV_API_KEY,
    model: process.env.SERV_MODEL || "gpt-5.4-mini",
    hardModel: process.env.SERV_HARD_MODEL || "gpt-5.4-mini-serv-multipath",
  },
  debug: process.env.DEBUG === "1",
  payments: {
    mode: process.env.PAYMENTS_MODE || "off",
    network: process.env.KITE_NETWORK || "kite-testnet",
    facilitator: process.env.FACILITATOR_URL || "https://facilitator.pieverse.io",
    payTo: process.env.PAY_TO,
    asset: process.env.PAY_ASSET,
    decimals: Number(process.env.ASSET_DECIMALS || 18),
  },
};

// Price list in US cents. Change freely.
export const PRICES = {
  claim: 1,
  link: 1,
  token: 1,
};
