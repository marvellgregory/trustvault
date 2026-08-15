import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    if (specifier.startsWith("./") && specifier.endsWith(".js") && context.parentURL?.includes("/lib/wallet/")) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { activateWalletProviderRegistry, createWalletChooserProviderItems } =
  await import("./useWalletProviderRegistry.ts");

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

const provider = () => ({ request: async () => undefined });
const detail = (uuid, walletProvider, overrides = {}) => ({
  info: { uuid, rdns: "com.example.wallet", name: "Example Wallet", icon: "", ...overrides },
  provider: walletProvider,
});

function announce(target, value) {
  const event = new Event("eip6963:announceProvider");
  Object.defineProperty(event, "detail", { value });
  target.dispatchEvent(event);
}

function setup() {
  const transport = new EventTarget();
  const snapshots = [];
  const active = activateWalletProviderRegistry({
    transport,
    onSnapshot: (snapshot) => snapshots.push(snapshot),
  });
  return { active, snapshots, transport };
}

test("zero providers and one provider never auto-select", () => {
  const { active, snapshots, transport } = setup();
  assert.deepEqual(createWalletChooserProviderItems(snapshots.at(-1)), []);
  announce(transport, detail(UUID_A, provider()));
  const items = createWalletChooserProviderItems(snapshots.at(-1));
  assert.equal(items.length, 1);
  assert.equal(items[0].selected, false);
  assert.equal(items[0].status, "DETECTED");
  active.dispose();
});

test("multiple providers require explicit selection and show it", () => {
  const { active, snapshots, transport } = setup();
  announce(transport, detail(UUID_A, provider()));
  announce(transport, detail(UUID_B, provider(), { rdns: "com.second.wallet" }));
  let items = createWalletChooserProviderItems(snapshots.at(-1));
  assert.ok(items.every((item) => !item.selected));
  active.registry.select(items[1].identity.registryId);
  items = createWalletChooserProviderItems(snapshots.at(-1));
  assert.equal(items.filter((item) => item.selected).length, 1);
  assert.equal(items[1].selected, true);
  active.dispose();
});

test("duplicate announcements do not duplicate rows", () => {
  const { active, snapshots, transport } = setup();
  const walletProvider = provider();
  announce(transport, detail(UUID_A, walletProvider));
  announce(transport, detail(UUID_A, walletProvider));
  assert.equal(createWalletChooserProviderItems(snapshots.at(-1)).length, 1);
  active.dispose();
});

test("conflicted providers are handled safely", () => {
  const { active, snapshots, transport } = setup();
  announce(transport, detail(UUID_A, provider()));
  announce(transport, detail(UUID_A, provider()));
  const item = createWalletChooserProviderItems(snapshots.at(-1))[0];
  assert.equal(item.selectable, false);
  assert.throws(() => active.registry.select(item.identity.registryId), /conflicting/);
  active.dispose();
});

test("invalid metadata is rejected and unsafe icons use fallback", () => {
  const { active, snapshots, transport } = setup();
  announce(transport, detail("invalid", provider()));
  assert.equal(createWalletChooserProviderItems(snapshots.at(-1)).length, 0);
  announce(transport, detail(UUID_A, provider(), {
    name: " <Safe>\u0000 Wallet ",
    icon: "javascript:alert(1)",
  }));
  const item = createWalletChooserProviderItems(snapshots.at(-1))[0];
  assert.equal(item.identity.name, "Safe Wallet");
  assert.equal(item.identity.icon, undefined);
  active.dispose();
});

test("candidate names never imply qualification", () => {
  const { active, snapshots, transport } = setup();
  const names = ["MetaMask", "Trust Wallet", "Bitget Wallet", "Binance Wallet", "Bybit Wallet", "Phantom"];
  names.forEach((name, index) => {
    const uuid = `${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`;
    announce(transport, detail(uuid, provider(), { name, rdns: `com.candidate${index}.wallet` }));
  });
  const items = createWalletChooserProviderItems(snapshots.at(-1));
  assert.ok(items.every((item) => item.status === "DETECTED"));
  assert.ok(items.every((item) => item.status !== "TRUSTVAULT_QUALIFIED"));
  active.dispose();
});

test("registry lifecycle starts, requests once, and stops", () => {
  const transport = new EventTarget();
  let requests = 0;
  transport.addEventListener("eip6963:requestProvider", () => requests++);
  const active = activateWalletProviderRegistry({ transport, onSnapshot: () => undefined });
  assert.equal(active.registry.getSnapshot().lifecycle, "active");
  assert.equal(requests, 1);
  active.dispose();
  assert.equal(active.registry.getSnapshot().lifecycle, "idle");
});

test("status labels, security notice, and support disclaimer render in source", async () => {
  const [badge, chooser, notice] = await Promise.all([
    readFile(new URL("./WalletStatusBadge.tsx", import.meta.url), "utf8"),
    readFile(new URL("./WalletChooser.tsx", import.meta.url), "utf8"),
    readFile(new URL("./WalletSecurityNotice.tsx", import.meta.url), "utf8"),
  ]);
  for (const status of ["DETECTED", "CONNECTED", "ARC_READY", "COMPATIBLE", "TRUSTVAULT_QUALIFIED"]) {
    assert.match(badge, new RegExp(status));
  }
  assert.match(chooser, /More wallets as they are qualified/);
  assert.match(chooser, /do not mean a wallet is supported/);
  assert.match(notice, /TrustVault never asks for your recovery phrase or private key\./);
});

test("existing Wagmi connection remains separate from chooser selection", async () => {
  const [button, chooser] = await Promise.all([
    readFile(new URL("./WalletButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("./WalletChooser.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(button, /connect\(\{ connector: injectedConnector \}\)/);
  assert.match(button, /onClick=\{\(\) => setChooserOpen\(true\)\}/);
  assert.match(button, /Wallet options/);
  assert.match(button, /detected, not connected/);
  assert.doesNotMatch(chooser, /connect\(\{ connector:/);
  assert.doesNotMatch(chooser, /eth_requestAccounts|eth_sendTransaction/);
});
