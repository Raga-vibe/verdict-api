import fs from "node:fs";
import crypto from "node:crypto";

const FILE = new URL("../data/receipts.jsonl", import.meta.url);

export function logReceipt(entry) {
  const receipt = { id: crypto.randomUUID(), at: new Date().toISOString(), ...entry };
  fs.appendFileSync(FILE, JSON.stringify(receipt) + "\n");
  return receipt.id;
}

export function updateReceipt(id, patch) {
  if (!fs.existsSync(FILE)) return false;
  const lines = fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean);
  let found = false;
  const out = lines.map((l) => {
    let entry;
    try { entry = JSON.parse(l); } catch { return l; }
    if (entry.id === id) { found = true; return JSON.stringify({ ...entry, ...patch }); }
    return l;
  });
  if (!found) return false;
  fs.writeFileSync(FILE, out.join("\n") + "\n");
  return true;
}

export function readReceipts() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
