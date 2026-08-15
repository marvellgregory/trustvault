import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");

test("selection and connection are separate explicit actions", async () => {
  const chooser = await read("./WalletChooser.tsx");
  assert.match(chooser, /onProviderSelected\(selectProvider\(providerId\)\)/);
  assert.match(chooser, /Connect selected wallet/);
  assert.match(chooser, /onClick=\{\(\) => void connectSelected\(\)\}/);
});

test("selected connection uses targeted Wagmi connectAsync only", async () => {
  const hook = await read("./useSelectedProviderConnection.ts");
  assert.match(hook, /connectAsync\(\{ connector \}\)/);
  assert.match(hook, /createSelectedProviderConnector\(record\)/);
  assert.doesNotMatch(hook, /eth_requestAccounts|window\.ethereum|wallet_switchEthereumChain|wallet_addEthereumChain/);
});

test("pending attempt is single-flight and stale results are rejected", async () => {
  const hook = await read("./useSelectedProviderConnection.ts");
  assert.match(hook, /if \(pending\.current\) return/);
  assert.match(hook, /activeAttempt\.current !== attemptId/);
  assert.match(hook, /current\?\.provider !== record\.provider/);
});

test("availability and not-detected UI are evidence based", async () => {
  const [chooser, row] = await Promise.all([read("./WalletChooser.tsx"), read("./WalletProviderRow.tsx")]);
  assert.match(row, /item\.selectable/);
  assert.match(row, /Available/);
  assert.match(row, /bg-emerald-400\/10/);
  assert.match(row, /Provider conflict/);
  assert.match(chooser, /detectedCandidateNames/);
  assert.match(chooser, /Not detected/);
  assert.doesNotMatch(chooser, /TRUSTVAULT_QUALIFIED/);
});

test("generic compatibility connect and explicit Arc switch remain", async () => {
  const button = await read("./WalletButton.tsx");
  assert.match(button, /connect\(\{ connector: injectedConnector \}\)/);
  assert.match(button, /switchChain\(\{ chainId: arcTestnet\.id \}\)/);
});

test("no persistence or transaction behavior is introduced", async () => {
  const files = await Promise.all([read("./useSelectedProviderConnection.ts"), read("./WalletChooser.tsx")]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|eth_sendTransaction|sendTransaction|writeContract/);
});
