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

function log({ token = assets.ARC_TESTNET_USDC_ADDRESS, from = sender, to = recipient, value = 2_500_001n, data } = {}) {
  return { address: token, topics: encodeEventTopics({ abi: [transfer], eventName: "Transfer", args: { from, to } }), data: data ?? encodeAbiParameters([{ type: "uint256" }], [value]) };
}

function validate(logs, overrides = {}) {
  return effect.validateArcUsdcTransferEffect({ receipt: { status: "success", logs }, chainId: assets.ARC_TESTNET_CHAIN_ID, expectedSender: sender, expectedRecipient: recipient, expectedAmountBaseUnits: 2_500_001n, ...overrides });
}

test("canonical direct-transfer validation accepts only the exact effect", () => assert.equal(validate([log()]).status, "VALID"));
test("recipient, amount, sender, token, and chain mismatches fail closed", () => {
  assert.equal(validate([log({ to: other })]).status, "WRONG_RECIPIENT");
  assert.equal(validate([log({ value: 2_500_002n })]).status, "WRONG_AMOUNT");
  assert.equal(validate([log({ from: other })]).status, "WRONG_SENDER");
  assert.equal(validate([log({ token: other })]).status, "WRONG_TOKEN");
  assert.equal(validate([log()], { chainId: 1 }).status, "WRONG_CHAIN");
});
test("failed, missing, malformed, and ambiguous effects fail closed", () => {
  assert.equal(validate([], { receipt: { status: "reverted", logs: [] } }).status, "RECEIPT_FAILED");
  assert.equal(validate([]).status, "TRANSFER_NOT_FOUND");
  assert.equal(validate([log({ data: "0x01" })]).status, "MALFORMED_LOG");
  assert.equal(validate([log(), log()]).status, "AMBIGUOUS_TRANSFER");
});

test("Gift Send Now validates immutable pending evidence before returning success", async () => {
  const source = await readFile(new URL("../gift-vault/send-now.ts", import.meta.url), "utf8");
  assert.match(source, /expectedSender: pending\.sender/);
  assert.match(source, /expectedRecipient: pending\.recipient/);
  assert.match(source, /expectedAmountBaseUnits: BigInt\(pending\.amountBaseUnits\)/);
  assert.ok(source.indexOf("effect.status !== \"VALID\"") < source.indexOf("blockNumber: receipt.blockNumber"));
});

test("Bill Split validates immutable recovery evidence before marking paid", async () => {
  const source = await readFile(new URL("../bill-split/pay-participant-share.ts", import.meta.url), "utf8");
  assert.match(source, /expectedSender: input\.pendingPayment\.payerAddress/);
  assert.match(source, /expectedRecipient: input\.pendingPayment\.organizerAddress/);
  assert.match(source, /expectedAmountBaseUnits: BigInt\(input\.pendingPayment\.amountBaseUnits\)/);
  assert.ok(source.indexOf("effect.status !== \"VALID\"") < source.indexOf("markParticipantPaid"));
  assert.ok(source.indexOf("markParticipantPaid") < source.indexOf("billSplitPaymentRecovery.remove"));
});

test("receipt lookup failure cannot reach either product success boundary", async () => {
  const [gift, bill] = await Promise.all([
    readFile(new URL("../gift-vault/send-now.ts", import.meta.url), "utf8"),
    readFile(new URL("../bill-split/pay-participant-share.ts", import.meta.url), "utf8"),
  ]);
  assert.ok(gift.indexOf("waitForReceipt(publicClient, pending.txHash)") < gift.indexOf("const effect = validateArcUsdcTransferEffect"));
  assert.ok(bill.indexOf("waitForTransactionReceipt") < bill.indexOf("const effect = validateArcUsdcTransferEffect"));
});
