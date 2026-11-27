# Verdict API on Celo

**A paid second opinion for AI agents.** Before an agent buys, signs up, or trades, it asks Verdict API "is this safe?", pays a few cents over x402 on Celo, and gets a clear verdict with quoted evidence.

Built for Loops House: Agents Open for Business. Two tracks, one build: Track 3 Self Agent ID, and Track 1 Stablecoin Corridors with cNGN.

The OpenServ Kite version lives on `master` and is untouched by this branch. Do not merge this branch into `master`.

## The problem

Agents are starting to spend real money on their own. They buy, sign up, and trade, but they have no reliable way to check if a claim, link, or token is safe before they pay.

Existing checks are either free and unverified, or they give an answer with no evidence to check. An agent that cannot prove its answer is not trustworthy with money.

## The solution

Verdict API is a pay-per-call check. An agent pays 2 to 5 cents in USDC, or the cNGN equivalent on mainnet, and gets a verdict with quotes taken directly from the evidence.

Every quote is verified in code against the source. No verified quote, no confident verdict. Injection-like text in a page is flagged, never acted on.

## How it works

1. A verified agent calls `POST /v1/verdict/claim` with no payment, and gets a 402 with Celo x402 terms.
2. The agent pays over x402 on Celo. The Celo facilitator verifies and settles it.
3. SERV Reasoning decides, with Prompt Guard on. Our code checks every quoted reason really exists in the evidence.
4. A receipt is logged, with the verdict, confidence, verified quotes, and any injection flag.

For Track 3, the claim endpoint is gated by Self Agent ID when `SELF_VERIFY=on`. Only agents verified by Self reach the payment step, so an unverified agent is never charged.

For Track 1, earnings in cNGN are swept to USDT through Textile FX, and USDT earnings are converted to cNGN to pay a named user. The sweep is batched, never per 2 cent call, and it is dry-run by default.

## Endpoints

| Endpoint | Price | Input | Verdicts |
|---|---|---|---|
| `POST /v1/verdict/claim` | 2c USDC, or 30 cNGN on mainnet | `{ claim, sources? }` | true / false / unclear |
| `POST /v1/verdict/link` | 3c USDC, or 45 cNGN on mainnet | `{ url }` | safe / risky / scam / unclear |
| `POST /v1/verdict/token` | 5c USDC, or 75 cNGN on mainnet | `{ address, chain? }` | safe / risky / scam / unclear |
| `GET /v1/verdict/:kind/terms` | free | | x402 payment terms |
| `GET /health` | free | | status, network, asset, Self status |
| `GET /stats` | free | | calls and earnings |
| `GET /dashboard` | free | | earnings dashboard |

Errors always come back as `{ "error": "<human message>", "code": "<MACHINE_CODE>" }`. A 402 is `PAYMENT_REQUIRED` and carries the full x402 terms. A 503 means the reasoning service is not configured, so no verdict can run and no payment was taken.

## Architecture

```
Agent -> Self gate (claim only, when on) -> x402 payment (Celo facilitator)
  -> evidence fetch -> SERV Reasoning -> quote verification in code
  -> receipt log -> verdict
```

- `src/payment.js`: Celo x402 seller flow, USDC and cNGN options, builder-code extension.
- `src/self.js`: Self Agent ID gate, behind `SELF_VERIFY`.
- `src/verdict.js`: SERV call, quote verification, injection override.
- `src/injection.js`: instruction-like text scan, PDF and page text is data only.
- `src/attribution.js`: ERC-8021 attribution, declared in 402 terms, appended to Textile swaps.
- `src/textile.js` and `scripts/textile-sweep.js`: cNGN to USDT sweep, dry-run by default.
- `demo/celo-buyer.js`: verified-agent buyer, USDC on Celo Sepolia.

## Live demo

There is no live Celo deployment yet. The live deployment at https://verdict-api-t50q.onrender.com is the Kite version on `master`, not this branch.

To see the Celo flow, run it on Celo Sepolia locally, or run the demo buyer:

```bash
npm run dev
node demo/celo-buyer.js
```

A recorded demo video will be linked here once it is recorded. The demo shows an agent registering, signing, paying, and getting a verdict.

## Evidence

- Automated tests: `npm test` runs unit tests for payment terms, attribution, the Self gate, and injection scanning, with no key and no network needed.
- Eval: `npm run eval` runs 6 fixture pages through the live server, honest, scam, and injected, and reports pass or fail per page.
- Real transaction IDs: paid Sepolia and mainnet calls will be listed here with Celoscan and Blockscout links, once they exist. No paid mainnet call has happened yet.
- Attribution: x402 settlements declare our builder code in the 402 response. Textile swaps append the same code to the calldata.
- AskBots round 1 review: https://github.com/Raga-vibe/verdict-api/issues/1, score 4.6/10. It reviewed `master`, not this branch. This README and the test command below address its points.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Set `SERV_API_KEY` in `.env` for real verdicts. Start with `PAYMENTS_MODE=off` for a free run.

Paid run on Celo Sepolia:

```bash
# in .env
PAYMENTS_MODE=on
X402_NETWORK=eip155:11142220
PAY_TO=0xYourWalletAddress
X402_API_KEY=your_key_from_https://x402.celo.org
```

Then run the demo buyer with a funded Sepolia key. See `demo/celo-buyer.js` for the full steps.

For Self, set `SELF_VERIFY=on` and `AGENT_PRIVATE_KEY` from a registered agent. Registration is a human step in the Self app on a phone. See `demo/celo-buyer.js` for the commands.

## Tests

```bash
npm test
npm run eval
```

`npm test` needs no key and no network. `npm run eval` needs a running server with `SERV_API_KEY` set, and `PAYMENTS_MODE=off`.

## Live versus simulated

| Feature | Status | Evidence |
|---|---|---|
| Watch and verdict on Celo Sepolia, USDC | Live in code | `src/payment.js`, demo buyer |
| Self Agent ID gate | Live in code, off by default | `src/self.js`, `SELF_VERIFY=off` |
| cNGN payments on mainnet | Live in code, not yet paid live | `src/payment.js`, Permit2 option |
| Textile FX sweep, cNGN to USDT | Live in code, dry-run by default | `scripts/textile-sweep.js` |
| Quote verification in code | Live | `src/verdict.js`, tests |
| Injection scan | Live | `src/injection.js`, tests |
| ERC-8004 registration | Not done yet | See below |
| Live Celo deployment | Not built yet | No Render URL for Celo yet |
| Real mainnet paid call | Not done yet | No tx link yet |

## Limitations

- No live Celo deployment yet. The Celo flow is tested locally on Sepolia.
- ERC-8004 registration is done. Agent ID 10163 on Celo mainnet, registered Nov 27, 2026. Identity Registry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432. Registry tx link to be added.
- cNGN is mainnet only. There is no Sepolia cNGN in the x402 token table, so Sepolia offers USDC only.
- Prices in cNGN are a fixed assumption, 30 / 45 / 75 cNGN for 2c / 3c / 5c at about 1500 NGN per USD. Re-check the rate before mainnet.
- Textile FX testnets are BSC testnet and Base Sepolia only. There is no Textile settlement contract on Celo Sepolia.
- The x402 facilitator needs `X402_API_KEY`. Without it, settlement returns 401.
- Receipts live on the server and reset when Render redeploys or restarts.

## What was built during the hackathon

Build start: 20 Nov 2026, for Loops House: Agents Open for Business.

Built during the hackathon on the `celo` branch:
- Celo x402 payments in USDC on Sepolia and mainnet, plus cNGN Permit2 on mainnet
- Self Agent ID gate on `POST /v1/verdict/claim`, behind `SELF_VERIFY`
- ERC-8021 attribution, declared in 402 terms and appended to Textile swaps
- Textile FX sweep for cNGN to USDT, dry-run by default
- Quote verification in code, injection scan, JSON receipts
- Demo buyer, eval, and automated tests

Reused from the OpenServ entry on `master`:
- SERV Reasoning verdict logic, Prompt Guard, quote checking, dashboard
- Kite x402 payments on `master`, untouched by this branch

## Celo addresses and prices

| Asset | Network | Address |
|---|---|---|
| USDC | Celo Sepolia `eip155:11142220` | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |
| USDC | Celo mainnet `eip155:42220` | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| cNGN | Celo mainnet `eip155:42220` | `0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f` |
| USDT | Celo mainnet `eip155:42220` | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |

Facilitator: Sepolia `https://api.x402.sepolia.celo.org`, mainnet `https://api.x402.celo.org`.

Self registry: mainnet `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944`, Sepolia `0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379`.

Attribution code: `celo_2d4c610c6d49`, assigned by Loops House. Set `ATTRIBUTION_CODE` to override it.

## Roadmap

- ERC-8004 registration done, agent ID 10163. Add the registry tx link here.
- First paid Sepolia call, then a small paid mainnet call, with tx links in Evidence.
- First tagged Textile FX conversion on mainnet, plus a cNGN payment to a named user outside the team.
- Live Celo deployment on a separate Render service, never the OpenServ one.
- Demo video: agent registers, signs, pays, gets a verdict.

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
