// Demo buyer agent. With PAYMENTS_MODE=off it calls directly.
// With payments on, run the same calls through kpass so the agent pays (see PROMPTS.md step 6).
const BASE = process.env.VERDICT_URL || "http://localhost:3000";

async function ask(kind, body) {
  const res = await fetch(`${BASE}/verdict/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  console.log(`\n=== ${kind.toUpperCase()} (${res.status}) ===`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

const shoppingDecision = async (url) => {
  console.log(`Shopping agent: about to buy from ${url}. Asking Verdict API first...`);
  const v = await ask("link", { url });
  if (v.verdict === "safe") console.log("Agent: verdict safe, proceeding to checkout.");
  else console.log(`Agent: verdict ${v.verdict}. Not buying.`);
};

await shoppingDecision(process.argv[2] || "https://example.com");
await ask("claim", { claim: "Example Domain is reserved for use in documentation.", sources: ["https://example.com"] });
