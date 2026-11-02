# Verdict API

**A paid second opinion for AI agents.** Before an agent buys, signs up, or trades, it asks Verdict API "is this safe?", pays a few cents over x402 on Kite, and gets a clear verdict with quoted evidence.

Built for OpenServ SERV Hackathon Edition 02 (Kite track).

## Endpoints

| Endpoint | Price | Input | Verdicts |
|---|---|---|---|
| `POST /verdict/claim` | 2¢ | `{ claim, sources? }` | true / false / unclear |
| `POST /verdict/link` | 3¢ | `{ url }` | safe / risky / scam / unclear |
| `POST /verdict/token` | 5¢ | `{ address, chain? }` | safe / risky / scam / unclear |
| `GET /verdict/:kind/terms` | free | | x402 payment terms |
| `GET /stats` | free | | calls and earnings |

## How a call works

1. Agent calls an endpoint with no payment, gets **402** with Kite x402 terms.
2. Agent's Kite Passport pays and resends with `X-PAYMENT`.
3. We verify and settle through the Pieverse facilitator.
4. We fetch evidence (page text, sources, DexScreener data).
5. **SERV Reasoning** decides, with Prompt Guard and Shadow Agent on. Low-confidence cases retry with **Multipath**.
6. Our code checks every quoted reason really exists in the evidence. No verified quote, no confident verdict.
7. A receipt is logged.

## Run it

```bash
npm install
cp .env.example .env   # add SERV_API_KEY
npm run dev
npm run demo -- https://some-shop.example
```

Start with `PAYMENTS_MODE=off`, switch to `on` once your Kite wallet is set up.

## Example response

```json
{
  "verdict": "scam",
  "confidence": 0.86,
  "summary": "Brand store on an unrelated domain asking for crypto to a personal wallet.",
  "reasons": [{ "point": "Payment only in USDT to a wallet", "quote": "send USDT to 0x..." }],
  "injection_detected": true,
  "checks": { "quotes_verified": 3, "quotes_dropped": 0 },
  "receipt": "..."
}
```
