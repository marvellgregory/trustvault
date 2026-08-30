import assert from "node:assert/strict";
import test from "node:test";

import {
  createAtlasConversationMemory,
  updateAtlasConversationMemory,
} from "./atlas-conversation-memory.ts";
import {
  buildAtlasReasoningContext,
} from "./atlas-reasoning-context.ts";

function buildMultiReferenceMemory() {
  let memory = createAtlasConversationMemory();

  memory = updateAtlasConversationMemory(memory, {
    previousIntent: "marketplace-order",
    reference: {
      type: "marketplace-order",
      id: "TV-1001",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    previousIntent: "gift",
    reference: {
      type: "gift",
      id: "42",
    },
  });

  return memory;
}

test("5C.1C resolves an older remembered order after another reference becomes active", () => {
  const reasoning = buildAtlasReasoningContext(
    "track that order",
    undefined,
    buildMultiReferenceMemory(),
  );

  assert.equal(reasoning.resolutionSource, "follow-up");
  assert.equal(reasoning.followUp?.toolId, "get_my_order_delivery");
  assert.deepEqual(reasoning.followUp?.input, {
    query: "TV-1001",
  });

  assert.deepEqual(reasoning.conversation?.reference, {
    type: "marketplace-order",
    id: "TV-1001",
  });
});

test("5C.1C keeps the active remembered gift available for gift follow-up", () => {
  const reasoning = buildAtlasReasoningContext(
    "what about that gift",
    undefined,
    buildMultiReferenceMemory(),
  );

  assert.equal(reasoning.resolutionSource, "follow-up");
  assert.equal(reasoning.followUp?.toolId, "find_my_gifts");
  assert.deepEqual(reasoning.followUp?.input, {
    giftId: "42",
  });
});

test("5C.1C explicit current-turn order still overrides remembered order", () => {
  const reasoning = buildAtlasReasoningContext(
    "track order TV-2002",
    undefined,
    buildMultiReferenceMemory(),
  );

  assert.equal(reasoning.resolutionSource, "explicit-entity");
  assert.equal(reasoning.followUp, null);

  const order = reasoning.entities.find(
    (entity) =>
      entity.kind === "marketplace-order" &&
      entity.reference === "explicit",
  );

  assert.equal(order?.value, "TV-2002");
});

test("5C.1C does not invent memory context for a record kind that was never remembered", () => {
  const reasoning = buildAtlasReasoningContext(
    "what about that receipt",
    undefined,
    buildMultiReferenceMemory(),
  );

  assert.equal(reasoning.followUp, null);
});

test("5C.1C remains backward compatible without memory", () => {
  const reasoning = buildAtlasReasoningContext(
    "track that order",
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-9009",
      },
    },
  );

  assert.equal(reasoning.resolutionSource, "follow-up");
  assert.deepEqual(reasoning.followUp?.input, {
    query: "TV-9009",
  });
});

test("5C.1C memory adds no authority fields to reasoning", () => {
  const reasoning = buildAtlasReasoningContext(
    "track that order",
    undefined,
    buildMultiReferenceMemory(),
  );

  for (const forbidden of [
    "authenticated",
    "authorized",
    "owned",
    "execute",
    "transaction",
    "signingAuthority",
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(reasoning, forbidden),
      false,
    );
  }
});
test("5C final resolves a remembered order receipt after another record becomes active", () => {
  let memory = createAtlasConversationMemory();

  memory = updateAtlasConversationMemory(memory, {
    previousIntent: "marketplace-order",
    reference: {
      type: "marketplace-order",
      id: "TV-1001",
      receiptId: "receipt-456",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    previousIntent: "gift",
    reference: {
      type: "gift",
      id: "42",
    },
  });

  const reasoning = buildAtlasReasoningContext(
    "what about the receipt?",
    undefined,
    memory,
  );

  assert.equal(reasoning.resolutionSource, "follow-up");
  assert.equal(reasoning.followUp?.intent, "receipt");
  assert.equal(reasoning.followUp?.toolId, "find_my_receipts");

  assert.deepEqual(reasoning.followUp?.input, {
    query: "receipt-456",
  });

  assert.deepEqual(reasoning.conversation?.reference, {
    type: "marketplace-order",
    id: "TV-1001",
    receiptId: "receipt-456",
  });
});