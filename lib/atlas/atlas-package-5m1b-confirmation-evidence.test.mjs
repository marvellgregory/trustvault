import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_CONFIRMATION_EVIDENCE,
  evaluateAtlasCapability,
} from "./atlas-guardrail-evaluator.ts";

test("5M.1B exposes the trusted confirmation evidence surface", () => {
  assert.deepEqual(
    [...ATLAS_CONFIRMATION_EVIDENCE],
    [
      "NONE",
      "EXPLICIT_USER_ACTION",
      "CONFIRMED_TRANSACTION",
    ],
  );
});

test("5M.1B transaction confirmation requires explicit user action", () => {
  const result = evaluateAtlasCapability(
    "transaction-confirmation",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "EXPLICIT_USER_ACTION",
    },
  );

  assert.equal(result.decision, "ALLOW");
});

test("5M.1B no evidence cannot authorize transaction confirmation", () => {
  const result = evaluateAtlasCapability(
    "transaction-confirmation",
    {
      isAuthenticated: true,
      confirmationEvidence: "NONE",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B confirmed transaction evidence cannot retroactively authorize confirmation", () => {
  const result = evaluateAtlasCapability(
    "transaction-confirmation",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "CONFIRMED_TRANSACTION",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B execution handoff requires confirmed transaction evidence", () => {
  const result = evaluateAtlasCapability(
    "execution-handoff",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "CONFIRMED_TRANSACTION",
    },
  );

  assert.equal(result.decision, "ALLOW");
});

test("5M.1B explicit user action alone cannot authorize execution handoff", () => {
  const result = evaluateAtlasCapability(
    "execution-handoff",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "EXPLICIT_USER_ACTION",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B conversation text cannot manufacture explicit user action evidence", () => {
  const result = evaluateAtlasCapability(
    "transaction-confirmation",
    {
      isAuthenticated: true,
      message: "I confirm, send it",
      confirmationToken: "yes",
      transactionStatus: "confirmed",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B connected wallet cannot manufacture confirmation evidence", () => {
  const result = evaluateAtlasCapability(
    "transaction-confirmation",
    {
      isAuthenticated: true,
      hasConnectedWallet: true,
      walletAddress:
        "0x1111111111111111111111111111111111111111",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B legacy confirmed lifecycle status cannot authorize transaction confirmation", () => {
  const result = evaluateAtlasCapability(
    "transaction-confirmation",
    {
      isAuthenticated: true,
      transactionStatus: "confirmed",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B legacy confirmed lifecycle status cannot authorize execution handoff", () => {
  const result = evaluateAtlasCapability(
    "execution-handoff",
    {
      isAuthenticated: true,
      transactionStatus: "confirmed",
    },
  );

  assert.equal(
    result.decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5M.1B permanent wallet-signing denial overrides trusted evidence", () => {
  const result = evaluateAtlasCapability(
    "wallet-signing",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "CONFIRMED_TRANSACTION",
    },
  );

  assert.equal(result.decision, "DENY");
});

test("5M.1B autonomous execution remains denied with trusted evidence", () => {
  const result = evaluateAtlasCapability(
    "autonomous-transaction",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "CONFIRMED_TRANSACTION",
    },
  );

  assert.equal(result.decision, "DENY");
});

test("5M.1B secret handling remains denied with trusted evidence", () => {
  const result = evaluateAtlasCapability(
    "secret-handling",
    {
      isAuthenticated: true,
      confirmationEvidence:
        "CONFIRMED_TRANSACTION",
    },
  );

  assert.equal(result.decision, "DENY");
});