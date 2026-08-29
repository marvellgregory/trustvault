import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveAtlasConversationalIntent,
} from "./atlas-conversational-intent.ts";

test("5A.4C Stage 2B resolves conversational delivery language", () => {
  const result = resolveAtlasConversationalIntent(
    "did anything happen with my delivery",
  );

  assert.equal(result?.feature, "delivery-tracking");
  assert.equal(result?.purpose, "learn");
});

test("5A.4C Stage 2B resolves conversational Bill Split language", () => {
  const result = resolveAtlasConversationalIntent(
    "how do I pay everyone back",
  );

  assert.equal(result?.feature, "bill-split");
  assert.equal(result?.purpose, "start");
});

test("5A.4C Stage 2B resolves conversational gifting language", () => {
  const result = resolveAtlasConversationalIntent(
    "I want to give my friend something",
  );

  assert.equal(result?.feature, "gift-vault");
  assert.equal(result?.purpose, "start");
});

test("5A.4C Stage 2B resolves conversational order history language", () => {
  const result = resolveAtlasConversationalIntent(
    "where can I see what I bought",
  );

  assert.equal(result?.feature, "marketplace-order");
  assert.equal(result?.purpose, "learn");
});

test("5A.4C Stage 2B resolves conversational receipt language", () => {
  const result = resolveAtlasConversationalIntent(
    "how do I prove I paid",
  );

  assert.equal(result?.feature, "receipts");
  assert.equal(result?.purpose, "learn");
});

test("5A.4C Stage 2B resolves conversational activity language", () => {
  const result = resolveAtlasConversationalIntent(
    "show me what I've been doing",
  );

  assert.equal(result?.feature, "activity");
  assert.equal(result?.purpose, "learn");
});

test("5A.4C Stage 2B resolves conversational trust language", () => {
  const result = resolveAtlasConversationalIntent(
    "can you check if this is legit",
  );

  assert.equal(result?.feature, "trust-center");
  assert.equal(result?.purpose, "learn");
});

test("5A.4C Stage 2B never exposes execution metadata", () => {
  const result = resolveAtlasConversationalIntent(
    "how do I pay everyone back",
  );

  assert.ok(result);
  assert.equal("toolId" in result, false);
  assert.equal("requiresPrivateData" in result, false);
  assert.equal("action" in result, false);
});

test("5A.4C Stage 2B leaves unsupported conversation unresolved", () => {
  for (const message of [
    "book me a hotel",
    "call me a taxi",
    "what movie should I watch",
    "buy me a plane ticket",
  ]) {
    assert.equal(
      resolveAtlasConversationalIntent(message),
      null,
      message,
    );
  }
});
