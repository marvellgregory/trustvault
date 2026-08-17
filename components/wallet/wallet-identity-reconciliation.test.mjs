import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier.startsWith("./") && specifier.endsWith(".js") && context.parentURL?.includes("/lib/wallet/")) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { reconcileActiveConnector } = await import("./useWalletIdentityReconciliation.ts");
const { registerConnectorProviderProvenance } = await import("../../lib/wallet/connector-provider-provenance.ts");

function record(id, provider, state = "available") {
  return { identity: { registryId: id, source: "eip6963", uuid: id.slice(8), rdns: "com.example.wallet", name: "Wallet" }, provider, aliases: [], state, announcedAt: 1, lastSeenAt: 1, conflicts: [] };
}

test("matching fresh selection verifies without requesting accounts", async () => {
  let providerRequests = 0;
  const provider = { request: async () => { providerRequests += 1; } };
  const selected = record("eip6963:11111111-1111-4111-8111-111111111111", provider);
  const result = await reconcileActiveConnector({ connected: true, connector: { id: "injected", getProvider: async () => provider }, registryProviders: [selected], selectedProvider: selected, freshSelection: true });
  assert.equal(result.status, "IDENTITY_VERIFIED");
  assert.equal(providerRequests, 0);
});

test("mismatching selection performs no connection or switch", async () => {
  let calls = 0;
  const active = { request: async () => { calls += 1; } };
  const selected = { request: async () => { calls += 1; } };
  const result = await reconcileActiveConnector({ connected: true, connector: { id: "injected", getProvider: async () => active }, registryProviders: [record("eip6963:11111111-1111-4111-8111-111111111111", active), record("eip6963:22222222-2222-4222-8222-222222222222", selected)], selectedProvider: record("eip6963:22222222-2222-4222-8222-222222222222", selected), freshSelection: true });
  assert.equal(result.status, "IDENTITY_INVALIDATED");
  assert.equal(calls, 0);
});

test("verified exact provenance survives a later broadcast-channel provider accessor failure", async () => {
  const provider = { request: async () => [] };
  const selected = record("eip6963:11111111-1111-4111-8111-111111111111", provider);
  const connector = { id: "trustvault:selected:eip6963:one", getProvider: async () => { throw new Error("Broadcast channel unavailable"); } };
  registerConnectorProviderProvenance({ connector, record: selected, resolvedProvider: provider, registrationStage: "TARGET_CONSTRUCTION" });
  const result = await reconcileActiveConnector({ connected: true, connector, registryProviders: [selected], selectedProvider: selected, freshSelection: true });
  assert.equal(result.status, "IDENTITY_VERIFIED");
  assert.equal(result.providerResolution, "VERIFIED_PROVENANCE");
  assert.equal(result.provenanceRegistered, true);
  assert.equal(result.provenanceRegistrationStage, "TARGET_CONSTRUCTION");
  assert.equal(result.providerResolutionError, "Broadcast channel unavailable");
});

test("broadcast failure without previously verified exact provenance remains unverified", async () => {
  const provider = { request: async () => [] };
  const selected = record("eip6963:11111111-1111-4111-8111-111111111111", provider);
  const result = await reconcileActiveConnector({ connected: true, connector: { id: "injected", getProvider: async () => { throw new Error("Broadcast channel unavailable"); } }, registryProviders: [selected], selectedProvider: selected, freshSelection: true });
  assert.equal(result.status, "IDENTITY_UNVERIFIED");
  assert.equal(result.providerResolution, "UNAVAILABLE");
});

test("simulated reload has no selected identity", async () => {
  const source = await readFile(new URL("./useWalletProviderRegistry.ts", import.meta.url), "utf8");
  assert.match(source, /publishSharedSnapshot\(EMPTY_SNAPSHOT\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|cookie/);
});

test("existing generic connect, connected menu, and Arc switch remain intact", async () => {
  const source = await readFile(new URL("./WalletButton.tsx", import.meta.url), "utf8");
  assert.match(source, /connect\(\{ connector: injectedConnector \}\)/);
  assert.match(source, /Connected wallet/);
  assert.match(source, /switchChain\(\{ chainId: arcTestnet\.id \}\)/);
});
