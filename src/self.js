// Self Agent ID gate (Track 3: Verified Agent Payments).
//
// Self Agent ID is an on-chain registry on Celo that binds an agent's
// signing key to a zero-knowledge proof that one real, unique human
// stands behind it. The agent gets a soulbound ERC-721 NFT; services
// check it with one middleware call. It implements all three ERC-8004
// registry roles (identity, reputation, validation) and adds a
// proof-of-human extension. The reference ERC-8004 registries on Celo
// are separate contracts, so an agent can be registered in both; for
// judging, registering in both is the safe option (see README).
//
// Registry addresses (Celo docs, checked with eth_getCode 2026-08-21):
//   mainnet  0xaC3DF9ABf80d0F5c020C06B04Cced27763355944
//   Sepolia  0x043DaCac8b0771DD5b444bCC88f2f8BBDBEdd379
// The SDK picks these from the network name; they are not hard-coded
// into verification calls here.
//
// The verifier checks, in order: timestamp freshness (300s window),
// signature (recovered, never trusted from headers), replay, on-chain
// registration, proof freshness, Self proof provider, sybil limit,
// credential requirements, rate limit.
//
// IMPORTANT: verifier.auth() needs the exact raw request body bytes.
// server.js captures them with express.json({ verify }) into
// req.rawBody. A request with a body but no raw body gets a 500 from
// the SDK, so do not remove that capture.
//
// Gate is behind SELF_VERIFY (default "off"): Sepolia testing works
// before any agent is registered. Set SELF_VERIFY=on to enforce.
// SELF_NETWORK is "testnet" (Celo Sepolia, mock documents accepted)
// or "mainnet" (real passport/ID only).
import { config, SELF_REGISTRY } from "./config.js";

let verifierPromise = null;

export function isSelfVerifyEnabled() {
  return config.self.verify;
}

export function selfNetwork() {
  return config.self.network;
}

export function selfRegistryAddress() {
  return config.self.network === "mainnet" ? SELF_REGISTRY.mainnet : SELF_REGISTRY.sepolia;
}

async function buildVerifier() {
  if (!verifierPromise) {
    verifierPromise = (async () => {
      const { SelfAgentVerifier } = await import("@selfxyz/agent-sdk");
      return SelfAgentVerifier.create()
        .network(config.self.network === "mainnet" ? "mainnet" : "testnet")
        .requireAge(18)
        .requireOFAC()
        .requireSelfProvider()
        .sybilLimit(1)
        .includeCredentials()
        .rateLimit({ perMinute: 100 })
        .build();
    })().catch((error) => {
      verifierPromise = null;
      throw error;
    });
  }
  return verifierPromise;
}

// Express middleware for POST /verdict/claim only. When SELF_VERIFY is
// off it passes through untouched. When on, unverified requests get
// 401 { error } from the SDK (429 when rate limited, 503 when the
// on-chain lookup fails). On success req.agent is set
// ({ address, agentKey, agentId, agentCount, nullifier, credentials }).
export function requireSelfAgent() {
  return async (req, res, next) => {
    if (!config.self.verify) return next();
    let verifier;
    try {
      verifier = await buildVerifier();
    } catch (error) {
      console.error("[self] Failed to build verifier:", String(error?.message || error));
      return res.status(503).json({ error: "Self Agent ID verifier is unavailable", code: "SELF_UNAVAILABLE" });
    }
    try {
      return await verifier.auth()(req, res, next);
    } catch (error) {
      console.error("[self] Verification error:", String(error?.message || error));
      return res.status(503).json({ error: "Self Agent ID verification failed", code: "SELF_UNAVAILABLE" });
    }
  };
}
