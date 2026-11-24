// ERC-8021 attribution tags (Celo).
//
// A tag is a small suffix appended to a transaction's calldata. The EVM
// discards trailing bytes, so it never changes execution semantics; it
// just makes the transaction identifiable as having come through this
// app, so on-chain activity can be credited back to us.
//
// Two places a tag travels, and they are different:
//   - x402 settlements: the facilitator submits the transaction, not
//     us, so we cannot append a suffix ourselves. The 402 response
//     declares our code under extensions["builder-code"].info.a (see
//     src/payment.js, declareBuilderCodeExtension). x402 payments do
//     not carry tags yet; sellers also register their PayTo address
//     at sign-up instead.
//   - Transactions we send ourselves (Textile FX swaps): append the
//     suffix to the calldata before broadcasting. For Textile, append
//     our tag to transactions.swap.data before sending; if a Textile
//     API key is used, leave includeAttribution off so our tag is the
//     only one (do not append a second suffix: indexers read only
//     the last tag).
//
// The code is ATTRIBUTION_CODE, default "verdict_api". If Loops / Celo
// issues an assigned code (celo_xxxxxxxx), set ATTRIBUTION_CODE to
// that assigned code; programs only credit the assigned code.
import { toDataSuffix, fromDataSuffix } from "@celo/attribution-tags";
import { config } from "./config.js";

export function attributionCode() {
  return config.attributionCode;
}

// Hex suffix (0x-prefixed) for our code, Schema 0.
export function attributionSuffix() {
  return toDataSuffix(config.attributionCode);
}

// Append our tag to hex calldata (0x-prefixed). Returns the tagged
// calldata. Idempotent for an already-tagged tail: toDataSuffix merges
// codes into one suffix, so calling this twice does not stack tags.
export function appendAttribution(calldata) {
  if (!calldata || typeof calldata !== "string") throw new Error("appendAttribution needs hex calldata");
  const data = calldata.startsWith("0x") ? calldata : `0x${calldata}`;
  const suffix = attributionSuffix();
  if (data.toLowerCase().endsWith(suffix.slice(2).toLowerCase())) return data;
  return data + suffix.slice(2);
}

// Decode a suffix back to its codes, for tests / verification.
// Returns null when the input is not a tagged suffix.
export function decodeAttribution(suffix) {
  return fromDataSuffix(suffix);
}
