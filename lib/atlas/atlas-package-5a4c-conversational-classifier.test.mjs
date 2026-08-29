import assert from "node:assert/strict";
import test from "node:test";

import { classifyAtlasIntent } from "./atlas-intent.ts";

test("5A.4C Stage 2B classifier uses conversational fallback", () => {
  const cases = [
    ["did anything happen with my delivery", "delivery-tracking", "learn"],
    ["how do I pay everyone back", "bill-split", "start"],
    ["I want to give my friend something", "gift-vault", "start"],
    ["where can I see what I bought", "marketplace-order", "learn"],
    ["how do I prove I paid", "receipts", "learn"],
    ["show me what I've been doing", "activity", "learn"],
    ["can you check if this is legit", "trust-center", "learn"],
  ];

  for (const [message, feature, purpose] of cases) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.feature, feature, message);
    assert.equal(result.purpose, purpose, message);
    assert.equal(result.requiresPrivateData, false, message);
    assert.equal(result.toolId, undefined, message);
    assert.equal(result.didYouMean, false, message);
  }
});

test("5A.4C Stage 2B exact feature resolution still outranks conversational fallback", () => {
  const result = classifyAtlasIntent("where's my order");

  assert.equal(result.feature, "marketplace-order");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "find_my_marketplace_orders");
});

test("5A.4C Stage 2B diagnosis still outranks conversational fallback", () => {
  const result = classifyAtlasIntent(
    "why did anything happen with my delivery",
  );

  assert.equal(result.intent, "diagnosis");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("5A.4C Stage 2B navigation still outranks conversational fallback", () => {
  const result = classifyAtlasIntent(
    "open marketplace so I can see what I bought",
  );

  assert.equal(result.intent, "navigation");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("5A.4C Stage 2B fuzzy private feature remains suggestion-only", () => {
  const result = classifyAtlasIntent("bil splt");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.didYouMean, true);
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("5A.4C Stage 2B conversational ownership never grants private lookup", () => {
  for (const message of [
    "did anything happen with my delivery",
    "where can I see what I bought",
    "how do I prove I paid",
  ]) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.requiresPrivateData, false, message);
    assert.equal(result.toolId, undefined, message);
  }
});

test("5A.4C Stage 2B unsupported conversation still remains generic", () => {
  for (const message of [
    "book me a hotel",
    "call me a taxi",
    "what movie should I watch",
    "buy me a plane ticket",
  ]) {
    const result = classifyAtlasIntent(message);

    assert.equal(result.feature, undefined, message);
    assert.equal(result.requiresPrivateData, false, message);
    assert.equal(result.toolId, undefined, message);
  }
});
