import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && !specifier.endsWith(".ts")) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const policy = await import("./candidate-wallet-catalogue.ts");
const provider = () => ({ request: async () => [] });
const record = (name, rdns, overrides = {}) => ({ identity: { registryId: `eip6963:${name}`, source: "eip6963", uuid: `${name}-uuid`, name, rdns }, provider: provider(), aliases: [], state: "available", announcedAt: 1, lastSeenAt: 1, conflicts: [], ...overrides });

test("only the three manually qualified families are production enabled", () => {
  const availability = Object.fromEntries(policy.CANDIDATE_WALLET_CATALOGUE.map((item) => [item.displayName, item.productionAvailability]));
  assert.equal(availability.MetaMask, "ENABLED");
  assert.equal(availability["Binance Wallet"], "ENABLED");
  assert.equal(availability["Bitget Wallet"], "ENABLED");
  assert.equal(availability["Trust Wallet"], "COMING_SOON");
  assert.equal(availability.Phantom, "ARC_UNAVAILABLE");
  assert.equal(availability["Bybit Wallet"], "COMING_SOON");
});

test("actionability requires an exact approved family metadata pair", () => {
  assert.equal(policy.getProductionWalletPolicy(record("MetaMask", "io.metamask")).actionable, true);
  assert.equal(policy.getProductionWalletPolicy(record("Binance Wallet", "com.binance.wallet")).actionable, true);
  assert.equal(policy.getProductionWalletPolicy(record("Bitget Wallet", "com.bitget.web3")).actionable, true);
  assert.equal(policy.getProductionWalletPolicy(record("MetaMask", "com.unknown.wallet")).actionable, false);
  assert.equal(policy.getProductionWalletPolicy(record("Unknown Wallet", "io.metamask")).actionable, false);
  assert.equal(policy.getProductionWalletPolicy(record("Unknown Wallet", "com.unknown.wallet")).actionable, false);
});

test("non-qualified and conflicted providers cannot become production actionable", () => {
  for (const [name, rdns] of [["Trust Wallet", "com.trustwallet.app"], ["Phantom", "app.phantom"], ["Bybit Wallet", "com.bybit"]]) {
    assert.equal(policy.getProductionWalletPolicy(record(name, rdns)).actionable, false);
  }
  const conflict = record("MetaMask", "io.metamask", { state: "conflicted", conflicts: [{ type: "uuid-provider-mismatch", uuid: "x", detectedAt: 2 }] });
  assert.equal(policy.getProductionWalletPolicy(conflict).actionable, false);
  assert.throws(() => policy.assertProductionWalletActionable(conflict), /not currently available/);
});

test("allowlist contains no runtime or transaction authority", () => {
  const serialized = JSON.stringify(policy.CANDIDATE_WALLET_CATALOGUE);
  assert.doesNotMatch(serialized, /providerIdentityKey|providerReference|account|TRANSACTION_READY|QUALIFIED/);
  assert.ok(policy.CANDIDATE_WALLET_CATALOGUE.every((item) => item.notes.includes("presentation only")));
});

test("production gates connection while development retains discovery diagnostics", async () => {
  const [registryHook, connectionHook, chooser] = await Promise.all([
    readFile(new URL("../../components/wallet/useWalletProviderRegistry.ts", import.meta.url), "utf8"),
    readFile(new URL("../../components/wallet/useSelectedProviderConnection.ts", import.meta.url), "utf8"),
    readFile(new URL("../../components/wallet/WalletChooser.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(registryHook, /assertProductionWalletActionable/);
  assert.match(connectionHook, /assertProductionWalletActionable/);
  assert.match(chooser, /process\.env\.NODE_ENV === "development" \? providers/);
  assert.match(chooser, /Supported and tested/);
  assert.match(chooser, /userFacingReason/);
  assert.doesNotMatch(chooser, /eth_requestAccounts|window\.ethereum|TRANSACTION_READY\s*=/);
});
