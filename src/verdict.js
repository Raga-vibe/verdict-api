import { askServ } from "./serv.js";
import { PROMPTS } from "./prompts.js";
import { scanInjection } from "./injection.js";
import { VERDICT_STAGES } from "./states.js";

const ALLOWED = {
  claim: ["true", "false", "unclear"],
  link: ["safe", "risky", "scam", "unclear"],
  token: ["safe", "risky", "scam", "unclear"],
};

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch {
      return null;
    }
  }
}

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

// Code check: SERV must not invent evidence. Drop reasons whose quote is not in the evidence.
function checkQuotes(result, evidence) {
  const ev = norm(evidence);
  const kept = [];
  const dropped = [];
  for (const r of result.reasons || []) {
    if (r?.quote && ev.includes(norm(r.quote))) kept.push(r);
    else dropped.push(r);
  }
  return { kept, dropped };
}

export async function runVerdict(kind, evidence, { rawHtml = "", stages = [] } = {}) {
  // The stages this call actually walks, in order. They are returned in
  // `checks.stages` so the verdict explains itself; the verdict, the
  // confidence, and the reasons are decided exactly as before.
  const trace = [...stages];
  const injection = kind === "link" ? scanInjection(rawHtml) : { found: false, snippets: [] };
  if (kind === "link") trace.push("scanning");
  if (injection.found) {
    evidence += `\nINJECTION SCANNER SNIPPETS:\n${injection.snippets.map((snippet) => `- ${snippet}`).join("\n")}`;
  }
  const system = PROMPTS[kind];
  const user = `EVIDENCE:\n"""\n${evidence}\n"""`;

  trace.push("serv_first");
  let first = await askServ({ system, user });
  let result = parse(first.text);
  let model = first.model;

  // Hard case: retry with the hard SERV model if unparseable or low
  // confidence. The retry must never fail the whole call: if the hard
  // model name is wrong or the call errors, keep the first result.
  if (!result || (typeof result.confidence === "number" && result.confidence < 0.6)) {
    trace.push("serv_retry");
    try {
      const second = await askServ({ system, user, hard: true });
      const r2 = parse(second.text);
      if (r2) {
        result = r2;
        model = second.model;
      }
    } catch (e) {
      console.error(`[Verdict] hard-model retry failed, keeping first result: ${e.message}`);
    }
  }

  result ??= { verdict: "unclear", confidence: 0, summary: "Model output could not be parsed.", reasons: [] };
  trace.push("checking_quotes");
  const { kept, dropped } = checkQuotes(result, evidence);
  let verdict = ALLOWED[kind].includes(result.verdict) ? result.verdict : "unclear";
  let confidence = Number(result.confidence) || 0.5;
  let reasons = kept;

  if (injection.found) {
    const scannerReasons = injection.snippets.map((snippet) => ({ point: "Hidden or instruction-like text was detected in the page HTML.", quote: snippet }));
    const checkedScannerReasons = checkQuotes({ reasons: scannerReasons }, evidence).kept;
    reasons = [...kept, ...checkedScannerReasons];
    if (verdict === "safe" || verdict === "unclear") {
      trace.push("injection_override");
      verdict = "risky";
      confidence = Math.max(confidence, 0.7);
    }
  }

  // No verified evidence = no confident verdict
  if (reasons.length === 0 && verdict !== "unclear") {
    trace.push("no_evidence_override");
    verdict = "unclear";
    confidence = Math.min(confidence, 0.3);
  }

  // Guard: a misspelled stage name is a programming error, not a verdict.
  for (const s of trace) if (!VERDICT_STAGES[s]) throw new Error(`Unknown verdict stage: ${s}`);
  trace.push("done");
  return {
    verdict,
    confidence,
    summary: result.summary || "",
    reasons,
    injection_detected: injection.found || Boolean(result.injection_detected),
    checks: { quotes_verified: reasons.length, quotes_dropped: dropped.length, stages: trace },
    model,
  };
}
