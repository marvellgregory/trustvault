import assert from "node:assert/strict";
import test from "node:test";

const { authenticateTrustVaultWallet, TRUSTVAULT_AUTH_CHAIN_ID } = await import("./wallet-auth-flow.ts");
const address = "0x1111111111111111111111111111111111111111";

function dependencies(overrides = {}) {
  let wallet = { connected: true, address, chainId: TRUSTVAULT_AUTH_CHAIN_ID };
  const calls = [];
  return {
    calls,
    setWallet(next) { wallet = next; },
    input: {
      expectedAddress: address,
      getCurrentWallet: () => wallet,
      assertQualified: async () => calls.push("qualified"),
      requestChallenge: async (input) => { calls.push(input); return { challengeId: "challenge-1", message: "exact server message", expiresAt: "2030-01-01T00:00:00.000Z" }; },
      signMessage: async (message) => { calls.push(message); return "0x1234"; },
      verifyChallenge: async (input) => { calls.push(input); return { authenticated: true, associationStatus: "VERIFIED", walletAddress: address }; },
      now: () => Date.parse("2029-01-01T00:00:00.000Z"),
      ...overrides,
    },
  };
}

test("uses Arc, the intended action, and signs the exact server message", async () => {
  const fixture = dependencies();
  await authenticateTrustVaultWallet(fixture.input);
  assert.deepEqual(fixture.calls[1], { walletAddress: address, chainId: TRUSTVAULT_AUTH_CHAIN_ID, intendedAction: "AUTHENTICATE_ACCOUNT" });
  assert.equal(fixture.calls[2], "exact server message");
  assert.deepEqual(fixture.calls[3], { challengeId: "challenge-1", signature: "0x1234" });
});

test("rejects wrong network and expired challenges", async () => {
  const wrongNetwork = dependencies();
  wrongNetwork.setWallet({ connected: true, address, chainId: 1 });
  await assert.rejects(authenticateTrustVaultWallet(wrongNetwork.input), /Arc Testnet/);
  const expired = dependencies({ now: () => Date.parse("2031-01-01T00:00:00.000Z") });
  await assert.rejects(authenticateTrustVaultWallet(expired.input), /expired/);
});

test("rejects a disconnected wallet and preserves backend failures", async () => {
  const disconnected = dependencies();
  disconnected.setWallet({ connected: false });
  await assert.rejects(authenticateTrustVaultWallet(disconnected.input), /disconnected/);
  const backendFailure = dependencies({ requestChallenge: async () => { throw new Error("backend unavailable"); } });
  await assert.rejects(authenticateTrustVaultWallet(backendFailure.input), /backend unavailable/);
});

test("rejects wallet changes and unverified or mismatched results", async () => {
  const changed = dependencies();
  changed.input.signMessage = async () => {
    changed.setWallet({ connected: true, address: "0x2222222222222222222222222222222222222222", chainId: TRUSTVAULT_AUTH_CHAIN_ID });
    return "0x1234";
  };
  await assert.rejects(authenticateTrustVaultWallet(changed.input), /changed/);
  const mismatch = dependencies({ verifyChallenge: async () => ({ authenticated: true, associationStatus: "VERIFIED", walletAddress: "0x2222222222222222222222222222222222222222" }) });
  await assert.rejects(authenticateTrustVaultWallet(mismatch.input), /could not verify/);
});
