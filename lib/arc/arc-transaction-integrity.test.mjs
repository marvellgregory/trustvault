import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";
import { encodeAbiParameters, encodeEventTopics, parseAbiItem } from "viem";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") && !specifier.endsWith(".ts") && context.parentURL?.includes("/lib/") && !context.parentURL.includes("/node_modules/")) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });

const effect = await import("./marketplace-transfer-effect.ts");
const assets = await import("./arc-testnet-assets.ts");
const transfer = parseAbiItem("event Transfer(address indexed from,address indexed to,uint256 value)");
const sender = "0x1111111111111111111111111111111111111111";
const recipient = "0x2222222222222222222222222222222222222222";
const other = "0x3333333333333333333333333333333333333333";

function log({ token = assets.ARC_TESTNET_USDC_ADDRESS, from = sender, to = recipient, value = 1_250_000n, data } = {}) {
  return { address: token, topics: encodeEventTopics({ abi: [transfer], eventName: "Transfer", args: { from, to } }), data: data ?? encodeAbiParameters([{ type: "uint256" }], [value]) };
}
function validate(logs, overrides = {}) {
  return effect.validateMarketplaceTransferEffect({ receipt: { status: "success", logs }, chainId: assets.ARC_TESTNET_CHAIN_ID, expectedSender: sender, expectedRecipient: recipient, expectedAmount: "1.25", ...overrides });
}

test("canonical Arc model distinguishes native and linked USDC precision", () => {
  assert.equal(assets.ARC_TESTNET_ASSETS.chainId, 5_042_002);
  assert.equal(assets.ARC_TESTNET_ASSETS.nativeUsdc.decimals, 18);
  assert.equal(assets.ARC_TESTNET_ASSETS.linkedUsdc.decimals, 6);
  assert.equal(assets.ARC_TESTNET_ASSETS.linkedUsdc.address, "0x3600000000000000000000000000000000000000");
});

test("exact reviewed linked-USDC transfer validates with six-decimal BigInt semantics", () => assert.equal(validate([log()]).status, "VALID"));
test("canonical validator consumes authoritative bigint base units", () => {
  assert.equal(effect.validateArcUsdcTransferEffect({ receipt: { status: "success", logs: [log()] }, chainId: assets.ARC_TESTNET_CHAIN_ID, expectedSender: sender, expectedRecipient: recipient, expectedAmountBaseUnits: 1_250_000n }).status, "VALID");
});
test("wrong recipient, amount, token, sender and chain fail closed", () => {
  assert.equal(validate([log({ to: other })]).status, "WRONG_RECIPIENT");
  assert.equal(validate([log({ value: 1_250_001n })]).status, "WRONG_AMOUNT");
  assert.equal(validate([log({ token: other })]).status, "WRONG_TOKEN");
  assert.equal(validate([log({ from: other })]).status, "WRONG_SENDER");
  assert.equal(validate([log()], { chainId: 1 }).status, "WRONG_CHAIN");
});
test("failed, missing, malformed and ambiguous transfers fail closed", () => {
  assert.equal(validate([], { receipt: { status: "reverted", logs: [] } }).status, "RECEIPT_FAILED");
  assert.equal(validate([]).status, "TRANSFER_NOT_FOUND");
  assert.equal(validate([log({ data: "0x01" })]).status, "MALFORMED_LOG");
  assert.equal(validate([log(), log()]).status, "AMBIGUOUS_TRANSFER");
});

test("all supported money boundaries consume the same live Package 6 authority", async () => {
  const paths = ["../app-kit/send.ts", "../gift-vault/create-gift.ts", "../gift-vault/claim-gift.ts", "../gift-vault/send-now.ts", "../bill-split/pay-participant-share.ts"];
  for (const path of paths) assert.match(await readFile(new URL(path, import.meta.url), "utf8"), /readinessAuthority\.assertCurrent\(\)/);
  assert.match(await readFile(new URL("../gift-vault/create-gift.ts", import.meta.url), "utf8"), /readinessAuthority\.assertCurrent\(\)[\s\S]*approve[\s\S]*readinessAuthority\.assertCurrent\(\)[\s\S]*createGift/);
});

test("Marketplace paid transition is downstream of effect validation", async () => {
  const source = await readFile(new URL("../marketplace/payments/complete-marketplace-payment.ts", import.meta.url), "utf8");
  assert.match(source, /validateMarketplaceTransferEffect/);
  assert.ok(source.indexOf("effect.status !== \"VALID\"") < source.indexOf("updatePayment"));
  assert.match(source, /order\.payment\.recipientWallet/);
  assert.match(source, /order\.payment\.amount\.amount/);
  assert.match(source, /order\.buyer\.walletAddress/);
});

test("GiftCreated and GiftClaimed validation and one-receipt finality remain intact", async () => {
  const [create, claim, marketplace] = await Promise.all([readFile(new URL("../gift-vault/create-gift.ts", import.meta.url), "utf8"), readFile(new URL("../gift-vault/claim-gift.ts", import.meta.url), "utf8"), readFile(new URL("../marketplace/payments/complete-marketplace-payment.ts", import.meta.url), "utf8")]);
  assert.match(create, /GiftCreated/);
  assert.match(claim, /GiftClaimed/);
  assert.match(marketplace, /confirmations:\s*1/);
  assert.doesNotMatch(marketplace, /confirmations:\s*(6|12)/);
});
