import assert from "node:assert/strict";
import test from "node:test";

import { classifyAtlasIntent } from "./atlas-intent.ts";

const CASES = [
  ["show me products", "marketplace", "learn"],
  ["what can I buy", "marketplace", "learn"],
  ["where's my order", "marketplace-order", "lookup"],
  ["what did I buy", "marketplace-order", "lookup"],
  ["where's my parcel", "delivery-tracking", "lookup"],
  ["has my package moved", "delivery-tracking", "lookup"],
  ["give someone USDC", "gift-vault", "start"],
  ["send money as a gift", "gift-vault", "start"],
  ["split this between us", "bill-split", "start"],
  ["share this expense", "bill-split", "start"],
  ["proof of payment", "receipts", "learn"],
  ["show my payment proof", "receipts", "lookup"],
  ["connect MetaMask", "wallet", "learn"],
  ["verify this payment", "trust-center", "learn"],
  ["I need assistance", "help", "learn"],
  ["recent transactions", "activity", "learn"],
  ["things I saved", "wishlist", "learn"],
  ["what's in my basket", "cart", "learn"],
  ["exchange USDC", "swap", "learn"],
];

test("5A.4C Stage 2: natural language resolves to the intended feature", () => {
  for (const [message, feature, purpose] of CASES) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.feature, feature, message);
    assert.equal(result.purpose, purpose, message);
    assert.equal(result.didYouMean, false, message);
  }
});

test("5A.4C Stage 2: owned natural-language records use only approved private tools", () => {
  const cases = [
    ["where's my order", "find_my_marketplace_orders"],
    ["what did I buy", "find_my_marketplace_orders"],
    ["where's my parcel", "get_my_order_delivery"],
    ["has my package moved", "get_my_order_delivery"],
    ["show my payment proof", "find_my_receipts"],
  ];

  for (const [message, toolId] of cases) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.purpose, "lookup", message);
    assert.equal(result.requiresPrivateData, true, message);
    assert.equal(result.toolId, toolId, message);
  }
});

test("5A.4C Stage 2: generic natural-language guidance does not become private lookup", () => {
  const messages = [
    "proof of payment",
    "delivery status",
    "send money as a gift",
    "share this expense",
  ];

  for (const message of messages) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.requiresPrivateData, false, message);
    assert.equal(result.toolId, undefined, message);
  }
});

test("5A.4C Stage 2: fuzzy private-capable feature remains suggestion-only", () => {
  const result = classifyAtlasIntent("bil splt");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.didYouMean, true);
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("5A.4C Stage 2: diagnosis still outranks natural-language private lookup", () => {
  const result = classifyAtlasIntent("why has my package failed");

  assert.equal(result.intent, "diagnosis");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("5A.4C Stage 2: Swap language never exposes a private tool", () => {
  for (const message of [
    "exchange USDC",
    "exchange tokens",
    "convert USDC",
  ]) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.feature, "swap", message);
    assert.equal(result.requiresPrivateData, false, message);
    assert.equal(result.toolId, undefined, message);
  }
});

test("5A.4C Stage 2: unsupported requests still do not fabricate capabilities", () => {
  for (const message of [
    "book me a flight",
    "reserve a hotel room",
    "order me a taxi",
    "order some food",
    "purchase an airline ticket",
  ]) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.feature, undefined, message);
    assert.equal(result.requiresPrivateData, false, message);
    assert.equal(result.toolId, undefined, message);
  }
});
