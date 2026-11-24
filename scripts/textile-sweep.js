// Textile FX sweep CLI (Track 1: Stablecoin Corridors, cNGN).
//
// Usage:
//   # Dry-run (default): preview a cNGN -> USDT quote, move nothing.
//   node scripts/textile-sweep.js --direction cngn-to-usdt --sell-amount 2000000000 --taker 0xYourWallet
//
//   # Real swap: only with TEXTILE_SWEEP=live, a live TEXTILE_API_KEY,
//   # a funded taker wallet (SWEEP_PRIVATE_KEY, local .env only, never
//   # commit it), and an explicit --execute flag. Without --execute
//   # this script stops after printing the unsigned transactions.
//   TEXTILE_SWEEP=live TEXTILE_API_KEY=tx_live_... SWEEP_PRIVATE_KEY=0x... \
//     node scripts/textile-sweep.js --direction cngn-to-usdt \
//       --sell-amount 2000000000 --taker 0xYourWallet --execute
//
// Amounts are strings in atomic units (6 decimals for cNGN and USDT
// on Celo). 2000000000 = 2000 cNGN, the default minimum sweep.
// --sell-amount is required. --taker is the wallet that holds the
// sell token and broadcasts; it must match SWEEP_PRIVATE_KEY when
// --execute is used.
//
// Flow for a live run:
//   1. Request a firm quote (makers answer, 60s TTL, bound to taker).
//   2. Re-check expiresAt before sending anything; a dead quote is
//      discarded and a new one requested instead of broadcast.
//   3. Send the approval tx first (skip if standing allowance already
//      covers takerPays), then broadcast transactions.swap exactly as
//      returned, with our ERC-8021 tag appended to swap.data.
//      Always broadcast transactions.swap, never the top-level
//      encodedOrder alone: when makers split the fill, swap is an
//      executeBatch over every signed order.
//   4. Report the tx hash with /v2/rfq/{id}/submit.
//
// Never run --execute on mainnet as a first test: test the full flow
// on BSC testnet 97 first (TEXTILE_CHAIN=97, tx_test_ key, test cNGN).
// Celo Sepolia has no Textile settlement contract, so it cannot be
// used for a Textile test.
import "dotenv/config";
import { config } from "../src/config.js";
import { requestQuote, submitQuote, tagSwapData, sweepQuote, TEXTILE_CHAIN_CELO } from "../src/textile.js";
import { attributionCode } from "../src/attribution.js";
import { createWalletClient, http } from "viem";
import { celo, bscTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const hasFlag = (name) => process.argv.includes(name);

const direction = arg("--direction", "cngn-to-usdt");
const sellAmount = arg("--sell-amount");
const taker = arg("--taker", process.env.PAY_TO || "");
const execute = hasFlag("--execute");

if (!["cngn-to-usdt", "usdt-to-cngn"].includes(direction)) {
  console.error(`Unknown --direction ${direction}. Use cngn-to-usdt or usdt-to-cngn.`);
  process.exit(1);
}
if (!sellAmount || !/^\d+$/.test(sellAmount)) {
  console.error("Usage: node scripts/textile-sweep.js --direction cngn-to-usdt --sell-amount <atomic units> --taker 0xYourWallet [--execute]");
  process.exit(1);
}
if (!taker) {
  console.error("Set --taker 0xYourWallet (or PAY_TO in .env). The taker must already hold the sell token.");
  process.exit(1);
}

console.log(`Textile sweep: ${direction}, sell ${sellAmount} atomic units, chain ${config.textile.chainId}, taker ${taker}`);
console.log(`Attribution code: ${attributionCode()}`);
console.log(`Mode: ${config.textile.sweep}${execute ? " + --execute" : " (dry-run default)"}`);

if (!execute || config.textile.sweep !== "live") {
  const quote = await sweepQuote({ direction, sellAmount, taker });
  console.log(JSON.stringify(quote, null, 2));
  if (execute && config.textile.sweep !== "live") {
    console.log("\n--execute was passed but TEXTILE_SWEEP is not 'live'. Nothing was broadcast. Set TEXTILE_SWEEP=live for a real swap.");
  }
  process.exit(0);
}

// --- Live path: explicit --execute + TEXTILE_SWEEP=live only. ---
const rawKey = (process.env.SWEEP_PRIVATE_KEY || "").trim();
if (!/^0x[0-9a-f]{64}$/i.test(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`)) {
  console.error("Live swap needs SWEEP_PRIVATE_KEY in the local .env (a funded taker key). Never commit it or paste it into chat.");
  process.exit(1);
}
const account = privateKeyToAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);
if (account.address.toLowerCase() !== taker.toLowerCase()) {
  console.error(`SWEEP_PRIVATE_KEY belongs to ${account.address}, not the taker ${taker}. Refusing to broadcast a quote bound to another wallet.`);
  process.exit(1);
}
if (!config.textile.apiKey) {
  console.error("Live swap needs TEXTILE_API_KEY (a live key for mainnet, tx_test_ for BSC testnet).");
  process.exit(1);
}

const chain = config.textile.chainId === TEXTILE_CHAIN_CELO ? celo : bscTestnet;
const rpcUrl = config.textile.chainId === TEXTILE_CHAIN_CELO
  ? "https://forno.celo.org"
  : "https://data-seed-prebsc-1-s1.binance.org:8545";
const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
// Attribution is applied once, manually, to swap.data below via
// tagSwapData(). The wallet is NOT extended with withAttribution as
// well: one tag only, indexers read only the last tag.

const firm = await requestQuote({ chainId: config.textile.chainId, sellToken: direction === "cngn-to-usdt" ? (config.textile.chainId === TEXTILE_CHAIN_CELO ? "0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f" : "0x8a078b182bA9649c03982c2a80CDcc81cdc99dA8") : (config.textile.chainId === TEXTILE_CHAIN_CELO ? "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" : "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"), buyToken: direction === "cngn-to-usdt" ? (config.textile.chainId === TEXTILE_CHAIN_CELO ? "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" : "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd") : (config.textile.chainId === TEXTILE_CHAIN_CELO ? "0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f" : "0x8a078b182bA9649c03982c2a80CDcc81cdc99dA8"), sellAmount, taker });
console.log(`Firm quote: takerPays ${firm.quote.takerPays}, buyAmount ${firm.quote.buyAmount}, expiresAt ${firm.quote.expiresAt}, rfqId ${firm.rfqId}`);

// Re-check the clock before sending. A slow approval can push past
// expiresAt; a dead quote is discarded, never broadcast.
function quoteAlive() {
  return Date.now() < Number(firm.quote.expiresAt) - 5000;
}
if (!quoteAlive()) {
  console.error("Quote already expired before broadcast. Request a new quote instead of broadcasting a dead one.");
  process.exit(1);
}

const swap = firm.transactions?.swap;
const approval = firm.transactions?.approval;
if (!swap?.to || !swap?.data) {
  console.error("Firm quote returned no swap transaction. Nothing broadcast.");
  process.exit(1);
}
// Approve takerPays (skip if standing allowance already covers it:
// this script always sends the approval when present, because the
// allowance state is not read here; a redundant approve is harmless
// but costs gas, so check allowance manually for repeated sweeps).
if (approval?.to && approval?.data) {
  if (!quoteAlive()) { console.error("Quote expired during approval step. Aborting."); process.exit(1); }
  const approveHash = await wallet.sendTransaction({ to: approval.to, data: approval.data, value: 0n });
  console.log(`Approval tx: ${approveHash}`);
}
if (!quoteAlive()) { console.error("Quote expired before the swap. Aborting."); process.exit(1); }

// Append our ERC-8021 tag to swap.data (once, here only).
const taggedSwapData = tagSwapData(swap.data);
const swapHash = await wallet.sendTransaction({ to: swap.to, data: taggedSwapData, value: 0n });
console.log(`Swap tx: ${swapHash}`);
console.log(`Celoscan: https://celoscan.io/tx/${swapHash}`);
try {
  await submitQuote(firm.rfqId, firm.claimToken, swapHash);
  console.log("Reported tx hash to Textile.");
} catch (error) {
  console.log(`Textile /submit failed (settlement is reconciled from the chain either way): ${String(error?.message || error)}`);
}
