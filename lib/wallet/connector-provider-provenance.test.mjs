import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const provenance = await import("./connector-provider-provenance.ts");
const provider = () => ({ request: async () => [] });
const record = (id, source, overrides = {}) => ({ identity: { registryId: id, source: "eip6963", uuid: id.slice(8), rdns: "com.example.wallet", name: "Wallet" }, provider: source, aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [], ...overrides });

test("exact connector and provider objects establish memory-only provenance", () => {
  const connector = {};
  const source = provider();
  const selected = record("eip6963:one", source);
  const stored = provenance.registerConnectorProviderProvenance({ connector, record: selected, resolvedProvider: source, now: () => 1 });
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector, selectedProvider: selected, registryProviders: [selected] }), stored);
  assert.equal(stored.provider, source);
});

test("name, RDNS and account equality cannot recover another provider", () => {
  const connector = {};
  const first = provider();
  const second = provider();
  const selected = record("eip6963:one", first);
  provenance.registerConnectorProviderProvenance({ connector, record: selected, resolvedProvider: first });
  const lookalike = record("eip6963:one", second);
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector, selectedProvider: lookalike, registryProviders: [lookalike] }), null);
});

test("provider replacement invalidates old provenance and requires fresh exact registration", () => {
  const connector = {};
  const replacementConnector = {};
  const oldProvider = provider();
  const newProvider = provider();
  const oldRecord = record("eip6963:one", oldProvider);
  const newRecord = record("eip6963:one", newProvider);
  provenance.registerConnectorProviderProvenance({ connector, record: oldRecord, resolvedProvider: oldProvider });
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector, selectedProvider: newRecord, registryProviders: [newRecord] }), null);
  provenance.registerConnectorProviderProvenance({ connector: replacementConnector, record: newRecord, resolvedProvider: newProvider });
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector: replacementConnector, selectedProvider: newRecord, registryProviders: [newRecord] })?.provider, newProvider);
});

test("conflict, missing selection and ambiguous registry records remain blocking", () => {
  const connector = {};
  const source = provider();
  const selected = record("eip6963:one", source);
  provenance.registerConnectorProviderProvenance({ connector, record: selected, resolvedProvider: source });
  const conflict = record("eip6963:one", source, { state: "conflicted", conflicts: [{ type: "uuid-provider-mismatch", uuid: "one", detectedAt: 2 }] });
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector, selectedProvider: null, registryProviders: [selected] }), null);
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector, selectedProvider: conflict, registryProviders: [conflict] }), null);
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector, selectedProvider: selected, registryProviders: [selected, selected] }), null);
});

test("unverified or mismatching provider cannot register provenance", () => {
  const selected = record("eip6963:one", provider());
  assert.throws(() => provenance.registerConnectorProviderProvenance({ connector: {}, record: selected, resolvedProvider: provider() }), /exact provider reference/);
});

test("a recreated connector cannot inherit provenance and reload-style memory starts empty", () => {
  const registeredConnector = {};
  const recreatedConnector = {};
  const source = provider();
  const selected = record("eip6963:one", source);
  provenance.registerConnectorProviderProvenance({ connector: registeredConnector, record: selected, resolvedProvider: source, registrationStage: "TARGET_CONSTRUCTION" });
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector: recreatedConnector, selectedProvider: selected, registryProviders: [selected] }), null);
  assert.equal(provenance.inspectConnectorProviderProvenance({ connector: recreatedConnector, selectedProvider: selected, registryProviders: [selected] }).rejectionReason, "PROVENANCE_NOT_REGISTERED");
});

test("shared runtime resolution recovers only construction-proven exact provider", async () => {
  const connector = { getProvider: async () => { throw new Error("Broadcast channel unavailable"); } };
  const source = provider();
  const selected = record("eip6963:one", source);
  provenance.registerConnectorProviderProvenance({ connector, record: selected, resolvedProvider: source, registrationStage: "TARGET_CONSTRUCTION" });
  const resolved = await provenance.resolveConnectorProvider({ connector, selectedProvider: selected, registryProviders: [selected] });
  assert.equal(resolved.source, "VERIFIED_PROVENANCE");
  assert.equal(resolved.provider, source);
  assert.equal(resolved.error, "Broadcast channel unavailable");
  assert.equal(resolved.connectorShape, "GET_PROVIDER_CALLABLE");
});

test("missing and non-callable getProvider never throw and require exact provenance", async () => {
  const source = provider();
  const selected = record("eip6963:shape", source);
  const missing = {};
  const nonCallable = { getProvider: "not-a-function" };
  provenance.registerConnectorProviderProvenance({ connector: missing, record: selected, resolvedProvider: source, registrationStage: "TARGET_CONSTRUCTION" });
  provenance.registerConnectorProviderProvenance({ connector: nonCallable, record: selected, resolvedProvider: source, registrationStage: "TARGET_CONSTRUCTION" });
  const missingResult = await provenance.resolveConnectorProvider({ connector: missing, selectedProvider: selected, registryProviders: [selected] });
  const nonCallableResult = await provenance.resolveConnectorProvider({ connector: nonCallable, selectedProvider: selected, registryProviders: [selected] });
  assert.equal(missingResult.source, "VERIFIED_PROVENANCE");
  assert.equal(missingResult.connectorShape, "GET_PROVIDER_MISSING");
  assert.equal(nonCallableResult.source, "VERIFIED_PROVENANCE");
  assert.equal(nonCallableResult.connectorShape, "GET_PROVIDER_NON_CALLABLE");
  assert.equal(nonCallableResult.provider, source);
});

test("missing, non-callable, wrong connector and reload-style empty provenance stay unavailable", async () => {
  const source = provider();
  const selected = record("eip6963:none", source);
  for (const connector of [{}, { getProvider: 42 }, { id: "recreated" }]) {
    const result = await provenance.resolveConnectorProvider({ connector, selectedProvider: selected, registryProviders: [selected] });
    assert.equal(result.source, "UNAVAILABLE");
    assert.equal(result.provider, undefined);
  }
});

test("callable provider resolution is authoritative and never masked by provenance", async () => {
  const expected = provider();
  const different = provider();
  const selected = record("eip6963:direct", expected);
  const exactConnector = { getProvider: async () => expected };
  const mismatchConnector = { getProvider: async () => different };
  provenance.registerConnectorProviderProvenance({ connector: mismatchConnector, record: selected, resolvedProvider: expected, registrationStage: "TARGET_CONSTRUCTION" });
  const exact = await provenance.resolveConnectorProvider({ connector: exactConnector, selectedProvider: selected, registryProviders: [selected] });
  const mismatch = await provenance.resolveConnectorProvider({ connector: mismatchConnector, selectedProvider: selected, registryProviders: [selected] });
  assert.equal(exact.source, "CONNECTOR");
  assert.equal(exact.provider, expected);
  assert.equal(mismatch.source, "CONNECTOR");
  assert.equal(mismatch.provider, different);
  assert.notEqual(mismatch.provider, selected.provider);
});

test("replacement, conflict and ambiguous registry state block shape fallback", async () => {
  const oldProvider = provider();
  const replacement = provider();
  const connector = {};
  const oldRecord = record("eip6963:block", oldProvider);
  provenance.registerConnectorProviderProvenance({ connector, record: oldRecord, resolvedProvider: oldProvider, registrationStage: "TARGET_CONSTRUCTION" });
  const replaced = record("eip6963:block", replacement);
  const conflicted = record("eip6963:block", oldProvider, { state: "conflicted", conflicts: [{ type: "uuid-provider-mismatch", uuid: "block", detectedAt: 2 }] });
  assert.equal((await provenance.resolveConnectorProvider({ connector, selectedProvider: replaced, registryProviders: [replaced] })).source, "UNAVAILABLE");
  assert.equal((await provenance.resolveConnectorProvider({ connector, selectedProvider: conflicted, registryProviders: [conflicted] })).source, "UNAVAILABLE");
  assert.equal((await provenance.resolveConnectorProvider({ connector, selectedProvider: oldRecord, registryProviders: [oldRecord, oldRecord] })).source, "UNAVAILABLE");
});
