import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_FEATURES,
  resolveAtlasFeature,
} from "./atlas-feature-registry.ts";

function classificationView(message) {
  const match = resolveAtlasFeature(message);

  return {
    feature: match.feature?.id ?? null,
    purpose: match.purpose,
    confidence: match.confidence,
    kind: match.kind,
    didYouMean: match.didYouMean,
    requiresPrivateData:
      match.purpose === "lookup" &&
      match.feature?.requiresAuthForLookup === true,
    toolId:
      match.purpose === "lookup"
        ? match.feature?.privateToolId ?? null
        : null,
  };
}

test("generic Bill Split help is guidance, never a private lookup", () => {
  const result = classificationView("help me with bill split");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.purpose, "learn");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, null);
});

test("starting Bill Split is a start intent without private lookup", () => {
  const result = classificationView("start a bill split");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.purpose, "start");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, null);
});

test("owned Bill Split lookup remains private", () => {
  const result = classificationView("show my latest bill split");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "find_my_bill_splits");
});

test("Bill Split explanation remains guidance", () => {
  const result = classificationView("how does bill split work");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.purpose, "learn");
  assert.equal(result.requiresPrivateData, false);
});

test("near-match Bill Split typo produces Did You Mean", () => {
  const result = classificationView("bil splt");

  assert.equal(result.feature, "bill-split");
  assert.equal(result.kind, "fuzzy");
  assert.equal(result.didYouMean, true);
  assert.ok(result.confidence >= 0.72);
  assert.equal(result.requiresPrivateData, false);
});

test("short ambiguous bill does not force a feature match", () => {
  const result = classificationView("bill");

  assert.equal(result.feature, null);
  assert.equal(result.purpose, "unknown");
  assert.equal(result.didYouMean, false);
  assert.equal(result.requiresPrivateData, false);
});

test("natural-language gifting can start Gift Vault without private lookup", () => {
  const result = classificationView("send a present");

  assert.equal(result.feature, "gift-vault");
  assert.equal(result.purpose, "start");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, null);
});

test("owned Gift Vault lookup remains private", () => {
  const result = classificationView("show my gifts");

  assert.equal(result.feature, "gift-vault");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "find_my_gifts");
});

test("natural-language shopping resolves to Marketplace", () => {
  const result = classificationView("buy something");

  assert.equal(result.feature, "marketplace");
  assert.equal(result.requiresPrivateData, false);
});

test("owned Marketplace order lookup remains private", () => {
  const result = classificationView("show my latest order");

  assert.equal(result.feature, "marketplace-order");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "find_my_marketplace_orders");
});

test("Where is my order preserves the verified owned-order lookup contract", () => {
  const result = classificationView("Where is my order?");

  assert.equal(result.feature, "marketplace-order");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "find_my_marketplace_orders");
});

test("explicit order tracking resolves to the delivery tool", () => {
  const result = classificationView("track my order");

  assert.equal(result.feature, "delivery-tracking");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "get_my_order_delivery");
});

test("delivery lookup remains private customer data", () => {
  const result = classificationView("where is my package");

  assert.equal(result.feature, "delivery-tracking");
  assert.equal(result.purpose, "lookup");
  assert.equal(result.requiresPrivateData, true);
  assert.equal(result.toolId, "get_my_order_delivery");
});

test("unsupported requests do not fabricate TrustVault capabilities", () => {
  const result = classificationView("book me a flight");

  assert.equal(result.feature, null);
  assert.equal(result.purpose, "unknown");
  assert.equal(result.kind, "none");
  assert.equal(result.didYouMean, false);
  assert.equal(result.requiresPrivateData, false);
});

test("Swap remains discovery-only and has no private execution tool", () => {
  const result = classificationView("swap usdc");

  assert.equal(result.feature, "swap");
  assert.equal(result.purpose, "learn");
  assert.equal(result.requiresPrivateData, false);
  assert.equal(result.toolId, null);

  const swap = ATLAS_FEATURES.find((feature) => feature.id === "swap");

  assert.ok(swap);
  assert.equal(swap.route, "/coming-soon");
  assert.equal(swap.privateToolId, undefined);
});

test("feature registry contains unique canonical IDs", () => {
  const ids = ATLAS_FEATURES.map((feature) => feature.id);

  assert.equal(new Set(ids).size, ids.length);
});

test("private tools are declared only on features requiring authenticated lookup", () => {
  for (const feature of ATLAS_FEATURES) {
    if (feature.privateToolId) {
      assert.equal(
        feature.requiresAuthForLookup,
        true,
        `${feature.id} exposes a private tool without an authenticated lookup boundary`,
      );
    }
  }
});
