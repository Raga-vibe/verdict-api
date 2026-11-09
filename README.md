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
| `GET /dashboard` | free | | earnings dashboard (total calls, earned, calls by endpoint, verdict mix, last 10 verdicts with explorer links) |
| `GET /` | free | | landing page for browsers, JSON for API clients |

## How a call works

1. Agent calls an endpoint with no payment, gets **402** with Kite x402 terms.
2. Agent's Kite Passport pays and resends with a `PAYMENT-SIGNATURE` header (x402 v2).
3. We verify and settle through the Pieverse facilitator.
4. We fetch evidence (page text, sources, DexScreener data).
5. **SERV Reasoning** decides, with Prompt Guard and Shadow Agent on. Low-confidence cases retry with the hard SERV model (`SERV_HARD_MODEL`); if that retry fails, the first result is kept instead of failing the call.
6. Our code checks every quoted reason really exists in the evidence. No verified quote, no confident verdict.
7. A receipt is logged.

## Run it

```bash
npm install
cp .env.example .env   # add SERV_API_KEY
npm run dev            # terminal 1, PAYMENTS_MODE=off for a free run
npm run fixtures       # terminal 2, serves tests/fixtures on :4000
npm run demo           # terminal 3, shopping agent: scam page refused, honest page proceeds
```

Start with `PAYMENTS_MODE=off`, switch to `on` once your Kite wallet is set up. With payments on, the demo needs a funded testnet buyer key (`BUYER_PRIVATE_KEY` in the ignored local `.env`); it pays 3¢ per check and refuses to sign more than 5¢ per call.

Paid run against the live API instead: `VERDICT_URL=https://verdict-api-t50q.onrender.com SCAM_URL=https://<public-scam-page> HONEST_URL=https://<public-honest-page> npm run demo`.

Open `http://localhost:3000/` in a browser for the landing page (pricing, how it works, free payment-terms try-it), and watch earnings at `GET /dashboard` (total calls, cents earned, calls by endpoint, verdict mix, last 10 verdicts with Kite testnet explorer links). It refreshes every 3 seconds. Note: receipts live on the server and reset when Render redeploys or restarts the free instance.

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
