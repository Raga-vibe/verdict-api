# Verdict API

**A paid second opinion for AI agents.** Before an agent buys, signs up, or trades, it asks Verdict API "is this safe?", pays a few cents over x402 on Kite, and gets a clear verdict with quoted evidence.

Built for OpenServ SERV Hackathon Edition 02 (Kite track).

## Endpoints

Version 1 lives under `/v1/`. The unversioned `/verdict/...` paths still work for existing clients; new clients should use `/v1/`.

| Endpoint | Price | Input | Verdicts |
|---|---|---|---|
| `POST /v1/verdict/claim` | 2¢ | `{ claim, sources? }` | true / false / unclear |
| `POST /v1/verdict/link` | 3¢ | `{ url }` | safe / risky / scam / unclear |
| `POST /v1/verdict/token` | 5¢ | `{ address, chain? }` | safe / risky / scam / unclear |
| `GET /v1/verdict/:kind/terms` | free | | x402 payment terms |
| `GET /health` | free | | `{ status, version, payments, timestamp }` |
| `GET /openapi.json` | free | | OpenAPI 3.0 spec, generated from the live config |
| `GET /stats` | free | `?limit=` (default 10, max 50), `?offset=` | calls and earnings |
| `GET /dashboard` | free | | earnings dashboard (KPI cards, calls by endpoint, verdict mix, recent verdicts as cards with the SERV reason, filters, Pause updates) |
| `GET /` | free | | landing page for browsers, JSON for API clients |

## API details

- **Errors** always come back as `{ "error": "<human message>", "code": "<MACHINE_CODE>" }`, with an extra `detail` on failures and `path` on 404s. Codes: `VALIDATION_ERROR` (400), `UNKNOWN_KIND` (404), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405, with an `Allow: POST` header), `VERDICT_FAILED` (500), `INTERNAL_ERROR` (500). A `GET` on a POST-only verdict path is a 405, never an HTML error page.
- **Versioning:** breaking changes go under a new `/vN/` prefix; the current paths are v1 (`"version": "1.0.0"` in `GET /` and `/health`).
- **Pagination:** `/stats` pages recent verdicts with `?limit=` and `?offset=`, newest first, and returns `limit`, `offset` and `total`.
- **Rate limiting:** the paid verdict endpoints are payment-gated, which is the limit that matters: every call costs 2-5¢. The free read endpoints (`/health`, `/stats`, `/openapi.json`, terms) are unmetered on the free tier.
- **Idempotency:** not yet implemented. A retried call is a new paid call, so agents should retry only on network errors, never after a 200. The x402 payment signature itself is single-use per the facilitator.

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

Open `http://localhost:3000/` in a browser for the landing page (pricing, how it works, free payment-terms try-it), and watch earnings at `GET /dashboard` (KPI cards, calls by endpoint, verdict mix, recent verdicts with the SERV reason, filters, Pause updates). It refreshes every 3 seconds unless paused. Note: receipts live on the server and reset when Render redeploys or restarts the free instance.

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
