import fs from "node:fs";
import crypto from "node:crypto";

const FILE = new URL("../data/receipts.jsonl", import.meta.url);

export function logReceipt(entry) {
  const receipt = { id: crypto.randomUUID(), at: new Date().toISOString(), ...entry };
  fs.appendFileSync(FILE, JSON.stringify(receipt) + "\n");
  return receipt.id;
}

export function readReceipts() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
