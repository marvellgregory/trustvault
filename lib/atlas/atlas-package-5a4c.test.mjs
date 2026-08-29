import assert from "node:assert/strict";
import test from "node:test";

import { createAtlasFeatureResponse } from "./atlas-feature-responses.ts";
import { createAtlasSuggestions } from "./atlas-suggestions.ts";

const FEATURE_IDS = [
  "marketplace",
  "marketplace-order",
  "delivery-tracking",
  "gift-vault",
  "bill-split",
  "receipts",
  "account",
  "wallet",
  "trust-center",
  "help",
  "activity",
  "wishlist",
  "cart",
  "swap",
];

test("5A.4C: every feature exposes exactly one conversational follow-up", () => {
  for (const featureId of FEATURE_IDS) {
    const response = createAtlasFeatureResponse({
      featureId,
      purpose: "learn",
    });

    const conversational = response.actions.filter(
      (action) => action.type === "ask-atlas",
    );

    assert.equal(conversational.length, 1);
    assert.ok(conversational[0].label.trim());
    assert.ok(conversational[0].prompt.trim());
  }
});

test("5A.4C: feature actions remain navigation or conversation only", () => {
  for (const featureId of FEATURE_IDS) {
    const response = createAtlasFeatureResponse({
      featureId,
      purpose: "learn",
    });

    assert.ok(
      response.actions.every(
        (action) =>
          action.type === "navigate" ||
          action.type === "ask-atlas",
      ),
    );
  }
});

test("5A.4C: Gift Vault retains wallet final approval", () => {
  const response = createAtlasFeatureResponse({
    featureId: "gift-vault",
    purpose: "start",
  });

  assert.match(
    response.answer,
    /wallet remains the final approval point/i,
  );

  assert.ok(
    response.actions.some(
      (action) => action.type === "ask-atlas",
    ),
  );
});

test("5A.4C: Bill Split retains no-submit boundary", () => {
  const response = createAtlasFeatureResponse({
    featureId: "bill-split",
    purpose: "start",
  });

  assert.match(
    response.answer,
    /will not submit a payment or transaction/i,
  );
});

test("5A.4C: Swap remains Coming Soon and non-executable", () => {
  const response = createAtlasFeatureResponse({
    featureId: "swap",
    purpose: "learn",
  });

  assert.match(response.answer, /Coming Soon/i);
  assert.match(
    response.answer,
    /execution is not currently available/i,
  );

  const followUp = response.actions.find(
    (action) => action.type === "ask-atlas",
  );

  assert.ok(followUp);
  assert.match(followUp.prompt, /Coming Soon/i);
  assert.doesNotMatch(
    followUp.prompt,
    /execute|swap now|submit|approve|sign/i,
  );
});

test("5A.4C: ask-atlas suggestion preserves its prompt", () => {
  const action = {
    type: "ask-atlas",
    label: "How does gifting work?",
    prompt: "How does Gift Vault gifting work in TrustVault?",
  };

  const suggestions = createAtlasSuggestions({
    intent: "knowledge",
    pathname: "/gift-vault",
    actions: [action],
  });

  const suggestion = suggestions.find(
    (item) => item.action.type === "ask-atlas",
  );

  assert.ok(suggestion);
  assert.match(suggestion.id, /^ask:/);
  assert.equal(suggestion.label, action.label);
  assert.deepEqual(suggestion.action, action);
});

test("5A.4C: Marketplace mixes navigation and conversation", () => {
  const response = createAtlasFeatureResponse({
    featureId: "marketplace",
    purpose: "learn",
  });

  const suggestions = createAtlasSuggestions({
    intent: "knowledge",
    pathname: "/marketplace",
    actions: response.actions,
  });

  assert.ok(
    suggestions.some(
      (item) => item.action.type === "ask-atlas",
    ),
  );

  assert.ok(
    suggestions.some(
      (item) => item.action.type === "navigate",
    ),
  );
});

test("5A.4C: conversational prompts contain no transaction command", () => {
  for (const featureId of FEATURE_IDS) {
    const response = createAtlasFeatureResponse({
      featureId,
      purpose: "learn",
    });

    const followUp = response.actions.find(
      (action) => action.type === "ask-atlas",
    );

    assert.ok(followUp);

    assert.doesNotMatch(
      followUp.prompt,
      /sign transaction|approve transaction|submit transaction|execute swap|send transaction/i,
    );
  }
});
