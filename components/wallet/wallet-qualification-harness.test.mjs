import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("connected chooser copy replaces pre-authorization wording", async () => {
  const chooser = await read("./WalletChooser.tsx");
  assert.match(chooser, /Connected with/);
  assert.match(chooser, /Selected provider identity verified/);
  assert.match(chooser, /This does not authorize an account until you continue/);
});

test("qualification harness is internal, memory-only, and has no public control", async () => {
  const [hook, harness, chooser] = await Promise.all([read("./useWalletQualificationHarness.ts"), read("../../lib/wallet/qualification-harness.ts"), read("./WalletChooser.tsx")]);
  assert.match(harness, /process\.env\.NODE_ENV !== "production"/);
  assert.match(harness, /WeakMap/);
  assert.doesNotMatch(chooser, /mark qualified|record qualification|self-cert/i);
  assert.doesNotMatch(`${hook}\n${harness}`, /localStorage|sessionStorage|indexedDB|window\.ethereum/);
});

test("Package 7 adds no authorization, transaction, or chain switching", async () => {
  const source = (await Promise.all([read("./useWalletQualificationHarness.ts"), read("../../lib/wallet/qualification-harness.ts")])).join("\n");
  assert.doesNotMatch(source, /eth_requestAccounts|wallet_requestPermissions|eth_sendTransaction|wallet_switchEthereumChain|wallet_addEthereumChain/);
});
