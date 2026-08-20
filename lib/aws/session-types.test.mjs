import assert from "node:assert/strict";
import test from "node:test";

const { sessionMatchesConnectedWallet } = await import("./session-types.ts");

const session = {
  authenticated: true,
  customerId: "tvc_11111111111111111111111111111111",
  walletAddress: "0x1111111111111111111111111111111111111111",
  chainId: 5_042_002,
  expiresAt: "2026-08-27T03:00:00.000Z",
};

test("restores only to the same connected Arc wallet", () => {
  assert.equal(sessionMatchesConnectedWallet(session, session.walletAddress, 5_042_002), true);
  assert.equal(sessionMatchesConnectedWallet(session, "0x2222222222222222222222222222222222222222", 5_042_002), false);
  assert.equal(sessionMatchesConnectedWallet(session, session.walletAddress, 1), false);
  assert.equal(sessionMatchesConnectedWallet(session, undefined, undefined), false);
});
