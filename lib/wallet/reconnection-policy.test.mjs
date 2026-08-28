import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && specifier.endsWith(".js") && context.parentURL?.includes("/lib/wallet/"))
    return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
  return nextResolve(specifier, context);
} });

const { classifyConnectorKind, reconcileWalletIdentity } =
  await import("./reconnection-policy.ts");

const provider = () => ({ request: async () => undefined });
const record = (id, walletProvider, overrides = {}) => ({
  identity: { registryId: id, source: "eip6963", uuid: id, rdns: "com.example.wallet", name: "Wallet" },
  provider: walletProvider,
  aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [],
  ...overrides,
});

test("generic and targeted connector metadata are classified without proving identity", () => {
  assert.equal(classifyConnectorKind("injected"), "generic");
  assert.equal(classifyConnectorKind("trustvault:selected:eip6963:uuid"), "targeted");
});

test("generic automatic reconnect is identity unverified", () => {
  const result = reconcileWalletIdentity({ connected: true, connectorId: "injected", registryProviders: [], freshSelection: false });
  assert.equal(result.status, "IDENTITY_UNVERIFIED");
  assert.equal(result.identityVerified, false);
});

test("account, connector ID, RDNS, and window ethereum are not identity evidence", () => {
  const result = reconcileWalletIdentity({
    connected: true,
    connectorId: "com.example.wallet",
    activeProvider: provider(),
    registryProviders: [record("one", provider())],
    freshSelection: false,
  });
  assert.equal(result.status, "IDENTITY_UNVERIFIED");
  assert.equal("account" in result, false);
  assert.equal("window" in result, false);
});

test("unique exact reference identifies current provider but does not restore selection", () => {
  const walletProvider = provider();
  const current = record("one", walletProvider);
  const result = reconcileWalletIdentity({ connected: true, activeProvider: walletProvider, registryProviders: [current], freshSelection: false });
  assert.equal(result.status, "CURRENT_PROVIDER_IDENTIFIED");
  assert.equal(result.identityVerified, false);
});

test("fresh selection plus exact reference verifies identity", () => {
  const walletProvider = provider();
  const current = record("one", walletProvider);
  const result = reconcileWalletIdentity({ connected: true, activeProvider: walletProvider, registryProviders: [current], selectedProvider: current, freshSelection: true });
  assert.equal(result.status, "IDENTITY_VERIFIED");
  assert.equal(result.identityVerified, true);
});

test("zero and ambiguous matches remain unverified", () => {
  const walletProvider = provider();
  assert.equal(reconcileWalletIdentity({ connected: true, activeProvider: walletProvider, registryProviders: [], freshSelection: false }).reason, "NO_REFERENCE_MATCH");
  assert.equal(reconcileWalletIdentity({ connected: true, activeProvider: walletProvider, registryProviders: [record("one", walletProvider), record("two", walletProvider)], freshSelection: false }).reason, "AMBIGUOUS_REFERENCE_MATCH");
});

test("conflicts and mismatching fresh selections invalidate identity", () => {
  const firstProvider = provider();
  const first = record("one", firstProvider);
  const conflict = record("conflict", firstProvider, { state: "conflicted" });
  assert.equal(reconcileWalletIdentity({ connected: true, activeProvider: firstProvider, registryProviders: [conflict], freshSelection: true, selectedProvider: conflict }).status, "IDENTITY_INVALIDATED");
  assert.equal(reconcileWalletIdentity({ connected: true, activeProvider: firstProvider, registryProviders: [first], freshSelection: true, selectedProvider: record("two", provider()) }).reason, "SELECTED_PROVIDER_MISMATCH");
});

test("same account in two wallets cannot affect reference reconciliation", () => {
  const firstProvider = provider();
  const secondProvider = provider();
  const result = reconcileWalletIdentity({ connected: true, activeProvider: firstProvider, registryProviders: [record("one", firstProvider), record("two", secondProvider)], selectedProvider: record("two", secondProvider), freshSelection: true });
  assert.equal(result.identityVerified, false);
});
