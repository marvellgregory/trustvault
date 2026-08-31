import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_WALLET_AUTHORITY_ACTIONS,
  ATLAS_WALLET_AUTHORITY_DECISIONS,
  getAtlasWalletAuthorityPolicy,
} from "./atlas-wallet-authority-policy.ts";

test("5M.1A defines the Atlas wallet authority decision surface", () => {
  assert.deepEqual(
    [...ATLAS_WALLET_AUTHORITY_DECISIONS],
    [
      "ATLAS_ALLOWED",
      "USER_WALLET_REQUIRED",
      "FORBIDDEN",
    ],
  );
});

test("5M.1A permits intent preparation without wallet authority", () => {
  const policy =
    getAtlasWalletAuthorityPolicy(
      "prepare-intent",
    );

  assert.equal(
    policy.decision,
    "ATLAS_ALLOWED",
  );
});

test("5M.1A permits transaction review without wallet authority", () => {
  const policy =
    getAtlasWalletAuthorityPolicy(
      "review-intent",
    );

  assert.equal(
    policy.decision,
    "ATLAS_ALLOWED",
  );
});

test("5M.1A permits requesting confirmation without treating it as wallet authority", () => {
  const policy =
    getAtlasWalletAuthorityPolicy(
      "request-confirmation",
    );

  assert.equal(
    policy.decision,
    "ATLAS_ALLOWED",
  );
});

test("5M.1A execution handoff requires the external user wallet boundary", () => {
  const policy =
    getAtlasWalletAuthorityPolicy(
      "create-execution-handoff",
    );

  assert.equal(
    policy.decision,
    "USER_WALLET_REQUIRED",
  );

  assert.equal(
    policy.reason,
    "EXECUTION_REQUIRES_EXTERNAL_USER_WALLET",
  );
});

test("5M.1A Atlas cannot possess a wallet provider", () => {
  assert.equal(
    getAtlasWalletAuthorityPolicy(
      "possess-wallet-provider",
    ).decision,
    "FORBIDDEN",
  );
});

test("5M.1A Atlas cannot possess a signing account", () => {
  assert.equal(
    getAtlasWalletAuthorityPolicy(
      "possess-signing-account",
    ).decision,
    "FORBIDDEN",
  );
});

test("5M.1A Atlas cannot access wallet secrets", () => {
  assert.equal(
    getAtlasWalletAuthorityPolicy(
      "access-wallet-secret",
    ).decision,
    "FORBIDDEN",
  );
});

test("5M.1A Atlas cannot sign wallet operations", () => {
  assert.equal(
    getAtlasWalletAuthorityPolicy(
      "sign-wallet-operation",
    ).decision,
    "FORBIDDEN",
  );
});

test("5M.1A Atlas cannot broadcast wallet operations", () => {
  assert.equal(
    getAtlasWalletAuthorityPolicy(
      "broadcast-wallet-operation",
    ).decision,
    "FORBIDDEN",
  );
});

test("5M.1A Atlas cannot autonomously move funds", () => {
  assert.equal(
    getAtlasWalletAuthorityPolicy(
      "autonomous-fund-movement",
    ).decision,
    "FORBIDDEN",
  );
});

test("5M.1A every wallet authority action has an explicit immutable policy", () => {
  for (
    const action of
      ATLAS_WALLET_AUTHORITY_ACTIONS
  ) {
    const policy =
      getAtlasWalletAuthorityPolicy(action);

    assert.equal(policy.action, action);

    assert.equal(
      Object.isFrozen(policy),
      true,
    );
  }
});

test("5M.1A policy exposes no provider or signing implementation", () => {
  for (
    const action of
      ATLAS_WALLET_AUTHORITY_ACTIONS
  ) {
    const policy =
      getAtlasWalletAuthorityPolicy(action);

    assert.deepEqual(
      Object.keys(policy).sort(),
      [
        "action",
        "decision",
        "reason",
      ],
    );
  }
});