import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  return nextResolve(specifier, context);
} });

const { createCircleAdapterForOperation, createCircleProviderBinding, sanitizeCircleBinding, validateCircleBinding } = await import("./circle-provider-binding.ts");
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const CHAIN = 5042002;
const provider = { request: async ({ method }) => method === "eth_accounts" ? [ACCOUNT] : [] };
const record = { identity: { registryId: "eip6963:one", source: "eip6963", uuid: "one", rdns: "example.wallet", name: "Wallet" }, provider, aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [] };
const valid = (overrides = {}) => ({ registryActive: true, selectedRegistryId: record.identity.registryId, selectedRecord: record, verifiedProvider: provider, activeWagmiProvider: provider, identityVerified: true, connected: true, expectedAccount: ACCOUNT, activeAccount: ACCOUNT, expectedChainId: CHAIN, activeChainId: CHAIN, requiredChainId: CHAIN, bindingGeneration: "g1", currentGeneration: "g1", ...overrides });

test("identity and Arc readiness alone do not establish Circle readiness", () => {
  assert.equal(validateCircleBinding(valid({ identityVerified: false })).status, "CIRCLE_INVALIDATED");
  assert.equal(validateCircleBinding(valid({ activeWagmiProvider: undefined })).status, "CIRCLE_INVALIDATED");
});

test("provider, account, chain, conflict and generation mismatches fail closed", () => {
  const other = { request: provider.request };
  for (const input of [
    valid({ verifiedProvider: other }),
    valid({ activeWagmiProvider: other }),
    valid({ activeAccount: "0x2222222222222222222222222222222222222222" }),
    valid({ activeChainId: 1 }),
    valid({ selectedRecord: { ...record, state: "conflicted", conflicts: [{ type: "uuid-provider-mismatch", uuid: "one", detectedAt: 1 }] } }),
    valid({ currentGeneration: "g2" }),
    valid({ connected: false }),
    valid({ selectedRecord: null }),
  ]) assert.equal(validateCircleBinding(input).status, "CIRCLE_INVALIDATED");
});

test("exact provider reaches adapter factory after authorized account preflight", async () => {
  let receivedProvider;
  const binding = createCircleProviderBinding({ ...valid(), revalidate: async () => valid() });
  const result = await createCircleAdapterForOperation(binding, async ({ provider: target }) => { receivedProvider = target; return { kind: "adapter" }; });
  assert.equal(receivedProvider, provider);
  assert.equal(result.evidence.status, "CIRCLE_READY");
});

test("empty or mismatched eth_accounts fails before adapter construction", async () => {
  for (const accounts of [[], ["0x2222222222222222222222222222222222222222"]]) {
    let constructed = false;
    const exact = { request: async () => accounts };
    const exactRecord = { ...record, provider: exact };
    const state = valid({ selectedRecord: exactRecord, verifiedProvider: exact, activeWagmiProvider: exact });
    const binding = createCircleProviderBinding({ ...state, revalidate: async () => state });
    await assert.rejects(() => createCircleAdapterForOperation(binding, async () => { constructed = true; return {}; }), /authorized account/);
    assert.equal(constructed, false);
  }
});

test("sanitized evidence contains no provider, adapter, registry or functions", () => {
  const binding = createCircleProviderBinding({ ...valid(), revalidate: async () => valid() });
  const evidence = sanitizeCircleBinding(binding);
  assert.equal("provider" in evidence, false);
  assert.equal("adapter" in evidence, false);
  assert.equal("registry" in evidence, false);
  assert.doesNotMatch(JSON.stringify(evidence), /request/);
});
