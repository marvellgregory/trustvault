import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("./") &&
      specifier.endsWith(".js") &&
      context.parentURL?.includes("/lib/wallet/")
    ) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  changeWalletChain,
  connectWalletSession,
  createDetectedWalletSession,
  disconnectWalletSession,
  establishArcReadiness,
  evaluateWalletCapabilities,
  evaluateWalletQualification,
  removeWalletProvider,
  selectWalletProvider,
} = await import("./session-transitions.ts");
const { validateWalletSessionConsistency } = await import(
  "./session-consistency.ts"
);
const { createSerializableWalletSessionSnapshot } = await import(
  "./session-snapshot.ts"
);

const ARC_CHAIN_ID = 5_042_002;
const ACCOUNT_A = "0x1111111111111111111111111111111111111111";
const ACCOUNT_B = "0x2222222222222222222222222222222222222222";

function identity(overrides = {}) {
  return Object.freeze({
    registryId: "eip6963:11111111-1111-4111-8111-111111111111",
    source: "eip6963",
    uuid: "11111111-1111-4111-8111-111111111111",
    rdns: "com.example.wallet",
    name: "Candidate Wallet",
    ...overrides,
  });
}

function detected(provider = identity()) {
  return createDetectedWalletSession({
    sessionId: "session-1",
    provider,
    expectedArcChainId: ARC_CHAIN_ID,
    timestamp: "2026-01-01T00:00:00.000Z",
  });
}

function connected(chainId = 1, provider = identity()) {
  const session = selectWalletProvider(detected(provider), provider);
  return connectWalletSession(session, { address: ACCOUNT_A, chainId });
}

const compatibleCapabilities = {
  canRequestAccounts: "supported",
  canSendTransaction: "supported",
  canWriteContract: "supported",
  circleAdapterAvailable: "supported",
  supportsArcTestnet: "supported",
};

test("detected is not connected", () => {
  const session = detected();
  assert.equal(session.state, "DETECTED");
  assert.equal(session.connection, "disconnected");
  assert.throws(
    () => connectWalletSession(session, { address: ACCOUNT_A, chainId: 1 }),
    /Select/,
  );
});

test("connected is not automatically Arc ready", () => {
  const session = connected(ARC_CHAIN_ID);
  assert.equal(session.state, "CONNECTED");
  assert.equal(session.chain.arcReady, false);
});

test("Arc ready is not automatically compatible", () => {
  const session = establishArcReadiness(connected(ARC_CHAIN_ID));
  assert.equal(session.state, "ARC_READY");
  assert.ok(Object.values(session.capabilities).every((value) => value === "unknown"));
});

test("compatible is not automatically qualified", () => {
  const ready = establishArcReadiness(connected(ARC_CHAIN_ID));
  const session = evaluateWalletCapabilities(ready, compatibleCapabilities);
  assert.equal(session.state, "COMPATIBLE");
  assert.equal(session.qualification.status, "UNTESTED");
});

test("unknown capabilities remain unknown when partially evaluated", () => {
  const session = evaluateWalletCapabilities(
    selectWalletProvider(detected(), identity()),
    { canRequestAccounts: "supported" },
  );
  assert.equal(session.capabilities.canRequestAccounts, "supported");
  assert.equal(session.capabilities.canSwitchChain, "unknown");
  assert.equal(session.capabilities.qualifiedForTrustVault, "unknown");
});

test("candidate wallet names never imply qualification", () => {
  for (const name of [
    "MetaMask",
    "Trust Wallet",
    "Bitget Wallet",
    "Binance Wallet",
    "Bybit Wallet",
    "Phantom",
  ]) {
    const provider = identity({ name });
    assert.equal(detected(provider).qualification.status, "UNTESTED");
  }
});

test("qualification requires separate capability and evidence", () => {
  let session = establishArcReadiness(connected(ARC_CHAIN_ID));
  session = evaluateWalletCapabilities(session, compatibleCapabilities);
  session = evaluateWalletQualification(session, {
    status: "QUALIFIED",
    providerIdentityKey: session.provider.registryId,
    suiteVersion: "future-suite",
    reasons: [],
  });
  assert.equal(session.state, "COMPATIBLE");
  session = evaluateWalletCapabilities(session, {
    qualifiedForTrustVault: "supported",
  });
  assert.equal(session.state, "TRUSTVAULT_QUALIFIED");
});

test("serializable snapshot contains no provider or client objects", () => {
  const snapshot = createSerializableWalletSessionSnapshot(connected());
  const serialized = JSON.stringify(snapshot);
  assert.equal("bindings" in snapshot, false);
  assert.equal("provider" in snapshot.provider, false);
  assert.doesNotMatch(serialized, /privateKey|seedPhrase|signature|token/i);
});

test("detects Wagmi and Viem account mismatches", () => {
  const provider = identity();
  const session = connectWalletSession(
    selectWalletProvider(detected(provider), provider),
    {
      address: ACCOUNT_A,
      chainId: ARC_CHAIN_ID,
      bindings: {
        wagmi: {
          providerIdentityKey: provider.registryId,
          account: ACCOUNT_B,
          chainId: ARC_CHAIN_ID,
        },
        viem: {
          providerIdentityKey: provider.registryId,
          account: ACCOUNT_B,
          chainId: ARC_CHAIN_ID,
        },
      },
    },
  );
  const result = validateWalletSessionConsistency({
    session,
    registryProviders: [provider],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "WAGMI_ACCOUNT_MISMATCH"));
  assert.ok(result.issues.some((issue) => issue.code === "VIEM_ACCOUNT_MISMATCH"));
});

test("detects provider and Circle identity mismatches", () => {
  const provider = identity();
  const changedIdentity = identity({ rdns: "com.changed.wallet" });
  const session = connectWalletSession(
    selectWalletProvider(detected(provider), provider),
    {
      address: ACCOUNT_A,
      chainId: ARC_CHAIN_ID,
      bindings: {
        circle: { providerIdentityKey: "eip6963:different" },
      },
    },
  );
  const result = validateWalletSessionConsistency({
    session,
    registryProviders: [changedIdentity],
  });
  assert.ok(result.issues.some((issue) => issue.code === "PROVIDER_IDENTITY_MISMATCH"));
  assert.ok(result.issues.some((issue) => issue.code === "CIRCLE_PROVIDER_MISMATCH"));
});

test("detects chain mismatches", () => {
  const provider = identity();
  const session = connectWalletSession(
    selectWalletProvider(detected(provider), provider),
    {
      address: ACCOUNT_A,
      chainId: 1,
      bindings: {
        wagmi: {
          providerIdentityKey: provider.registryId,
          account: ACCOUNT_A,
          chainId: ARC_CHAIN_ID,
        },
      },
    },
  );
  const result = validateWalletSessionConsistency({
    session,
    registryProviders: [provider],
  });
  assert.ok(result.issues.some((issue) => issue.code === "CHAIN_MISMATCH"));
});

test("chain change safely clears bindings and recalculates readiness", () => {
  let session = establishArcReadiness(connected(ARC_CHAIN_ID));
  session = changeWalletChain(session, 1);
  assert.equal(session.state, "CONNECTED");
  assert.equal(session.chain.arcReady, false);
  assert.deepEqual(session.bindings, {});
});

test("disconnect clears connection state but preserves identity qualification", () => {
  let session = connected(ARC_CHAIN_ID);
  session = evaluateWalletQualification(session, {
    status: "FAILED",
    providerIdentityKey: session.provider.registryId,
    reasons: ["Qualification fixture"],
  });
  session = disconnectWalletSession(session);
  assert.equal(session.state, "DETECTED");
  assert.equal(session.address, undefined);
  assert.equal(session.chain.known, false);
  assert.deepEqual(session.bindings, {});
  assert.equal(session.qualification.status, "FAILED");
});

test("provider removal invalidates connection while retaining identity evidence", () => {
  let session = connected(ARC_CHAIN_ID);
  session = evaluateWalletQualification(session, {
    status: "BLOCKED",
    providerIdentityKey: session.provider.registryId,
    reasons: ["Fixture"],
  });
  session = removeWalletProvider(session, session.provider.registryId);
  assert.equal(session.state, "INVALIDATED");
  assert.equal(session.providerSelection, "unavailable");
  assert.equal(session.address, undefined);
  assert.equal(session.qualification.status, "BLOCKED");
});

test("selecting another provider resets provider-specific evidence", () => {
  const first = identity();
  const second = identity({
    registryId: "eip6963:22222222-2222-4222-8222-222222222222",
    uuid: "22222222-2222-4222-8222-222222222222",
    rdns: "com.second.wallet",
    name: "Second Wallet",
  });
  let session = selectWalletProvider(detected(first), first);
  session = evaluateWalletQualification(session, {
    status: "QUALIFIED",
    providerIdentityKey: first.registryId,
    reasons: [],
  });
  session = selectWalletProvider(session, second);
  assert.equal(session.provider.registryId, second.registryId);
  assert.equal(session.providerSelection, "selected");
  assert.equal(session.qualification.status, "UNTESTED");
  assert.ok(Object.values(session.capabilities).every((value) => value === "unknown"));
});

test("multiple providers remain explicit and registry presence is validated", () => {
  const first = identity();
  const second = identity({
    registryId: "eip6963:22222222-2222-4222-8222-222222222222",
    uuid: "22222222-2222-4222-8222-222222222222",
    rdns: "com.second.wallet",
  });
  const session = selectWalletProvider(detected(first), second);
  assert.equal(session.provider.registryId, second.registryId);
  const valid = validateWalletSessionConsistency({
    session,
    registryProviders: [first, second],
  });
  assert.equal(valid.valid, true);
  const removed = validateWalletSessionConsistency({
    session,
    registryProviders: [first],
  });
  assert.ok(removed.issues.some((issue) => issue.code === "PROVIDER_NOT_IN_REGISTRY"));
});
