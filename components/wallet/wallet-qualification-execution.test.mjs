import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("lab is development-only and runs checks without arbitrary PASS control", async () => {
  const [lab, chooser, hook] = await Promise.all([read("./WalletQualificationLab.tsx"), read("./WalletChooser.tsx"), read("./useWalletQualificationExecution.ts")]);
  assert.match(lab, /process\.env\.NODE_ENV !== "development"/);
  assert.match(chooser, /process\.env\.NODE_ENV === "development"/);
  assert.match(lab, /Run qualification checks/);
  assert.doesNotMatch(lab, /Mark (wallet )?qualified|recordPass|self-cert/i);
  assert.match(hook, /developmentQualificationHarness\.record/);
});

test("Package 7 remains the sole qualification evidence authority", async () => {
  const hook = await read("./useWalletQualificationExecution.ts");
  assert.match(hook, /developmentQualificationHarness/);
  assert.doesNotMatch(hook, /createQualificationHarness/);
});

test("no browser-global API, persistence, authorization, transaction, signing or switching is introduced", async () => {
  const source = (await Promise.all([read("./WalletQualificationLab.tsx"), read("./useWalletQualificationExecution.ts"), read("../../lib/wallet/qualification-execution.ts")])).join("\n");
  assert.doesNotMatch(source, /window\.|globalThis|localStorage|sessionStorage|indexedDB|document\.cookie|eth_requestAccounts|wallet_requestPermissions|eth_sendTransaction|wallet_sendCalls|personal_sign|eth_sign|eth_signTypedData|wallet_switchEthereumChain|wallet_addEthereumChain/);
});

test("unsupported-network action can only submit failure observation", async () => {
  const [lab, execution] = await Promise.all([read("./WalletQualificationLab.tsx"), read("../../lib/wallet/qualification-execution.ts")]);
  assert.match(lab, /Record unsupported-network observation/);
  assert.match(execution, /unsupportedNetworkObservation/);
  assert.match(execution, /outcome: phase/);
});

test("Bybit is not activated or represented as qualified", async () => {
  const source = (await Promise.all([read("./WalletQualificationLab.tsx"), read("./useWalletQualificationExecution.ts"), read("../../lib/wallet/qualification-execution.ts")])).join("\n");
  assert.doesNotMatch(source, /Bybit|BYBIT|qualifiedWallet|supportedWallet/);
});
