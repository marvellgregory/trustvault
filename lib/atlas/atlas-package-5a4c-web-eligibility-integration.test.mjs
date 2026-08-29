import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("./") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.includes("/lib/atlas/")
    ) {
      return nextResolve(
        `${specifier.endsWith(".js") ? specifier.slice(0, -3) : specifier}.ts`,
        context,
      );
    }

    return nextResolve(specifier, context);
  },
});

const { classifyAtlasIntent } = await import("./atlas-intent.ts");
const { classifyAtlasIssue } = await import("./atlas-resolution.ts");
const { resolveAtlasWebEligibility } =
  await import("./atlas-web-eligibility.ts");

function evaluate(message, pathname = "/dashboard") {
  const classification = classifyAtlasIntent(message);
  const issueCategory = classifyAtlasIssue(message, pathname);

  const eligibility = resolveAtlasWebEligibility({
    intent: classification.intent,
    issueCategory,
    requiresPrivateData: classification.requiresPrivateData,
    toolId: classification.toolId,
    feature: classification.feature,
  });

  return {
    classification,
    issueCategory,
    eligibility,
  };
}

test("5A.4C Stage 4B never sends owned orders to web research", () => {
  const result = evaluate(
    "Where is my order?",
    "/marketplace",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
});

test("5A.4C Stage 4B never sends owned receipts to web research", () => {
  const result = evaluate(
    "Show me my receipt",
    "/receipts",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
});

test("5A.4C Stage 4B never sends owned gifts to web research", () => {
  const result = evaluate(
    "Show me my gift",
    "/gift-vault",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
});

test("5A.4C Stage 4B never sends owned Bill Split records to web research", () => {
  const result = evaluate(
    "Show me my bill split",
    "/bill-split",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
});

test("5A.4C Stage 4B never sends account activity to web research", () => {
  const result = evaluate(
    "Show me my recent activity",
    "/dashboard",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
});

test("5A.4C Stage 4B never sends wallet security diagnosis to web research", () => {
  const result = evaluate(
    "I think my wallet is compromised",
    "/account",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
  assert.equal(result.issueCategory, "security");
});

test("5A.4C Stage 4B never sends payment trouble to web research", () => {
  const result = evaluate(
    "My payment failed",
    "/payment-review",
  );

  assert.equal(result.eligibility.decision, "BLOCKED");
  assert.equal(result.issueCategory, "payment");
});

test("5A.4C Stage 4B keeps Gift Vault guidance local first", () => {
  const result = evaluate(
    "How does Gift Vault work?",
    "/gift-vault",
  );

  assert.equal(result.eligibility.decision, "LOCAL_FIRST");
});

test("5A.4C Stage 4B keeps Bill Split guidance local first", () => {
  const result = evaluate(
    "How does Bill Split work?",
    "/bill-split",
  );

  assert.equal(result.eligibility.decision, "LOCAL_FIRST");
});

test("5A.4C Stage 4B keeps Marketplace guidance local first", () => {
  const result = evaluate(
    "How does Marketplace work?",
    "/marketplace",
  );

  assert.equal(result.eligibility.decision, "LOCAL_FIRST");
});

test("5A.4C Stage 4B keeps Swap inside TrustVault knowledge", () => {
  const result = evaluate(
    "Can Atlas swap USDC for me?",
    "/coming-soon",
  );

  assert.notEqual(result.eligibility.decision, "ELIGIBLE");
});

test("5A.4C Stage 4B allows unrelated safe public information", () => {
  const result = evaluate(
    "What is a stablecoin?",
    "/dashboard",
  );

  assert.equal(result.eligibility.decision, "ELIGIBLE");
  assert.equal(result.eligibility.reason, "PUBLIC_INFORMATION");
});

test("5A.4C Stage 4B allows safe public business research", () => {
  const result = evaluate(
    "What should I consider when comparing online marketplaces?",
    "/dashboard",
  );

  assert.equal(result.eligibility.decision, "ELIGIBLE");
});

test("5A.4C Stage 4B eligibility never grants execution metadata", () => {
  const result = evaluate(
    "What is a stablecoin?",
    "/dashboard",
  );

  assert.equal("toolId" in result.eligibility, false);
  assert.equal("action" in result.eligibility, false);
  assert.equal("execute" in result.eligibility, false);
  assert.equal("riskLevel" in result.eligibility, false);
});
