# Verdict API

**A paid second opinion for AI agents.** Before an agent buys, signs up, or trades, it asks Verdict API "is this safe?", pays a few cents over x402 on Celo, and gets a clear verdict with quoted evidence.

This is the **`celo` branch**, built for Loops House: Agents Open for Business (deadline Mon Dec 7, 2026, 10:00 WAT / 09:00 GMT, winners Dec 11). The OpenServ SERV Hackathon Edition 02 version lives on **`master`** (x402 on Kite testnet, submitted Nov 12, 2026) and is untouched by this branch. Do not merge `celo` into `master`, and do not point the live Render service at this branch.

## Celo branch: two tracks, one build

**Track 3, Self Agent ID: Verified Agent Payments** (judging: integration 30%, innovation 30%, named user + real job 25%, real use 15%).
`POST /v1/verdict/claim` is gated by Self Agent ID when `SELF_VERIFY=on`: only agents verified by Self (age 18+, OFAC clear, sybil limit 1, Self proof provider) reach the payment step. The gate runs before any payment is requested, so an unverified agent is never charged. The buyer calls with `agent.fetch()`, which adds the three signed Self headers. See `src/self.js` and `demo/celo-buyer.js`.

**Track 1, Stablecoin Corridors (cNGN)** (judging: quality of execution, value proposition, initial traction with tagged onchain activity, named user with a real job done, 25% each).
Verdicts are priced in USDC and, on mainnet, also in cNGN (Permit2). Earnings in cNGN are swept to USDT through Textile FX, and USDT earnings are converted to cNGN to pay a named user outside the team. See `src/textile.js` and `scripts/textile-sweep.js`.

### How the Celo flow works

1. A verified agent calls `POST /v1/verdict/claim` with no payment, gets **402** with Celo x402 terms: USDC (and cNGN on mainnet), price, seller, timeout, plus the ERC-8021 builder-code extension declaring our attribution code.
2. The agent pays over x402 on Celo. The Celo facilitator verifies and settles it. `X402_API_KEY` is sent to the facilitator as `X-API-Key`; without it `/settle` returns 401.
3. SERV Reasoning decides, with Prompt Guard and Shadow Agent on, quotes verified in code, receipt logged.
4. Corridors leg (separate, batched, never per 2c call): accumulated cNGN is converted to USDT on Textile FX with our ERC-8021 tag appended to the swap calldata, and USDT earnings are converted to cNGN to pay the named user. Mainnet corridor floor is $1 of notional; the sweep minimum is 2000 cNGN (about $1.30 at ~1500 NGN/USD).

### Celo addresses and prices

| Asset | Network | Address | Decimals | Transfer |
|---|---|---|---|---|
| USDC | Celo Sepolia `eip155:11142220` | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | 6 | EIP-3009, extra `{ name: "USDC", version: "2" }` |
| USDC | Celo mainnet `eip155:42220` | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | 6 | EIP-3009, extra `{ name: "USDC", version: "2" }` |
| cNGN | Celo mainnet `eip155:42220` | `0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f` | 6 | Permit2, extra `{ name: "cNGN", version: "1", assetTransferMethod: "permit2" }` |
| USDT | Celo mainnet `eip155:42220` | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | 6 | Textile sweep leg |

Prices: claim 2c / link 3c / token 5c in USDC (`$0.01 = "10000"` base units). On mainnet also claim 30 / link 45 / token 75 cNGN, approx 2c / 3c / 5c at ~1500 NGN per USD. That is a fixed-price assumption, not a live FX rate: re-check NGN/USD before mainnet and re-price if it has moved materially. cNGN has no Celo Sepolia deployment in the x402 token table, so on Sepolia only USDC is offered. The first cNGN payer approves Permit2 onchain. Never use the `"$0.01"` price shorthand on Celo: it throws; explicit price objects only.

Facilitator: Sepolia `https://api.x402.sepolia.celo.org`, mainnet `https://api.x402.celo.org`. Source: https://x402.celo.org/skill.md.

Self Agent ID registry (Celo docs): mainnet `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944`, Sepolia `0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379`. Self implements all three ERC-8004 registry roles (identity, reputation, validation) and adds a proof-of-human extension. The reference ERC-8004 registries on Celo are separate contracts, so an agent can be registered in both; for judging, registering in both is the safe option.

Textile FX: cNGN <-> USDT is live on Celo 42220, RFQ API v2 at `https://api.textilecredit.com`. Testnets are BSC testnet 97 and Base Sepolia 84532 only; a test key pointed at Celo Sepolia gets a 400 (no FX settlement contract there), so test the sweep on BSC testnet 97 and do the scored conversion as a small mainnet swap.

Attribution: ERC-8021. x402 settlements are declared in the 402 response under `extensions["builder-code"].info.a` (our code, `ATTRIBUTION_CODE`, default `verdict_api`; if Loops issues an assigned `celo_xxxxxxxx` code, set that instead, programs only credit the assigned code). Transactions we send ourselves (Textile swaps) get the suffix appended to the calldata (`src/attribution.js`, `toDataSuffix`). x402 payments do not carry tags yet, so sellers also register their PayTo address at sign-up.

### Run it on Celo Sepolia

```bash
npm install
cp .env.example .env   # add SERV_API_KEY, PAY_TO; leave PAYMENTS_MODE=off first
npm run dev            # terminal 1, PAYMENTS_MODE=off for a free run
npm run fixtures       # terminal 2, serves tests/fixtures on :4000
npm run demo:celo      # terminal 3, verified-agent claim check (free with payments off)
```

Paid Sepolia run: set `PAYMENTS_MODE=on`, `X402_NETWORK=eip155:11142220`, `PAY_TO` to your Celo Sepolia wallet, and `X402_API_KEY` from https://x402.celo.org (Create API key, sign, copy once; GitHub sign-in for mainnet free credits). The demo buyer needs a funded Sepolia key (`BUYER_PRIVATE_KEY`, test USDC) and, for the Self path, a registered agent key (`AGENT_PRIVATE_KEY`, `SELF_NETWORK=testnet`).

```bash
# Self registration (human step, on a phone):
npx @selfxyz/agent-sdk self-agent register init --mode agent-identity --human-address 0xYourWallet --network testnet
npx @selfxyz/agent-sdk self-agent register open --session .self/session.json
npx @selfxyz/agent-sdk self-agent register wait --session .self/session.json
npx @selfxyz/agent-sdk self-agent register export --session .self/session.json --unsafe --print-private-key
# Scan the QR code in the Self app. Mock documents are accepted on
# testnet; mainnet needs a real passport/ID. Never commit the key.
SELF_VERIFY=on npm run dev
```

```bash
# Textile sweep, dry-run first (quote only, never broadcasts):
node scripts/textile-sweep.js --direction cngn-to-usdt --sell-amount 2000000000 --taker 0xYourWallet
# Test the full flow on BSC testnet 97 first, then a real mainnet swap
# only with TEXTILE_SWEEP=live and --execute (see the script header).
```

Check the terms before paying: `GET /v1/verdict/claim/terms` returns the USDC accept on Sepolia, and USDC + cNGN on mainnet, with the builder-code extension. `GET /health` reports network, asset, `cngn_available`, `self_verify`, and `self_network`.

### Submission checklist (by Sun Dec 6, for the Dec 7 10:00 WAT close)

- [ ] `celo` branch public, README with architecture, contract addresses, tx links on Celoscan / Celo Sepolia Blockscout
- [ ] Real mainnet calls with small USDC, steady trickle of paid verdicts, `/stats` as proof
- [ ] At least one tagged Textile FX conversion on Celo mainnet in the cNGN <-> USDT corridor, used in the product flow, plus a cNGN payment reaching a recipient outside the team
- [ ] Named user with a real job done (a news or crypto-research agent that fact-checks claims before posting)
- [ ] Demo video: agent registers, signs, pays, gets a verdict
- [ ] Follow @Celo and @CeloDevs, post the launch on X
- [ ] AskBots review round Dec 4: fix whatever it flags

### Blocked on Qeeb (human-only, no code can do these)

- `X402_API_KEY` from https://x402.celo.org (mainnet free credits need GitHub sign-in on the key)
- Self passport registration in the Self app on his phone (mock on testnet, real passport on mainnet)
- A named user outside the team, plus their Celo wallet, for the cNGN payout
- A Textile live API key, and small mainnet funds for the conversion test (mainnet floor $1)
- Follow @Celo and @CeloDevs on X
- The Nov 24 Self livestream (15:00 WAT) and the Dec 1 Stablecoin Corridors livestream (15:00 WAT)

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

- **Errors** always come back as `{ "error": "<human message>", "code": "<MACHINE_CODE>" }`, with an extra `detail` on failures and `path` on 404s. Codes: `VALIDATION_ERROR` (400), `UNKNOWN_KIND` (404), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405, with an `Allow: POST` header), `VERDICT_FAILED` (500), `INTERNAL_ERROR` (500). A 402 is `PAYMENT_REQUIRED`: the body carries the full x402 terms (price, network, asset, pay-to) plus a human-readable hint, and the same terms are in the `payment-required` header, so both curl users and x402 clients can pay from the one response. A 402 can also be `PAYMENT_FAILED` when a signed payment is rejected by the facilitator (for example `insufficient_funds`); the body names the reason instead of coming back empty. A 503 is `SERVICE_UNAVAILABLE`: the reasoning service (SERV) is not configured, so no verdict can run and no payment was taken. A `GET` on a POST-only verdict path is a 405, never an HTML error page.
- **Versioning:** breaking changes go under a new `/vN/` prefix; the current paths are v1 (`"version": "1.0.0"` in `GET /` and `/health`).
- **Pagination:** `/stats` pages recent verdicts with `?limit=` and `?offset=`, newest first, and returns `limit`, `offset` and `total`.
- **Rate limiting:** the paid verdict endpoints are payment-gated, which is the limit that matters: every call costs 2-5¢. The free read endpoints (`/health`, `/stats`, `/openapi.json`, terms) are unmetered on the free tier.
- **Idempotency:** not yet implemented. A retried call is a new paid call, so agents should retry only on network errors, never after a 200. The x402 payment signature itself is single-use per the facilitator.

## How a call works

1. Agent calls an endpoint with no payment, gets **402** with Celo x402 terms (USDC, or cNGN on mainnet).
2. The agent pays and resends with a `PAYMENT-SIGNATURE` header (x402 v2).
3. We verify and settle through the Celo x402 facilitator.
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

Start with `PAYMENTS_MODE=off`, switch to `on` once your Celo wallet is set up. With payments on, the demo needs a funded testnet buyer key (`BUYER_PRIVATE_KEY` in the ignored local `.env`); it pays 3¢ per check and refuses to sign more than 5¢ per call.

Paid run against the live Kite API instead (master only): `VERDICT_URL=https://verdict-api-t50q.onrender.com SCAM_URL=https://<public-scam-page> HONEST_URL=https://<public-honest-page> npm run demo`. This branch has no live Celo deployment yet; a live Celo demo gets its own separate Render service and URL, never the OpenServ one.

Open `http://localhost:3000/` in a browser for the landing page (pricing, how it works, a free payment-terms try-it, and a wallet try-it that runs a real 3&cent; link check in the browser with no terminal), and watch earnings at `GET /dashboard` (KPI cards, calls by endpoint, verdict mix, recent verdicts with the SERV reason, filters, Pause updates). It refreshes every 3 seconds unless paused. Note: receipts live on the server and reset when Render redeploys or restarts the free instance.

## Example response

```json
{
  "verdict": "scam",
  "confidence": 0.86,
  "summary": "Brand store on an unrelated domain asking for crypto to a personal wallet.",
  "reasons": [{ "point": "Payment only in USDT to a wallet", "quote": "send USDT to 0x..." }],
  "injection_detected": true,
  "checks": { "quotes_verified": 3, "quotes_dropped": 0, "stages": ["fetching_evidence", "scanning", "serv_first", "checking_quotes", "injection_override"] },
  "receipt": "..."
}
```
