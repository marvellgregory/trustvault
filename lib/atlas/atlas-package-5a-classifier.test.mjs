import assert from "node:assert/strict";
import test from "node:test";

import { classifyAtlasIntent } from "./atlas-intent.ts";

test("generic Bill Split help remains guidance without private lookup", () => {
  const result = classifyAtlasIntent("help me with bill split");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.purpose, "learn");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("owned Bill Split request remains an authenticated lookup", () => {
  const result = classifyAtlasIntent("show my latest bill split");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "find_my_bill_splits");
});

test("feature navigation outranks feature knowledge", () => {
  const result = classifyAtlasIntent("open marketplace");

  assert.equal(result.intent, "navigation");
  assert.equal(result.feature, "marketplace");
  assert.equal(result.purpose, "navigate");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("diagnosis outranks owned-order lookup semantics", () => {
  const result = classifyAtlasIntent("why did my order fail");

  assert.equal(result.intent, "diagnosis");
  assert.equal(result.feature, "marketplace-order");
  assert.equal(result.purpose, "learn");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("fuzzy Did You Mean never executes a private tool", () => {
  const result = classifyAtlasIntent("bil splt");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.didYouMean, true);
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("Swap remains non-private and non-executable", () => {
  const result = classifyAtlasIntent("swap usdc");

  assert.equal(result.feature, "swap");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("unsupported capability does not fabricate a feature", () => {
  const result = classifyAtlasIntent("book me a flight");

  assert.equal(result.feature, undefined);
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});
