// Explicit state machines for Verdict API.
//
// One small module, no dependencies, no config imports, so it can be
// imported by the server, the demo agent, and unit tests, and embedded
// as JSON into the browser scripts by src/pages.js. It names states,
// allowed transitions, and the user/agent-facing message for each state.
// It never changes prices, endpoints, or the x402 payload shape: it only
// names what the code already does, so the messages it produces are the
// messages the code produced before, unless a change is listed in the
// module comment of the state it affects.
//
// Naming: UPPER_SNAKE states are internal (only their `code` reaches the
// wire). lowercase snake_case states appear in JSON (verdict `checks.stages`,
// widget `data-wt-state`).

// ---------------------------------------------------------------------------
// Payment lifecycle: one verdict call, x402 v2 exact on Kite testnet.
// Every payer moves through the same states: an agent over HTTP, the demo
// agent, and the browser wallet widget. The server is the authority; the
// widget and demo mirror these states client-side.
// ---------------------------------------------------------------------------
export const PAYMENT_STATES = {
  UNPAID: { code: "PAYMENT_REQUIRED", http: 402, terminal: false, description: "No payment attached yet. The server answers with the x402 terms." },
  SIGNED: { code: null, http: null, terminal: false, description: "A PAYMENT-SIGNATURE header is attached; the facilitator will verify it." },
  VERIFYING: { code: null, http: null, terminal: false, description: "The Pieverse facilitator is verifying the signed authorization." },
  VERIFY_FAILED: { code: "PAYMENT_FAILED", http: 402, terminal: true, description: "The facilitator rejected the payment. No verdict is returned." },
  SETTLING: { code: null, http: null, terminal: false, description: "Verification passed; the facilitator is settling the transfer on chain." },
  SETTLE_FAILED: { code: "PAYMENT_FAILED", http: 402, terminal: true, description: "Verification passed but settlement failed. No verdict is returned." },
  SETTLED: { code: null, http: null, terminal: false, description: "Payment settled; the verdict pipeline runs next." },
  DONE: { code: null, http: 200, terminal: true, description: "Verdict returned with a receipt." },
};

export const PAYMENT_TRANSITIONS = {
  UNPAID: ["SIGNED"],
  SIGNED: ["VERIFYING"],
  VERIFYING: ["VERIFY_FAILED", "SETTLING"],
  SETTLING: ["SETTLE_FAILED", "SETTLED"],
  SETTLED: ["DONE"],
  VERIFY_FAILED: [],
  SETTLE_FAILED: [],
  DONE: [],
};

export function paymentCanTransition(from, to) {
  return (PAYMENT_TRANSITIONS[from] || []).includes(to);
}

// What to tell the payer when the facilitator rejects a payment.
// The facilitator's `invalidReason` is machine-readable; these turn it into
// the next action. Unknown reasons fall back to the generic hint, which is
// the message the server used for every failure before this table existed.
export const VERIFY_REASON_GUIDANCE = {
  insufficient_funds: "Your pieUSD balance is too low for this check. Get free testnet pieUSD from the Kite Passport sandbox (kpass sandbox on, then kpass faucet drop), then try again.",
  invalid_exact_evm_payload_signature: "The signature does not match the payment authorization. Sign again from the same wallet without editing the payment details.",
  invalid_exact_evm_payload_authorization_valid_before: "The payment authorization has expired. Ask for fresh terms and sign again.",
  invalid_exact_evm_payload_authorization_valid_after: "The payment authorization is not valid yet. Ask for fresh terms and sign again.",
  invalid_exact_evm_payload_authorization_nonce: "This payment authorization was already used. Ask for fresh terms and sign again.",
};

// 402 body for a call with no payment attached. Same shape and wording as
// before: the full x402 terms plus the standard error envelope.
export function paymentRequiredBody({ kind, cents, network, base, terms }) {
  return {
    ...terms,
    error: `Payment required: this ${kind} check costs ${cents} cents in pieUSD on Kite testnet (${network}). Pay with x402 and resend with a PAYMENT-SIGNATURE header, or read the free terms at GET ${base}/verdict/${kind}/terms.`,
    code: "PAYMENT_REQUIRED",
  };
}

// 402 body for a signed payment the facilitator would not accept.
// `verifyResult` is the facilitator /v2/verify response for THIS request,
// or null when verify never ran or never answered. When verification passed
// but the call still came back 402, the failure happened after verification,
// which is the settlement step, so it is named as such instead of blamed
// on verification.
export function paymentFailedBody({ verifyResult }) {
  if (verifyResult?.isValid) {
    return {
      error: "Payment settlement failed. The payment was verified but could not be settled on chain, so no verdict was returned. Try again in a moment.",
      code: "PAYMENT_FAILED",
    };
  }
  const reason = verifyResult?.invalidReason || verifyResult?.error || null;
  if (!reason) {
    return {
      error: "Payment verification failed. Check your pieUSD balance on Kite testnet and that the payment matches the terms, then try again.",
      code: "PAYMENT_FAILED",
    };
  }
  const guidance = VERIFY_REASON_GUIDANCE[reason];
  return {
    error: guidance
      ? `Payment verification failed. The facilitator said: ${reason}. ${guidance}`
      : `Payment verification failed. The facilitator said: ${reason}. Check your pieUSD balance on Kite testnet and that the payment matches the terms, then try again.`,
    code: "PAYMENT_FAILED",
    reason,
  };
}

// ---------------------------------------------------------------------------
// SERV readiness: whether the reasoning service can run a verdict at all.
// M11. The states are derived from configuration at request time, not
// probed live: a present key means READY, a missing key means MISSING_KEY.
// UNINITIALIZED is the state before the first check runs. The pre-check in
// src/server.js answers MISSING_KEY with a 503 before any payment is
// requested, verified, or settled, so a verdict can never be charged and
// then fail for a missing key. A present-but-wrong key still only fails
// when SERV answers; that is a known limit, not a state this table can see.
// ---------------------------------------------------------------------------
export const SERV_STATES = {
  UNINITIALIZED: { code: null, http: null, terminal: false, description: "Readiness has not been checked yet." },
  READY: { code: null, http: null, terminal: false, description: "SERV is configured and a verdict can run." },
  MISSING_KEY: { code: "SERVICE_UNAVAILABLE", http: 503, terminal: true, description: "SERV is not configured, so no verdict can run and no payment may be taken." },
};

export const SERV_TRANSITIONS = {
  UNINITIALIZED: ["READY", "MISSING_KEY"],
  READY: [],
  MISSING_KEY: [],
};

export function servState(configured) {
  return configured ? "READY" : "MISSING_KEY";
}

// 503 body for a verdict call when SERV cannot run. Standard error
// envelope, no payment taken, no terms, no receipt.
export function serviceUnavailableBody() {
  return {
    error: "Verdicts are unavailable right now because the reasoning service (SERV) is not configured. No payment was taken.",
    code: "SERVICE_UNAVAILABLE",
  };
}

// ---------------------------------------------------------------------------
// Verdict pipeline: the stages one call walks, in order. Optional stages
// only appear when they run. The stages actually traversed are returned in
// `checks.stages` on the 200 response and stored on the receipt, so any
// agent or developer can see why a verdict is what it is, without changing
// the verdict, the confidence, or any other field.
// ---------------------------------------------------------------------------
export const VERDICT_STAGES = {
  fetching_evidence: "Evidence gathered for this kind: page text, sources, or DexScreener data.",
  scanning: "Link only: hidden instruction-like text scanned in the page HTML.",
  serv_first: "First SERV Reasoning pass.",
  serv_retry: "Hard SERV model retry: the first answer was unparseable or below 0.6 confidence.",
  checking_quotes: "Every quoted reason checked word for word against the evidence, in code.",
  injection_override: "Hidden instruction-like text was found, so a safe or unclear verdict was pushed to risky.",
  no_evidence_override: "No verified reason survived, so the verdict was pushed to unclear.",
  done: "Verdict returned.",
};

export const VERDICT_STAGE_ORDER = [
  "fetching_evidence",
  "scanning",
  "serv_first",
  "serv_retry",
  "checking_quotes",
  "injection_override",
  "no_evidence_override",
  "done",
];

// ---------------------------------------------------------------------------
// Landing wallet widget: the visitor-facing states of the in-browser try-it.
// These are message templates ({placeholders} filled in by the widget); the
// table is embedded as JSON into the landing page by src/pages.js, so the
// words the visitor sees come from this one place. Wording matches what the
// widget showed before, except `balance_low` is now also used when a quiet
// balance refresh after a check finds too little pieUSD, instead of the
// check button silently going dead.
// ---------------------------------------------------------------------------
export const WIDGET_STATES = {
  no_wallet: { message: "No wallet found in this browser. Install MetaMask, or open this page inside your wallet app's browser (for example MetaMask on your phone). The check below stays off until a wallet is present." },
  terms_loading: { message: "Loading the payment terms..." },
  terms_failed: { message: "Could not load the payment terms. Is the API awake? Reload the page to try again." },
  wallet_found: { message: "Wallet found. Connect it to check a link for {cents}c in testnet pieUSD." },
  connecting: { message: "Waiting for your wallet..." },
  not_connected: { message: "Wallet not connected." },
  wallet_disconnected: { message: "Wallet disconnected. Connect again to try a check." },
  balance_low: { message: "Your pieUSD balance is too low for a {cents}c check. Get free testnet pieUSD from the faucet, then check your balance again." },
  ready: { message: "Ready. Checking costs {cents}c in pieUSD, paid from {address}." },
  asking_terms: { message: "Asking Verdict for the payment terms..." },
  awaiting_signature: { message: "Payment: {amount} pieUSD ({cents}c). Approve the signature in your wallet..." },
  sending: { message: "Signature approved. Sending the paid check..." },
  done_paid: { message: "Done. Verdict paid and settled on Kite testnet." },
  done_free: { message: "Done. No payment was needed for this call." },
  incomplete: { message: "Check did not complete. Your wallet was not charged unless a verdict is shown below." },
};

// Fill a {placeholder} template. The browser scripts carry a two-line copy
// of this helper because templates are embedded as JSON, not code.
export function formatStateMessage(template, ctx = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (ctx[key] ?? ""));
}

// ---------------------------------------------------------------------------
// Dashboard refresh: live polling of /stats.
// `live` polls every 3 seconds; `paused` stops the timer; `error` keeps the
// last good board on screen and says the refresh failed, instead of wiping
// the list. A refresh already in flight is never started twice, so a slow
// response cannot overwrite newer data.
// ---------------------------------------------------------------------------
export const DASHBOARD_STATES = {
  loading: { note: "Loading..." },
  live: { note: "Updated {time}" },
  paused: { note: "Paused. Showing data from {time}." },
  error: { note: "Couldn't refresh just now. Showing the last good data from {time}." },
};

// ---------------------------------------------------------------------------
// Demo agent: what the shopping agent does with a link verdict.
// One table, so the decision is data, not two boolean expressions.
// Unknown verdicts stop the agent: it never buys on a verdict it does not
// understand.
// ---------------------------------------------------------------------------
export const DEMO_DECISIONS = {
  scam: "refuse",
  risky: "refuse",
  safe: "proceed",
  unclear: "stop",
};

export function demoDecision(verdict) {
  return DEMO_DECISIONS[String(verdict || "").toLowerCase()] || "stop";
}
