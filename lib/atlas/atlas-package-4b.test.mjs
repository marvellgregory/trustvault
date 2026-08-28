import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith("./") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.includes("/lib/atlas/")
    ) {
      return nextResolve(
        `${specifier.endsWith(".js") ? specifier.slice(0, -3) : specifier}.ts`,
        context,
      );
    }

    return nextResolve(specifier, context);
  },
});

const { resolveAtlasFollowUp } = await import("./atlas-follow-up.ts");

test("resolves delivery follow-up against the selected order", () => {
  assert.deepEqual(
    resolveAtlasFollowUp("What about delivery?", {
      previousIntent: "marketplace-order",
      reference: { type: "marketplace-order", id: "order-123" },
    }),
    {
      intent: "delivery-tracking",
      toolId: "get_my_order_delivery",
      input: { query: "order-123" },
    },
  );
});

test("resolves receipt follow-up from an order only when receipt is known", () => {
  assert.deepEqual(
    resolveAtlasFollowUp("Open the receipt", {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "order-123",
        receiptId: "receipt-456",
      },
    }),
    {
      intent: "receipt",
      toolId: "find_my_receipts",
      input: { query: "receipt-456" },
    },
  );
});

test("does not invent a receipt reference when the order has none", () => {
  assert.equal(
    resolveAtlasFollowUp("Open the receipt", {
      previousIntent: "marketplace-order",
      reference: { type: "marketplace-order", id: "order-123" },
    }),
    null,
  );
});

test("resolves explicit previous-order wording", () => {
  assert.deepEqual(
    resolveAtlasFollowUp("What is the status of that order?", {
      previousIntent: "marketplace-order",
      reference: { type: "marketplace-order", id: "order-123" },
    }),
    {
      intent: "marketplace-order",
      toolId: "find_my_marketplace_orders",
      input: { query: "order-123" },
    },
  );
});

test("resolves a previous receipt", () => {
  assert.deepEqual(
    resolveAtlasFollowUp("Open that receipt", {
      previousIntent: "receipt",
      reference: { type: "receipt", id: "receipt-789" },
    }),
    {
      intent: "receipt",
      toolId: "find_my_receipts",
      input: { query: "receipt-789" },
    },
  );
});

test("resolves a previous gift by ID", () => {
  assert.deepEqual(
    resolveAtlasFollowUp("What about that gift?", {
      previousIntent: "gift",
      reference: { type: "gift", id: "42" },
    }),
    {
      intent: "gift",
      toolId: "find_my_gifts",
      input: { giftId: "42" },
    },
  );
});

test("resolves a previous Bill Split by ID", () => {
  assert.deepEqual(
    resolveAtlasFollowUp("What is the status of that bill split?", {
      previousIntent: "bill-split",
      reference: { type: "bill-split", id: "bill-321" },
    }),
    {
      intent: "bill-split",
      toolId: "find_my_bill_splits",
      input: { query: "bill-321" },
    },
  );
});

test("does not resolve without conversation context", () => {
  assert.equal(
    resolveAtlasFollowUp("What about that one?", undefined),
    null,
  );
});

test("does not resolve unrelated conversation against stored reference", () => {
  assert.equal(
    resolveAtlasFollowUp("How does TrustVault work?", {
      previousIntent: "marketplace-order",
      reference: { type: "marketplace-order", id: "order-123" },
    }),
    null,
  );
});
