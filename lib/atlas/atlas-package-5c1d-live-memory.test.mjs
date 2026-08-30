import assert from "node:assert/strict";
import test from "node:test";

import {
  createAtlasConversationMemory,
  updateAtlasConversationMemory,
} from "./atlas-conversation-memory.ts";
import { AtlasOrchestrator } from "./atlas-orchestrator.ts";

function createMemory() {
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

test("5C.1D orchestrator accepts bounded conversation memory", async () => {
  const orchestrator = new AtlasOrchestrator();

  const plan = await orchestrator.plan(
    "track that order",
    {
      pathname: "/marketplace",
      isAuthenticated: false,
      hasConnectedWallet: false,
      memory: createMemory(),
    },
  );

  assert.equal(plan.intent, "delivery-tracking");

  assert.equal(
    "memory" in plan,
    false,
  );
});

test("5C.1D remembered private references do not bypass authentication", async () => {
  const orchestrator = new AtlasOrchestrator();

  const plan = await orchestrator.plan(
    "track that order",
    {
      pathname: "/marketplace",
      isAuthenticated: false,
      hasConnectedWallet: false,
      memory: createMemory(),
    },
  );

  assert.equal(plan.intent, "delivery-tracking");

  assert.notEqual(
    plan.groundingLevel,
    "PRIVATE_VERIFIED",
  );
});