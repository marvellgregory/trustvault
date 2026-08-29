import assert from "node:assert/strict";
import test from "node:test";

import { createAtlasFeatureResponse } from "./atlas-feature-responses.ts";

test("5A.4B: Gift Vault learn response is feature-aware", () => {
  const response = createAtlasFeatureResponse({
    featureId: "gift-vault",
    purpose: "learn",
  });

  assert.match(response.answer, /Gift Vault/i);
  assert.match(response.answer, /programmable USDC gifts/i);

  assert.deepEqual(response.actions[0], {
    type: "navigate",
    label: "Open Gift Vault",
    route: "/gift-vault",
  });
});

test("5A.4B: Gift Vault start response preserves wallet approval boundary", () => {
  const response = createAtlasFeatureResponse({
    featureId: "gift-vault",
    purpose: "start",
  });

  assert.match(response.answer, /wallet remains the final approval point/i);
  assert.ok(response.actions.every((action) => action.type === "navigate"));
});

test("5A.4B: Bill Split start response does not imply Atlas executes transactions", () => {
  const response = createAtlasFeatureResponse({
    featureId: "bill-split",
    purpose: "start",
  });

  assert.match(response.answer, /will not submit a payment or transaction/i);
  assert.ok(response.actions.every((action) => action.type === "navigate"));
});

test("5A.4B: fuzzy feature match can surface Did You Mean copy", () => {
  const response = createAtlasFeatureResponse({
    featureId: "gift-vault",
    purpose: "learn",
    didYouMean: true,
  });

  assert.match(response.answer, /^Did you mean Gift Vault\?/);
});

test("5A.4B: exact feature response does not add Did You Mean copy", () => {
  const response = createAtlasFeatureResponse({
    featureId: "gift-vault",
    purpose: "learn",
    didYouMean: false,
  });

  assert.doesNotMatch(response.answer, /^Did you mean/i);
});

test("5A.4B: related features become contextual navigation actions", () => {
  const response = createAtlasFeatureResponse({
    featureId: "marketplace",
    purpose: "learn",
  });

  assert.deepEqual(
    response.actions.map((action) => ({
      type: action.type,
      label: action.label,
      route: action.type === "navigate" ? action.route : undefined,
    })),
    [
      {
        type: "navigate",
        label: "Open Marketplace",
        route: "/marketplace",
      },
      {
        type: "navigate",
        label: "Open Marketplace Orders",
        route: "/marketplace",
      },
      {
        type: "navigate",
        label: "Open Cart",
        route: "/cart",
      },
    ],
  );
});

test("5A.4B: actions remain navigation-only", () => {
  const featureIds = [
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

  for (const featureId of featureIds) {
    const response = createAtlasFeatureResponse({
      featureId,
      purpose: "learn",
    });

    assert.ok(
      response.actions.every((action) => action.type === "navigate"),
      `${featureId} exposed a non-navigation action`,
    );
  }
});

test("5A.4B: Swap remains Coming Soon and never exposes execution", () => {
  const response = createAtlasFeatureResponse({
    featureId: "swap",
    purpose: "learn",
  });

  assert.match(response.answer, /Coming Soon/i);
  assert.match(response.answer, /execution is not currently available/i);

  assert.deepEqual(response.actions[0], {
    type: "navigate",
    label: "Open Swap",
    route: "/coming-soon",
  });

  assert.ok(response.actions.every((action) => action.type === "navigate"));
});

test("5A.4B: unknown purpose safely falls back to learn copy", () => {
  const response = createAtlasFeatureResponse({
    featureId: "receipts",
    purpose: "unknown",
  });

  assert.match(response.answer, /Receipt Center/i);
  assert.deepEqual(response.actions[0], {
    type: "navigate",
    label: "Open Receipts",
    route: "/receipts",
  });
});
