import assert from "node:assert/strict";
import test from "node:test";

import {
  ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS,
  clearAtlasConversationMemory,
  createAtlasConversationMemory,
  getAtlasRememberedReference,
  toAtlasConversationContext,
  updateAtlasConversationMemory,
} from "./atlas-conversation-memory.ts";

function advanceWithoutReference(memory, turns) {
  let nextMemory = memory;

  for (let index = 0; index < turns; index += 1) {
    nextMemory = updateAtlasConversationMemory(nextMemory, {
      previousIntent: "marketplace",
    });
  }

  return nextMemory;
}

test("5C.1E remembers a reference inside the idle-turn window", () => {
  let memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  memory = advanceWithoutReference(
    memory,
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS - 1,
  );

  assert.deepEqual(
    getAtlasRememberedReference(memory, "marketplace-order"),
    {
      type: "marketplace-order",
      id: "TV-1001",
    },
  );
});

test("5C.1E expires a reference after the maximum idle turns", () => {
  let memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  memory = advanceWithoutReference(
    memory,
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS,
  );

  assert.equal(
    getAtlasRememberedReference(memory, "marketplace-order"),
    undefined,
  );

  assert.equal(memory.activeReference, undefined);
  assert.deepEqual(memory.references, []);
});

test("5C.1E refreshing a reference restarts its lifecycle", () => {
  let memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      reference: {
        type: "gift",
        id: "42",
      },
    },
  );

  memory = advanceWithoutReference(
    memory,
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS - 1,
  );

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "gift",
      id: "42",
    },
  });

  memory = advanceWithoutReference(
    memory,
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS - 1,
  );

  assert.deepEqual(
    getAtlasRememberedReference(memory, "gift"),
    {
      type: "gift",
      id: "42",
    },
  );
});

test("5C.1E expires references independently", () => {
  let memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  memory = advanceWithoutReference(
    memory,
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS - 1,
  );

  memory = updateAtlasConversationMemory(memory, {
    reference: {
      type: "gift",
      id: "42",
    },
  });

  assert.equal(
    getAtlasRememberedReference(memory, "marketplace-order"),
    undefined,
  );

  assert.deepEqual(
    getAtlasRememberedReference(memory, "gift"),
    {
      type: "gift",
      id: "42",
    },
  );
});

test("5C.1E expired active references are excluded from conversation context", () => {
  let memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  memory = advanceWithoutReference(
    memory,
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS,
  );

  assert.deepEqual(toAtlasConversationContext(memory), {
    previousIntent: "marketplace",
  });
});

test("5C.1E clear removes lifecycle metadata", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      reference: {
        type: "gift",
        id: "42",
      },
    },
  );

  assert.ok(memory.referenceTurns);

  assert.deepEqual(clearAtlasConversationMemory(), {
    references: [],
    turnCount: 0,
  });
});

test("5C.1E preserves compatibility with memory created before lifecycle metadata", () => {
  const legacyMemory = {
    previousIntent: "gift",
    activeReference: {
      type: "gift",
      id: "42",
    },
    references: [
      {
        type: "gift",
        id: "42",
      },
    ],
    turnCount: 100,
  };

  assert.deepEqual(
    getAtlasRememberedReference(legacyMemory, "gift"),
    {
      type: "gift",
      id: "42",
    },
  );
});

test("5C.1E lifecycle metadata contains no authority or secret fields", () => {
  const memory = updateAtlasConversationMemory(
    createAtlasConversationMemory(),
    {
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  const serialized = JSON.stringify(memory).toLowerCase();

  for (const forbidden of [
    "privatekey",
    "seedphrase",
    "signingauthority",
    "authenticated",
    "authorized",
    "owned",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});