import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAtlasWebEligibility,
} from "./atlas-web-eligibility.ts";

test("5A.4C Stage 4 blocks authenticated private customer data", () => {
  const result = resolveAtlasWebEligibility({
    intent: "marketplace-order",
    issueCategory: "marketplace-order",
    requiresPrivateData: true,
    toolId: "lookup_marketplace_orders",
  });

  assert.deepEqual(result, {
    decision: "BLOCKED",
    reason: "PRIVATE_CUSTOMER_DATA",
  });
});

test("5A.4C Stage 4 blocks private Gift Vault records", () => {
  const result = resolveAtlasWebEligibility({
    intent: "gift",
    issueCategory: "gift-vault",
    requiresPrivateData: true,
  });

  assert.equal(result.decision, "BLOCKED");
});

test("5A.4C Stage 4 blocks private Bill Split records", () => {
  const result = resolveAtlasWebEligibility({
    intent: "bill-split",
    issueCategory: "bill-split",
    requiresPrivateData: true,
  });

  assert.equal(result.decision, "BLOCKED");
});

test("5A.4C Stage 4 blocks transaction authority even without private data", () => {
  const result = resolveAtlasWebEligibility({
    intent: "knowledge",
    issueCategory: "general",
    riskLevel: "transaction",
  });

  assert.deepEqual(result, {
    decision: "BLOCKED",
    reason: "TRANSACTION_AUTHORITY",
  });
});

test("5A.4C Stage 4 blocks prepare and mutation risk", () => {
  for (const riskLevel of ["prepare", "mutation"]) {
    const result = resolveAtlasWebEligibility({
      intent: "knowledge",
      issueCategory: "general",
      riskLevel,
    });

    assert.equal(result.decision, "BLOCKED");
    assert.equal(result.reason, "TRANSACTION_AUTHORITY");
  }
});

test("5A.4C Stage 4 blocks diagnosis", () => {
  const result = resolveAtlasWebEligibility({
    intent: "diagnosis",
    issueCategory: "general",
  });

  assert.deepEqual(result, {
    decision: "BLOCKED",
    reason: "DIAGNOSIS",
  });
});

test("5A.4C Stage 4 blocks wallet, payment, account and security truth", () => {
  for (const issueCategory of [
    "wallet",
    "network",
    "payment",
    "account",
    "security",
    "refund-dispute",
  ]) {
    const result = resolveAtlasWebEligibility({
      intent: "knowledge",
      issueCategory,
    });

    assert.equal(
      result.decision,
      "BLOCKED",
      `${issueCategory} must never use external research as TrustVault truth`,
    );
  }
});

test("5A.4C Stage 4 keeps TrustVault feature knowledge local first", () => {
  const result = resolveAtlasWebEligibility({
    intent: "knowledge",
    issueCategory: "general",
    feature: "marketplace",
  });

  assert.deepEqual(result, {
    decision: "LOCAL_FIRST",
    reason: "TRUSTVAULT_FEATURE_KNOWLEDGE",
  });
});

test("5A.4C Stage 4 keeps route context local first", () => {
  const result = resolveAtlasWebEligibility({
    intent: "route-context",
    issueCategory: "general",
  });

  assert.equal(result.decision, "LOCAL_FIRST");
});

test("5A.4C Stage 4 keeps navigation local first", () => {
  const result = resolveAtlasWebEligibility({
    intent: "navigation",
    issueCategory: "general",
  });

  assert.equal(result.decision, "LOCAL_FIRST");
});

test("5A.4C Stage 4 keeps support workflows local first", () => {
  const result = resolveAtlasWebEligibility({
    intent: "support",
    issueCategory: "general",
  });

  assert.deepEqual(result, {
    decision: "LOCAL_FIRST",
    reason: "SUPPORT_WORKFLOW",
  });
});

test("5A.4C Stage 4 allows safe public informational research", () => {
  const result = resolveAtlasWebEligibility({
    intent: "knowledge",
    issueCategory: "general",
  });

  assert.deepEqual(result, {
    decision: "ELIGIBLE",
    reason: "PUBLIC_INFORMATION",
  });
});

test("5A.4C Stage 4 allows safe public business research", () => {
  const result = resolveAtlasWebEligibility({
    intent: "knowledge",
    issueCategory: "business",
  });

  assert.equal(result.decision, "ELIGIBLE");
});

test("5A.4C Stage 4 policy exposes no execution authority", () => {
  const result = resolveAtlasWebEligibility({
    intent: "knowledge",
    issueCategory: "general",
  });

  assert.equal("toolId" in result, false);
  assert.equal("action" in result, false);
  assert.equal("execute" in result, false);
  assert.equal("riskLevel" in result, false);
  assert.equal("requiresPrivateData" in result, false);
});
