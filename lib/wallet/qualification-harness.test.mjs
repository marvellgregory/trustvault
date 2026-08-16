import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const harnessModule = await import("./qualification-harness.ts");
const providerA = { request: async () => [] };
const providerB = { request: async () => [] };

test("brand, RDNS, and account data cannot create qualification evidence", () => {
  const harness = harnessModule.createQualificationHarness({ recordingEnabled: true });
  assert.equal(harness.getEvidence(providerA, "generation-1"), null);
});

test("passed evidence is exact-provider and runtime-generation specific", () => {
  const harness = harnessModule.createQualificationHarness({ recordingEnabled: true });
  harness.record({ provider: providerA, providerIdentityKey: "eip6963:metamask", qualificationGeneration: "generation-1", outcome: "PASSED" });
  assert.equal(harness.getEvidence(providerA, "generation-1")?.outcome, "PASSED");
  assert.equal(harness.getEvidence(providerB, "generation-1"), null);
  assert.equal(harness.getEvidence(providerA, "generation-2"), null);
});

test("same account across providers cannot cross-qualify", () => {
  const harness = harnessModule.createQualificationHarness({ recordingEnabled: true });
  harness.record({ provider: providerA, providerIdentityKey: "provider-a", qualificationGeneration: "same-account", outcome: "PASSED" });
  assert.equal(harness.getEvidence(providerB, "same-account"), null);
});

test("failed and invalidated evidence never maps to qualified", () => {
  const harness = harnessModule.createQualificationHarness({ recordingEnabled: true });
  const failed = harness.record({ provider: providerA, providerIdentityKey: "unknown", qualificationGeneration: "g", outcome: "FAILED", reasons: ["Test failed."] });
  assert.equal(harnessModule.toWalletQualificationEvidence(failed)?.status, "INCOMPATIBLE");
  const invalidated = harness.invalidate(providerA, "g", "Chain changed.");
  assert.equal(harnessModule.toWalletQualificationEvidence(invalidated)?.status, "TEST_REQUIRED");
});

test("production-disabled harness rejects recording", () => {
  const harness = harnessModule.createQualificationHarness({ recordingEnabled: false });
  assert.throws(() => harness.record({ provider: providerA, providerIdentityKey: "a", qualificationGeneration: "g", outcome: "PASSED" }), /disabled in production/);
});

test("serialized evidence contains no provider or runtime object", () => {
  const harness = harnessModule.createQualificationHarness({ recordingEnabled: true });
  const evidence = harness.record({ provider: providerA, providerIdentityKey: "unknown", qualificationGeneration: "g", outcome: "PASSED" });
  assert.doesNotMatch(JSON.stringify(evidence), /"provider"\s*:|"request"\s*:|"connector"\s*:|"adapter"\s*:|"registry"\s*:|function/i);
});
