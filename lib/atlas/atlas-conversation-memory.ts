import type {
  AtlasConversationContext,
  AtlasConversationReference,
} from "./atlas-conversation-context";
import type { AtlasIntent } from "./atlas-types.js";

export const ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT = 8;
export const ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS = 12;

export type AtlasConversationMemory = {
  previousIntent?: AtlasIntent;
  activeReference?: AtlasConversationReference;
  references: readonly AtlasConversationReference[];
  turnCount: number;
  referenceTurns?: Readonly<Record<string, number>>;
};

function referenceKey(reference: AtlasConversationReference): string {
  return `${reference.type}:${reference.id}`.toLowerCase();
}

function isReferenceFresh(
  memory: AtlasConversationMemory,
  reference: AtlasConversationReference,
): boolean {
  const lastSeenTurn = memory.referenceTurns?.[referenceKey(reference)];

  // Memories created before lifecycle metadata existed remain compatible.
  if (lastSeenTurn === undefined) {
    return true;
  }

  return (
    memory.turnCount - lastSeenTurn <
    ATLAS_CONVERSATION_MEMORY_MAX_IDLE_TURNS
  );
}

export function createAtlasConversationMemory(): AtlasConversationMemory {
  return {
    references: [],
    turnCount: 0,
  };
}

export function updateAtlasConversationMemory(
  memory: AtlasConversationMemory,
  context: AtlasConversationContext,
): AtlasConversationMemory {
  const nextTurnCount = memory.turnCount + 1;
  const nextReferenceTurns = {
    ...(memory.referenceTurns ?? {}),
  };

  let nextReferences = memory.references.filter((reference) =>
    isReferenceFresh(
      {
        ...memory,
        turnCount: nextTurnCount,
      },
      reference,
    ),
  );

  for (const key of Object.keys(nextReferenceTurns)) {
    if (
      !nextReferences.some(
        (reference) => referenceKey(reference) === key,
      )
    ) {
      delete nextReferenceTurns[key];
    }
  }

  if (context.reference) {
    const nextKey = referenceKey(context.reference);

    const existingIndex = nextReferences.findIndex(
      (reference) => referenceKey(reference) === nextKey,
    );

    if (existingIndex >= 0) {
      nextReferences.splice(existingIndex, 1);
    }

    nextReferences.push(context.reference);
    nextReferenceTurns[nextKey] = nextTurnCount;
  }

  nextReferences = nextReferences.slice(
    -ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT,
  );

  const retainedKeys = new Set(nextReferences.map(referenceKey));

  for (const key of Object.keys(nextReferenceTurns)) {
    if (!retainedKeys.has(key)) {
      delete nextReferenceTurns[key];
    }
  }

  const previousActiveReference = memory.activeReference;
  const retainedActiveReference =
    previousActiveReference &&
    nextReferences.some(
      (reference) =>
        referenceKey(reference) ===
        referenceKey(previousActiveReference),
    )
      ? previousActiveReference
      : undefined;

  const activeReference =
    context.reference ?? retainedActiveReference;

  return {
    ...(context.previousIntent
      ? { previousIntent: context.previousIntent }
      : memory.previousIntent
        ? { previousIntent: memory.previousIntent }
        : {}),
    ...(activeReference ? { activeReference } : {}),
    references: nextReferences,
    turnCount: nextTurnCount,
    ...(Object.keys(nextReferenceTurns).length > 0
      ? { referenceTurns: nextReferenceTurns }
      : {}),
  };
}

export function getAtlasRememberedReference(
  memory: AtlasConversationMemory,
  type: AtlasConversationReference["type"],
): AtlasConversationReference | undefined {
  if (
    memory.activeReference &&
    memory.activeReference.type === type &&
    isReferenceFresh(memory, memory.activeReference)
  ) {
    return memory.activeReference;
  }

  for (let index = memory.references.length - 1; index >= 0; index -= 1) {
    const reference = memory.references[index];

    if (
      reference?.type === type &&
      isReferenceFresh(memory, reference)
    ) {
      return reference;
    }
  }

  return undefined;
}

export function toAtlasConversationContextForReference(
  memory: AtlasConversationMemory,
  type: AtlasConversationReference["type"],
): AtlasConversationContext {
  const reference = getAtlasRememberedReference(memory, type);

  return {
    ...(memory.previousIntent
      ? { previousIntent: memory.previousIntent }
      : {}),
    ...(reference ? { reference } : {}),
  };
}

export function toAtlasConversationContext(
  memory: AtlasConversationMemory,
): AtlasConversationContext {
  const activeReference =
    memory.activeReference &&
    isReferenceFresh(memory, memory.activeReference)
      ? memory.activeReference
      : undefined;

  return {
    ...(memory.previousIntent
      ? { previousIntent: memory.previousIntent }
      : {}),
    ...(activeReference
      ? { reference: activeReference }
      : {}),
  };
}

export function clearAtlasConversationMemory(): AtlasConversationMemory {
  return createAtlasConversationMemory();
}