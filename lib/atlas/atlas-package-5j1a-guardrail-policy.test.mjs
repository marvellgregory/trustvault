import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_CAPABILITIES,
  ATLAS_GUARDRAIL_DECISIONS,
  getAtlasCapabilityPolicy,
} from "./atlas-guardrail-policy.ts";

test("5J.1A exposes the four central guardrail decisions", () => {
  assert.deepEqual(
    ATLAS_GUARDRAIL_DECISIONS,
    [
      "ALLOW",
      "REQUIRE_AUTH",
      "REQUIRE_CONFIRMATION",
      "DENY",
    ],
  );
});

test("5J.1A allows safe public reads", () => {
  assert.deepEqual(
    getAtlasCapabilityPolicy("public-read"),
    {
      capability: "public-read",
      decision: "ALLOW",
      reason: "SAFE_PUBLIC_OPERATION",
    },
  );
});

test("5J.1A requires authentication for private reads", () => {
  const policy =
    getAtlasCapabilityPolicy("private-read");

  assert.equal(
    policy.decision,
    "REQUIRE_AUTH",
  );

  assert.equal(
    policy.reason,
    "PRIVATE_DATA_REQUIRES_AUTH",
  );
});

test("5J.1A allows navigation without granting authority", () => {
  assert.equal(
    getAtlasCapabilityPolicy("navigation").decision,
    "ALLOW",
  );
});

test("5J.1A permits transaction preparation without execution authority", () => {
  assert.equal(
    getAtlasCapabilityPolicy(
      "transaction-prepare",
    ).decision,
    "ALLOW",
  );
});

test("5J.1A permits transaction review without execution authority", () => {
  assert.equal(
    getAtlasCapabilityPolicy(
      "transaction-review",
    ).decision,
    "ALLOW",
  );
});

test("5J.1A requires explicit confirmation at the transaction confirmation boundary", () => {
  const policy =
    getAtlasCapabilityPolicy(
      "transaction-confirmation",
    );

  assert.equal(
    policy.decision,
    "REQUIRE_CONFIRMATION",
  );

  assert.equal(
    policy.reason,
    "FINANCIAL_ACTION_REQUIRES_CONFIRMATION",
  );
});

test("5J.1A requires confirmation before an execution handoff", () => {
  assert.equal(
    getAtlasCapabilityPolicy(
      "execution-handoff",
    ).decision,
    "REQUIRE_CONFIRMATION",
  );
});

test("5J.1A permanently denies wallet signing authority", () => {
  const policy =
    getAtlasCapabilityPolicy("wallet-signing");

  assert.equal(policy.decision, "DENY");
  assert.equal(
    policy.reason,
    "SIGNING_AUTHORITY_FORBIDDEN",
  );
});

test("5J.1A permanently denies autonomous financial execution", () => {
  const policy =
    getAtlasCapabilityPolicy(
      "autonomous-transaction",
    );

  assert.equal(policy.decision, "DENY");
  assert.equal(
    policy.reason,
    "AUTONOMOUS_FINANCIAL_EXECUTION_FORBIDDEN",
  );
});

test("5J.1A permanently denies secret handling", () => {
  const policy =
    getAtlasCapabilityPolicy("secret-handling");

  assert.equal(policy.decision, "DENY");
  assert.equal(
    policy.reason,
    "SECRET_HANDLING_FORBIDDEN",
  );
});

test("5J.1A defines policy for every declared capability", () => {
  for (const capability of ATLAS_CAPABILITIES) {
    const policy =
      getAtlasCapabilityPolicy(capability);

    assert.equal(
      policy.capability,
      capability,
    );

    assert.ok(
      ATLAS_GUARDRAIL_DECISIONS.includes(
        policy.decision,
      ),
    );
  }
});

test("5J.1A policy carries no runtime authority or user confirmation evidence", () => {
  for (const capability of ATLAS_CAPABILITIES) {
    const policy =
      getAtlasCapabilityPolicy(capability);

    const serialized =
      JSON.stringify(policy).toLowerCase();

    for (const forbidden of [
      "privatekey",
      "seedphrase",
      "walletclient",
      "confirmationtoken",
      "isauthenticated",
      "hasconnectedwallet",
    ]) {
      assert.equal(
        serialized.includes(forbidden),
        false,
        `${capability} policy unexpectedly contains ${forbidden}`,
      );
    }
  }
});