import assert from "node:assert/strict";
import test from "node:test";

import { buildAtlasReasoningContext } from "./atlas-reasoning-context.ts";

test("5B.1E explicit order overrides a stored order follow-up reference", () => {
  const reasoning = buildAtlasReasoningContext(
    "track order TV-2002",
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  assert.equal(reasoning.resolutionSource, "explicit-entity");

  const order = reasoning.entities.find(
    (entity) =>
      entity.kind === "marketplace-order" &&
      entity.reference === "explicit",
  );

  assert.equal(order?.value, "TV-2002");
});

test("5B.1E conversation follow-up remains preferred without a conflicting explicit order", () => {
  const reasoning = buildAtlasReasoningContext(
    "track that order",
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  assert.equal(reasoning.resolutionSource, "follow-up");
  assert.equal(reasoning.followUp?.toolId, "get_my_order_delivery");
  assert.deepEqual(reasoning.followUp?.input, {
    query: "TV-1001",
  });
});

test("5B.1E unrelated explicit entity does not suppress a valid order follow-up", () => {
  const reasoning = buildAtlasReasoningContext(
    "track that order, receipt REC-2002",
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  assert.equal(reasoning.resolutionSource, "follow-up");
  assert.equal(reasoning.followUp?.toolId, "get_my_order_delivery");
});

test("5B.1E contextual latest reference never invents a record identifier", () => {
  const reasoning = buildAtlasReasoningContext("show my latest gift");

  const gift = reasoning.entities.find(
    (entity) =>
      entity.kind === "gift" &&
      entity.reference === "latest",
  );

  assert.ok(gift);
  assert.equal(gift.value, undefined);
  assert.equal(reasoning.resolutionSource, "contextual-entity");
});

test("5B.1E transaction hash remains evidence and cannot grant authority", () => {
  const hash = `0x${"a".repeat(64)}`;

  const reasoning = buildAtlasReasoningContext(
    `check ${hash}`,
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  const transactionHash = reasoning.entities.find(
    (entity) => entity.kind === "transaction-hash",
  );

  assert.equal(transactionHash?.value, hash);

  for (const forbidden of [
    "authenticated",
    "authorized",
    "owned",
    "execute",
    "transaction",
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(reasoning, forbidden),
      false,
    );
  }
});

test("5B.1G marks multiple distinct explicit order references as ambiguous", () => {
  const reasoning = buildAtlasReasoningContext(
    "show order TV-1001 and order TV-2002",
  );

  assert.equal(reasoning.hasAmbiguousExplicitEntities, true);
  assert.deepEqual(reasoning.ambiguousExplicitEntityKinds, [
    "marketplace-order",
  ]);
});

test("5B.1G does not mark cross-kind explicit references as ambiguous", () => {
  const reasoning = buildAtlasReasoningContext(
    "show order TV-1001 and receipt receipt-456",
  );

  assert.equal(reasoning.hasAmbiguousExplicitEntities, false);
  assert.deepEqual(reasoning.ambiguousExplicitEntityKinds, []);
});

test("5B.1G repeated references do not create reasoning ambiguity", () => {
  const reasoning = buildAtlasReasoningContext(
    "show order TV-1001 and order tv-1001",
  );

  assert.equal(reasoning.hasAmbiguousExplicitEntities, false);
  assert.deepEqual(reasoning.ambiguousExplicitEntityKinds, []);
});
