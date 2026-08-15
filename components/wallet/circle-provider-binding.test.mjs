import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Circle operational provider selection contains no independent discovery", async () => {
  const source = await read("../../lib/app-kit/browser-wallet.ts");
  assert.match(source, /createCircleAdapterForOperation/);
  assert.doesNotMatch(source, /eip6963:requestProvider|announceProvider|window\.ethereum|MetaMask|preferredWalletRdns|\.rdns|\.name/);
});

test("Marketplace estimate and send receive explicit Circle binding without semantic changes", async () => {
  const [estimate, send, marketplace] = await Promise.all([read("../../lib/app-kit/send-estimate.ts"), read("../../lib/app-kit/send.ts"), read("../../lib/app-kit/send-marketplace-payment.ts")]);
  assert.match(estimate, /circleBinding/);
  assert.match(estimate, /chain: "Arc_Testnet"/);
  assert.match(estimate, /token: "USDC"/);
  assert.match(send, /circleBinding/);
  assert.match(send, /chain: "Arc_Testnet"/);
  assert.match(send, /token: "USDC"/);
  assert.match(marketplace, /circleBinding: input\.circleBinding/);
});

test("production Package 5 adds no raw authorization, bridge, swap, or persistence", async () => {
  const source = (await Promise.all([read("../../lib/app-kit/circle-provider-binding.ts"), read("./useCircleProviderBinding.ts"), read("../../lib/app-kit/browser-wallet.ts")])).join("\n");
  assert.doesNotMatch(source, /eth_requestAccounts|wallet_requestPermissions|window\.ethereum|eip6963:requestProvider|localStorage|sessionStorage|indexedDB|\.bridge\(|\.swap\(/);
});

test("reload defaults to unbound and current registry revision drives generation", async () => {
  const [binding, hook] = await Promise.all([read("../../lib/app-kit/circle-provider-binding.ts"), read("./useCircleProviderBinding.ts")]);
  assert.match(binding, /CIRCLE_UNBOUND/);
  assert.match(hook, /bindingGeneration/);
  assert.match(hook, /getActiveWalletProviderRegistry/);
});
