import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAtlasTonePolicy,
} from "./atlas-tone-policy.ts";

test("5A.4C Stage 3A suppresses humour for security issues", () => {
  const result = resolveAtlasTonePolicy({
    intent: "knowledge",
    issueCategory: "security",
    groundingLevel: "VERIFIED",
  });

  assert.equal(result.mode, "restrained");
  assert.equal(result.humourAllowed, false);
});

test("5A.4C Stage 3A suppresses humour for payment issues", () => {
  const result = resolveAtlasTonePolicy({
    intent: "knowledge",
    issueCategory: "payment",
    groundingLevel: "VERIFIED",
  });

  assert.equal(result.mode, "restrained");
  assert.equal(result.humourAllowed, false);
});

test("5A.4C Stage 3A suppresses humour for refund and dispute issues", () => {
  const result = resolveAtlasTonePolicy({
    intent: "support",
    issueCategory: "refund-dispute",
    groundingLevel: "VERIFIED",
    visualState: "support",
  });

  assert.equal(result.mode, "restrained");
  assert.equal(result.humourAllowed, false);
});

test("5A.4C Stage 3A suppresses humour whenever grounding is unavailable", () => {
  const result = resolveAtlasTonePolicy({
    intent: "knowledge",
    issueCategory: "general",
    groundingLevel: "UNAVAILABLE",
  });

  assert.equal(result.mode, "restrained");
  assert.equal(result.humourAllowed, false);
});

test("5A.4C Stage 3A suppresses humour for warning and error states", () => {
  for (const visualState of ["warning", "error"]) {
    const result = resolveAtlasTonePolicy({
      intent: "knowledge",
      issueCategory: "general",
      groundingLevel: "VERIFIED",
      visualState,
    });

    assert.equal(result.mode, "restrained", visualState);
    assert.equal(result.humourAllowed, false, visualState);
  }
});

test("5A.4C Stage 3A suppresses humour for diagnosis", () => {
  const result = resolveAtlasTonePolicy({
    intent: "diagnosis",
    issueCategory: "general",
    groundingLevel: "VERIFIED",
  });

  assert.equal(result.mode, "restrained");
  assert.equal(result.humourAllowed, false);
});

test("5A.4C Stage 3A allows light playfulness only for low-risk verified guidance", () => {
  for (const issueCategory of [
    "gift-vault",
    "bill-split",
    "business",
    "general",
  ]) {
    const result = resolveAtlasTonePolicy({
      intent: "knowledge",
      issueCategory,
      groundingLevel: "VERIFIED",
    });

    assert.equal(result.mode, "playful", issueCategory);
    assert.equal(result.humourAllowed, true, issueCategory);
  }
});

test("5A.4C Stage 3A keeps ordinary verified customer information warm", () => {
  for (const issueCategory of [
    "marketplace-order",
    "delivery",
    "receipt",
  ]) {
    const result = resolveAtlasTonePolicy({
      intent: "marketplace-order",
      issueCategory,
      groundingLevel: "VERIFIED",
    });

    assert.equal(result.mode, "warm", issueCategory);
    assert.equal(result.humourAllowed, false, issueCategory);
  }
});

test("5A.4C Stage 3A allows playful Gift Vault guidance but never private Gift Vault records", () => {
  const guidance = resolveAtlasTonePolicy({
    intent: "gift",
    issueCategory: "gift-vault",
    groundingLevel: "VERIFIED",
    requiresPrivateData: false,
  });

  assert.equal(guidance.mode, "playful");
  assert.equal(guidance.humourAllowed, true);

  const privateRecord = resolveAtlasTonePolicy({
    intent: "gift",
    issueCategory: "gift-vault",
    groundingLevel: "VERIFIED",
    requiresPrivateData: true,
  });

  assert.equal(privateRecord.mode, "warm");
  assert.equal(privateRecord.humourAllowed, false);
});

test("5A.4C Stage 3A allows playful Bill Split guidance but never private Bill Split records", () => {
  const guidance = resolveAtlasTonePolicy({
    intent: "bill-split",
    issueCategory: "bill-split",
    groundingLevel: "VERIFIED",
    requiresPrivateData: false,
  });

  assert.equal(guidance.mode, "playful");
  assert.equal(guidance.humourAllowed, true);

  const privateRecord = resolveAtlasTonePolicy({
    intent: "bill-split",
    issueCategory: "bill-split",
    groundingLevel: "VERIFIED",
    requiresPrivateData: true,
  });

  assert.equal(privateRecord.mode, "warm");
  assert.equal(privateRecord.humourAllowed, false);
});

test("5A.4C Stage 3A never changes authority or execution metadata", () => {
  const result = resolveAtlasTonePolicy({
    intent: "knowledge",
    issueCategory: "gift-vault",
    groundingLevel: "VERIFIED",
  });

  assert.equal("toolId" in result, false);
  assert.equal("requiresPrivateData" in result, false);
  assert.equal("action" in result, false);
  assert.equal("risk" in result, false);
});
