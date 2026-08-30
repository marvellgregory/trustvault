import assert from "node:assert/strict";
import test from "node:test";

import { AtlasOrchestrator } from "./atlas-orchestrator.ts";

function ambiguityPlan(request) {
  return {
    intent: request.classification.intent,
    answer: "I found more than one matching reference in your request. Which one did you mean?",
    grounding: {
      level: "UNAVAILABLE",
      evidence: [],
    },
    actions: [],
    disambiguation: request.entities.map((entity) => ({
      id: entity.value,
      label: entity.value,
      description: "Reference from your message",
      action: {
        type: "ask-atlas",
        label: `Use ${entity.value}`,
        prompt: `Use ${entity.value}`,
      },
    })),
  };
}

test("5B.1G ambiguous same-kind explicit references stop before private tool execution", async () => {
  let executeCount = 0;

  const registry = {
    async execute() {
      executeCount += 1;
      throw new Error(
        "Private tool execution must not occur for ambiguous explicit references.",
      );
    },
  };

  const responses = {
    create() {
      throw new Error(
        "Normal response creation must not be used for pre-execution ambiguity.",
      );
    },

    createInputAmbiguity(request) {
      return ambiguityPlan(request);
    },
  };

  const orchestrator = new AtlasOrchestrator(
    registry,
    responses,
  );

  const plan = await orchestrator.plan(
    "show my order TV-1001 and order TV-2002",
    {
      pathname: "/account",
      isAuthenticated: true,
    },
  );

  assert.equal(executeCount, 0);
  assert.match(plan.answer, /Which one did you mean/i);
  assert.equal(plan.disambiguation?.length, 2);
  assert.deepEqual(
    plan.disambiguation?.map((choice) => choice.id),
    ["TV-1001", "TV-2002"],
  );
});

test("5B.1G ambiguity from another entity kind does not block the selected private tool", async () => {
  const executions = [];

  const registry = {
    async execute(toolId, context, input) {
      executions.push({ toolId, context, input });

      return {
        ok: true,
        groundingLevel: "VERIFIED",
        evidence: [],
        data: {
          matches: [],
          matchCount: 0,
        },
      };
    },
  };

  const responses = {
    create(request) {
      return {
        intent: request.classification.intent,
        answer: "Normal private lookup completed.",
        grounding: {
          level: "VERIFIED",
          evidence: [],
        },
        actions: [],
      };
    },

    createInputAmbiguity() {
      throw new Error(
        "Unrelated entity ambiguity must not block the selected private tool.",
      );
    },
  };

  const orchestrator = new AtlasOrchestrator(
    registry,
    responses,
  );

  await orchestrator.plan(
    "show my order TV-1001 and gift 42 and gift 84",
    {
      pathname: "/account",
      isAuthenticated: true,
    },
  );

  assert.equal(executions.length, 1);
  assert.equal(
    executions[0].toolId,
    "find_my_marketplace_orders",
  );
  assert.deepEqual(
    executions[0].input,
    { query: "TV-1001" },
  );
});

test("5B.1G ambiguous Gift Vault references also stop before private tool execution", async () => {
  let executeCount = 0;

  const registry = {
    async execute() {
      executeCount += 1;
      throw new Error(
        "Private gift lookup must not execute while Gift IDs are ambiguous.",
      );
    },
  };

  const responses = {
    create() {
      throw new Error(
        "Normal response creation must not run for ambiguous Gift IDs.",
      );
    },

    createInputAmbiguity(request) {
      return ambiguityPlan(request);
    },
  };

  const orchestrator = new AtlasOrchestrator(
    registry,
    responses,
  );

  const plan = await orchestrator.plan(
    "show my gift 42 and gift 84",
    {
      pathname: "/gift-vault/manage",
      isAuthenticated: true,
    },
  );

  assert.equal(executeCount, 0);
  assert.equal(plan.intent, "gift");
  assert.deepEqual(
    plan.disambiguation?.map((choice) => choice.id),
    ["42", "84"],
  );
});
