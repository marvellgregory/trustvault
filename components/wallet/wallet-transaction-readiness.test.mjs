import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("availability and transaction readiness remain separate in UI", async () => {
  const [row, chooser, button] = await Promise.all([read("./WalletProviderRow.tsx"), read("./WalletChooser.tsx"), read("./WalletButton.tsx")]);
  assert.match(row, /Available/);
  assert.match(row, /Qualification required/);
  assert.match(chooser, /Transaction ready/);
  assert.match(chooser, /Transaction readiness pending/);
  assert.match(button, /Qualification required/);
});

test("candidate catalogue does not make undetected wallets connectable", async () => {
  const [chooser, catalogue] = await Promise.all([read("./WalletChooser.tsx"), read("../../lib/wallet/candidate-wallet-catalogue.ts")]);
  assert.match(chooser, /Not detected/);
  assert.match(catalogue, /testingStatus: "UNTESTED"/);
  assert.doesNotMatch(catalogue, /TRUSTVAULT_QUALIFIED|Officially supported|Certified/);
});

test("Package 6 uses shared registry and existing Circle/identity evidence", async () => {
  const hook = await read("./useWalletTransactionReadiness.ts");
  assert.match(hook, /getActiveWalletProviderRegistry/);
  assert.match(hook, /useWalletIdentityReconciliation/);
  assert.match(hook, /useCircleProviderBinding/);
});

test("Package 6 adds no forbidden authorization, transaction, switching, fallback, or persistence", async () => {
  const source = (await Promise.all([read("./useWalletTransactionReadiness.ts"), read("../../lib/wallet/wallet-qualification.ts"), read("../../lib/wallet/candidate-wallet-catalogue.ts")])).join("\n");
  assert.doesNotMatch(source, /eth_requestAccounts|wallet_requestPermissions|eth_sendTransaction|wallet_switchEthereumChain|wallet_addEthereumChain|window\.ethereum|eip6963:requestProvider|localStorage|sessionStorage|indexedDB/);
});
