import assert from "node:assert/strict";
import test from "node:test";

const {
  buildAtlasReasoningContext,
} = await import("./atlas-reasoning-context.ts");

test("5B.1C assembles classification and explicit entity context", () => {
  const result = buildAtlasReasoningContext(
    "show me order TV-1001",
  );

  assert.equal(result.message, "show me order TV-1001");
  assert.equal(result.hasExplicitEntity, true);
  assert.equal(result.hasContextualEntity, false);
  assert.equal(result.hasConversationReference, false);
  assert.equal(result.resolutionSource, "explicit-entity");

  assert.equal(
    result.entities.some(
      (entity) =>
        entity.kind === "marketplace-order" &&
        entity.reference === "explicit" &&
        entity.value === "TV-1001",
    ),
    true,
  );
});

test("5B.1C preserves contextual entity references without inventing IDs", () => {
  const result = buildAtlasReasoningContext(
    "show my latest gift",
  );

  assert.equal(result.hasExplicitEntity, false);
  assert.equal(result.hasContextualEntity, true);
  assert.equal(result.resolutionSource, "contextual-entity");

  assert.equal(
    result.entities.some(
      (entity) =>
        entity.kind === "gift" &&
        entity.reference === "latest" &&
        entity.value === undefined,
    ),
    true,
  );
});

test("5B.1C detects available conversation references", () => {
  const result = buildAtlasReasoningContext(
    "what about that order",
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  assert.equal(result.hasConversationReference, true);
  assert.equal(result.conversation?.reference?.type, "marketplace-order");
});

test("5B.1C gives resolved follow-up precedence over other reasoning signals", () => {
  const result = buildAtlasReasoningContext(
    "track that order",
    {
      previousIntent: "marketplace-order",
      reference: {
        type: "marketplace-order",
        id: "TV-1001",
      },
    },
  );

  assert.equal(result.followUp?.toolId, "get_my_order_delivery");
  assert.deepEqual(result.followUp?.input, {
    query: "TV-1001",
  });
  assert.equal(result.resolutionSource, "follow-up");
});

test("5B.1C falls back to classification when no entity or follow-up exists", () => {
  const result = buildAtlasReasoningContext(
    "how does TrustVault work",
  );

  assert.equal(result.hasExplicitEntity, false);
  assert.equal(result.hasContextualEntity, false);
  assert.equal(result.hasConversationReference, false);
  assert.equal(result.followUp, null);
  assert.equal(result.resolutionSource, "classification");
});

test("5B.1C transaction hashes remain reasoning data only", () => {
  const hash = `0x${"a".repeat(64)}`;

  const result = buildAtlasReasoningContext(
    `check transaction ${hash}`,
  );

  assert.equal(result.hasExplicitEntity, true);

  const transaction = result.entities.find(
    (entity) => entity.kind === "transaction-hash",
  );

  assert.equal(transaction?.value, hash);

  assert.equal("authenticated" in result, false);
  assert.equal("authorized" in result, false);
  assert.equal("owned" in result, false);
  assert.equal("execute" in result, false);
  assert.equal("transaction" in result, false);
});
