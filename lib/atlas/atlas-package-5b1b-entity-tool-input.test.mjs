import assert from "node:assert/strict";
import test from "node:test";

const {
  buildAtlasEntityAwareToolInput,
} = await import("./atlas-entity-tool-input.ts");

test("5B.1B narrows an explicit Marketplace order lookup", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_marketplace_orders",
      "show me order TV-1001",
    ),
    { query: "TV-1001" },
  );
});

test("5B.1B narrows an explicit receipt lookup", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_receipts",
      "open receipt receipt-456",
    ),
    { query: "receipt-456" },
  );
});

test("5B.1B narrows an explicit Gift Vault lookup", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_gifts",
      "show gift #42",
    ),
    { giftId: "42" },
  );
});

test("5B.1B narrows an explicit Bill Split lookup", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_bill_splits",
      "show bill split bill-17",
    ),
    { query: "bill-17" },
  );
});

test("5B.1B narrows an explicit delivery lookup with an order reference", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "get_my_order_delivery",
      "track order TV-1001",
    ),
    { query: "TV-1001" },
  );
});

test("5B.1B preserves the original query when no explicit matching entity exists", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_marketplace_orders",
      "show my latest order",
    ),
    { query: "show my latest order" },
  );
});

test("5B.1B does not resolve contextual Gift Vault references into invented IDs", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_gifts",
      "show my latest gift",
    ),
    { giftId: "" },
  );
});

test("5B.1B ignores an explicit entity belonging to a different tool", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_receipts",
      "show receipt details for order TV-1001",
    ),
    { query: "show receipt details for order TV-1001" },
  );
});

test("5B.1B transaction hashes do not grant or select a private lookup", () => {
  const hash = `0x${"a".repeat(64)}`;

  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_marketplace_orders",
      `check transaction ${hash}`,
    ),
    { query: `check transaction ${hash}` },
  );
});

test("5B.1B ordinary numbers remain ordinary language", () => {
  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_bill_splits",
      "split this between 4 people for 25 USDC",
    ),
    { query: "split this between 4 people for 25 USDC" },
  );
});

test("5B.1B cannot select a tool or grant authority", () => {
  const result = buildAtlasEntityAwareToolInput(
    "find_my_marketplace_orders",
    "show order TV-1001",
  );

  assert.equal("toolId" in result, false);
  assert.equal("authenticated" in result, false);
  assert.equal("authorized" in result, false);
  assert.equal("owned" in result, false);
  assert.equal("execute" in result, false);
  assert.equal("transaction" in result, false);
});

test("5B.1F consumes supplied reasoning entities without re-deriving the explicit reference", () => {
  const entities = [
    {
      kind: "marketplace-order",
      reference: "explicit",
      value: "TV-9009",
    },
  ];

  assert.deepEqual(
    buildAtlasEntityAwareToolInput(
      "find_my_marketplace_orders",
      "show me order TV-1001",
      entities,
    ),
    { query: "TV-9009" },
  );
});
