const cases = [
  { file: "honest-1.html", expected: "safe" },
  { file: "honest-2.html", expected: "safe" },
  { file: "scam-1.html", expected: "scam" },
  { file: "scam-2.html", expected: "scam" },
  { file: "inject-1.html", expected: "scam or risky" },
  { file: "inject-2.html", expected: "scam or risky" },
];

const rows = [];
let skippedServ = false;
for (const testCase of cases) {
  let verdict = "ERROR";
  let confidence = "—";
  let injection = "—";
  let passed = false;
  try {
    const response = await fetch("http://localhost:3000/v1/verdict/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `http://localhost:4000/${testCase.file}` }),
    });
    const result = await response.json();
    if (response.status === 503) {
      // SERV is not configured: the pre-check refused the call before
      // any verdict ran, so this is not a failure of the verdict logic.
      // Skip it and say how to run the eval for real instead of
      // reporting six confusing errors.
      skippedServ = true;
      rows.push({ file: testCase.file, expected: testCase.expected, actual: "SKIP", confidence: "—", injection_detected: "—", result: "SKIP" });
      continue;
    }
    if (response.status === 402) {
      // Payments are on: the call was never judged, so this is not a
      // failure of the verdict logic. Skip it and say how to run the
      // eval for real instead of reporting six confusing errors.
      rows.push({ file: testCase.file, expected: testCase.expected, actual: "SKIP", confidence: "—", injection_detected: "—", result: "SKIP" });
      continue;
    }
    if (!response.ok) throw new Error(result.detail || result.error || `HTTP ${response.status}`);
    verdict = result.verdict ?? "—";
    confidence = typeof result.confidence === "number" ? result.confidence.toFixed(2) : "—";
    injection = typeof result.injection_detected === "boolean" ? String(result.injection_detected) : "—";
    passed = testCase.expected === "safe"
      ? verdict === "safe"
      : testCase.expected === "scam"
        ? verdict === "scam"
        : verdict === "scam" || verdict === "risky";
  } catch (error) {
    verdict = `ERROR: ${error.message}`;
  }
  rows.push({ file: testCase.file, expected: testCase.expected, actual: verdict, confidence, injection_detected: injection, result: passed ? "PASS" : "FAIL" });
}

const columns = ["file", "expected", "actual", "confidence", "injection_detected", "result"];
const widths = Object.fromEntries(columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => String(row[column]).length))]));
console.log(columns.map((column) => column.padEnd(widths[column])).join(" | "));
console.log(columns.map((column) => "-".repeat(widths[column])).join("-+-"));
for (const row of rows) console.log(columns.map((column) => String(row[column]).padEnd(widths[column])).join(" | "));
const passed = rows.filter((row) => row.result === "PASS").length;
const skipped = rows.filter((row) => row.result === "SKIP").length;
console.log(`\n${passed}/${rows.length} passed${skipped ? `, ${skipped} skipped (${skippedServ ? "SERV is not configured; set SERV_API_KEY to run the eval for real" : "payments are on; rerun with PAYMENTS_MODE=off"})` : ""}`);
