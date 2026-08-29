import assert from "node:assert/strict";
import test from "node:test";

import { classifyAtlasIntent } from "./atlas-intent.js";

test("5A.4B: exact private Gift Vault lookup retains authenticated tool", () => {
  const result = classifyAtlasIntent("show my gift vault");

  assert.equal(result.feature, "gift-vault");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.didYouMean, false);
  assert.equal(result.requiresPrivateData, true);
  assert.ok(result.toolId);
});

test("5A.4B: fuzzy Gift Vault lookup requires clarification before private tool execution", () => {
  const result = classifyAtlasIntent("show my gif");

  assert.equal(result.feature, "gift-vault");
  assert.equal(result.didYouMean, true);

  assert.equal(
    result.toolId,
    undefined,
    "A fuzzy Did You Mean match must not select a private tool before confirmation",
  );

  assert.equal(
    result.requiresPrivateData,
    false,
    "A fuzzy Did You Mean match must remain public until the feature is confirmed",
  );
});

test("5A.4B: navigation precedence remains above feature lookup", () => {
  const result = classifyAtlasIntent("open my gift vault");

  assert.equal(result.intent, "navigation");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});

test("5A.4B: diagnosis precedence remains above feature lookup", () => {
  const result = classifyAtlasIntent("why is my gift vault not working");

  assert.equal(result.intent, "diagnosis");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, undefined);
});
