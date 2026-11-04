import "dotenv/config";

const requestedNetwork = (process.env.KITE_NETWORK || "eip155:2368").toLowerCase();
const kiteTestnet = ["kite-testnet", "testnet", "2368", "eip155:2368"].includes(requestedNetwork);
const paymentNetwork = kiteTestnet ? "eip155:2368" : requestedNetwork;
const facilitatorUrl = (process.env.FACILITATOR_URL || "https://facilitator.pieverse.io/v2").replace(/\/+$/, "");

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
    facilitator: facilitatorUrl.endsWith("/v2") ? facilitatorUrl : `${facilitatorUrl}/v2`,
    payTo: process.env.PAY_TO,
    asset: kiteTestnet ? "0x38129cf4CE5E183eFF248F42A7D345Bb1B47621A" : process.env.PAY_ASSET,
    decimals: kiteTestnet ? 18 : Number(process.env.ASSET_DECIMALS || 6),
  },
};

// Price list in US cents. Change freely.
export const PRICES = {
  claim: 1,
  link: 1,
  token: 1,
};
