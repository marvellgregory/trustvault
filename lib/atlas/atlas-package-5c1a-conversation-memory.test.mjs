import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT,
  clearAtlasConversationMemory,
  getAtlasRememberedReference,
  createAtlasConversationMemory,
  toAtlasConversationContext,
  toAtlasConversationContextForReference,
  updateAtlasConversationMemory,
} from "./atlas-conversation-memory.ts";

test("5C.1A starts with bounded empty memory", () => {
  assert.deepEqual(createAtlasConversationMemory(), {
    references: [],
    turnCount: 0,
  });
});

test("5C.1A remembers the latest structured conversation reference", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  assert.equal(memory.previousIntent, "marketplace-order");
  assert.deepEqual(memory.activeReference, {
    type: "marketplace-order",
    id: "TV-1001",
  });
  assert.deepEqual(memory.references, [
    {
      type: "marketplace-order",
      id: "TV-1001",
    },
  ]);
  assert.equal(memory.turnCount, 1);
});

test("5C.1A retains distinct recent references across turns", () => {
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

  assert.deepEqual(memory.references, [
    {
      type: "marketplace-order",
      id: "TV-1001",
    },
    {
      type: "gift",
      id: "42",
    },
  ]);

  assert.deepEqual(memory.activeReference, {
    type: "gift",
    id: "42",
  });
});

test("5C.1A deduplicates an existing reference and moves it to most recent", () => {
  let memory = createAtlasConversationMemory();

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "marketplace-order",
      id: "TV-1001",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "gift",
      id: "42",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "marketplace-order",
      id: "tv-1001",
    },
  });

  assert.equal(memory.references.length, 2);
  assert.deepEqual(memory.references.at(-1), {
    type: "marketplace-order",
    id: "tv-1001",
  });
});

test("5C.1A bounds retained references", () => {
  let memory = createAtlasConversationMemory();

  for (
    let index = 1;
    index <= ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT + 3;
    index += 1
  ) {
    memory = updateAtlasConversationMemory(memory, {
      reference: {
        type: "gift",
        id: String(index),
      },
    });
  }

  assert.equal(
    memory.references.length,
    ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT,
  );

  assert.equal(memory.references[0]?.id, "4");
});

test("5C.1A preserves existing single-reference compatibility", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      previousIntent: "receipt",
      reference: {
        type: "receipt",
        id: "receipt-456",
      },
    },
  );

  assert.deepEqual(toAtlasConversationContext(memory), {
    previousIntent: "receipt",
    reference: {
      type: "receipt",
      id: "receipt-456",
    },
  });
});

test("5C.1A does not invent a reference when a turn has none", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      previousIntent: "marketplace",
    },
  );

  assert.equal(memory.activeReference, undefined);
  assert.deepEqual(memory.references, []);
  assert.equal(memory.turnCount, 1);
});

test("5C.1A clears all retained conversation memory", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      previousIntent: "gift",
      reference: {
        type: "gift",
        id: "42",
      },
    },
  );

  assert.notDeepEqual(memory, clearAtlasConversationMemory());

  assert.deepEqual(clearAtlasConversationMemory(), {
    references: [],
    turnCount: 0,
  });
});
test("5C.1B resolves the active reference when it matches the requested kind", () => {
  let memory = createAtlasConversationMemory();

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "marketplace-order",
      id: "TV-1001",
    },
  });

  assert.deepEqual(
    getAtlasRememberedReference(memory, "marketplace-order"),
    {
      type: "marketplace-order",
      id: "TV-1001",
    },
  );
});

test("5C.1B resolves the most recent remembered reference by kind", () => {
  let memory = createAtlasConversationMemory();

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "marketplace-order",
      id: "TV-1001",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "gift",
      id: "42",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "marketplace-order",
      id: "TV-2002",
    },
  });

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "gift",
      id: "84",
    },
  });

  assert.deepEqual(
    getAtlasRememberedReference(memory, "marketplace-order"),
    {
      type: "marketplace-order",
      id: "TV-2002",
    },
  );
});

test("5C.1B returns undefined when the requested kind was never remembered", () => {
  let memory = createAtlasConversationMemory();

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "gift",
      id: "42",
    },
  });

  assert.equal(
    getAtlasRememberedReference(memory, "receipt"),
    undefined,
  );
});

test("5C.1B creates a backward-compatible conversation context for a remembered kind", () => {
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

  assert.deepEqual(
    toAtlasConversationContextForReference(
      memory,
      "marketplace-order",
    ),
    {
      previousIntent: "gift",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
        receiptId: "receipt-456",
      },
    },
  );
});

test("5C.1B does not invent a reference for an absent remembered kind", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      previousIntent: "gift",
      reference: {
        type: "gift",
        id: "42",
      },
    },
  );

  assert.deepEqual(
    toAtlasConversationContextForReference(
      memory,
      "bill-split",
    ),
    {
      previousIntent: "gift",
    },
  );
});