import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && specifier.endsWith(".js") && context.parentURL?.includes("/lib/wallet/")) return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
  if (specifier.startsWith("./") && !specifier.match(/\.[cm]?[jt]s$/) && context.parentURL?.includes("/lib/wallet/")) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const connector = await import("./selected-provider-connector.ts");
const binding = await import("./selected-provider-binding.ts");
const provenance = await import("./connector-provider-provenance.ts");

const providerA = { request: async () => [] };
const providerB = { request: async () => [] };
function record(provider = providerA, overrides = {}) {
  const { identity: identityOverrides = {}, ...recordOverrides } = overrides;
  return { identity: { registryId: "eip6963:11111111-1111-4111-8111-111111111111", source: "eip6963", uuid: "11111111-1111-4111-8111-111111111111", rdns: "com.example.wallet", name: "Candidate Wallet", ...identityOverrides }, provider, aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [], ...recordOverrides };
}

test("target and deterministic namespaced ID use exact selected provider", () => {
  const target = connector.createSelectedProviderTarget(record());
  assert.equal(target.provider, providerA);
  assert.equal(target.id, connector.createSelectedProviderConnectorId(record().identity.registryId));
  assert.match(target.id, /^trustvault:selected:eip6963:/);
});

test("targeted connector construction registers the actual Wagmi connector object before provider access", () => {
  const selected = record();
  const factory = connector.createSelectedProviderConnector(selected);
  const runtimeConnector = factory({ chains: [], emitter: {}, providers: [] });
  const diagnostic = provenance.inspectConnectorProviderProvenance({ connector: runtimeConnector, selectedProvider: selected, registryProviders: [selected] });
  assert.equal(diagnostic.registered, true);
  assert.equal(diagnostic.registrationStage, "TARGET_CONSTRUCTION");
  assert.equal(diagnostic.rejectionReason, "NONE");
  assert.equal(provenance.resolveConnectorProviderProvenance({ connector: runtimeConnector, selectedProvider: selected, registryProviders: [selected] }).provider, providerA);
});

test("candidate name never changes provider authority", () => {
  for (const name of ["MetaMask", "Trust Wallet", "Phantom"]) assert.equal(connector.createSelectedProviderTarget(record(providerA, { identity: { name } })).provider, providerA);
});

test("only the selected provider target receives an authorization request", async () => {
  let selectedRequests = 0;
  let otherRequests = 0;
  const selectedProvider = { request: async () => { selectedRequests += 1; return []; } };
  const otherProvider = { request: async () => { otherRequests += 1; return []; } };
  const target = connector.createSelectedProviderTarget(record(selectedProvider));
  await target.provider.request({ method: "eth_requestAccounts" });
  assert.equal(selectedRequests, 1);
  assert.equal(otherRequests, 0);
  assert.notEqual(target.provider, otherProvider);
});

test("missing, conflicted, registry mismatch and provider replacement fail", () => {
  assert.throws(() => connector.assertConnectableProviderRecord({ record: null }), /no longer available/);
  assert.throws(() => connector.createSelectedProviderTarget(record(providerA, { state: "conflicted" })), /conflicting/);
  assert.throws(() => connector.assertConnectableProviderRecord({ record: record(), selectedRegistryId: "different" }), /selection changed/);
  assert.throws(() => connector.assertConnectableProviderRecord({ record: record(providerB), selectedRegistryId: record().identity.registryId, expectedRecord: record(providerA) }), /identity changed/);
});

test("same account in two providers cannot satisfy provider identity", () => {
  const account = "0x1111111111111111111111111111111111111111";
  const started = binding.connectingBinding(binding.selectedBinding(record()), "attempt", "connector", "now");
  const result = binding.completeBinding({ binding: started, attemptId: "attempt", expectedProvider: providerA, activeProvider: providerB, returnedAccount: account, activeAccount: account, chainId: 1, arcChainId: 2 });
  assert.equal(result.phase, "INVALIDATED");
  assert.equal(result.failure.kind, "PROVIDER_MISMATCH");
});

test("stale results, account mismatch, wrong chain and Arc readiness are deterministic", () => {
  const account = "0x1111111111111111111111111111111111111111";
  const started = binding.connectingBinding(binding.selectedBinding(record()), "attempt", "connector", "now");
  assert.equal(binding.completeBinding({ binding: started, attemptId: "old", expectedProvider: providerA, activeProvider: providerA, returnedAccount: account, activeAccount: account, chainId: 1, arcChainId: 2 }).phase, "INVALIDATED");
  assert.equal(binding.completeBinding({ binding: started, attemptId: "attempt", expectedProvider: providerA, activeProvider: providerA, returnedAccount: account, activeAccount: "0x2222222222222222222222222222222222222222", chainId: 1, arcChainId: 2 }).phase, "INVALIDATED");
  assert.equal(binding.completeBinding({ binding: started, attemptId: "attempt", expectedProvider: providerA, activeProvider: providerA, returnedAccount: account, activeAccount: account, chainId: 1, arcChainId: 2 }).phase, "CONNECTED");
  assert.equal(binding.completeBinding({ binding: started, attemptId: "attempt", expectedProvider: providerA, activeProvider: providerA, returnedAccount: account, activeAccount: account, chainId: 2, arcChainId: 2 }).phase, "ARC_READY");
});

test("rejection and prompt-already-open preserve retryable selection without fallback", () => {
  const selected = binding.selectedBinding(record());
  const started = binding.connectingBinding(selected, "attempt", "connector", "now");
  const rejected = binding.failedBinding(started, Object.assign(new Error("Rejected"), { code: 4001 }));
  const busy = binding.failedBinding(started, Object.assign(new Error("Already pending"), { code: -32002 }));
  assert.equal(rejected.phase, "REJECTED");
  assert.equal(rejected.selectedRegistryId, selected.selectedRegistryId);
  assert.equal(busy.failure.kind, "RESOURCE_UNAVAILABLE");
});
