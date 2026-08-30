import type {
  AtlasConversationContext,
  AtlasConversationReference,
} from "./atlas-conversation-context";
import type { AtlasIntent } from "./atlas-types.js";

export const ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT = 8;

export type AtlasConversationMemory = {
  previousIntent?: AtlasIntent;
  activeReference?: AtlasConversationReference;
  references: readonly AtlasConversationReference[];
  turnCount: number;
};

function referenceKey(reference: AtlasConversationReference): string {
  return `${reference.type}:${reference.id}`.toLowerCase();
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
  const nextReferences = [...memory.references];

  if (context.reference) {
    const nextKey = referenceKey(context.reference);

    const existingIndex = nextReferences.findIndex(
      (reference) => referenceKey(reference) === nextKey,
    );

    if (existingIndex >= 0) {
      nextReferences.splice(existingIndex, 1);
    }

    nextReferences.push(context.reference);
  }

  const boundedReferences = nextReferences.slice(
    -ATLAS_CONVERSATION_MEMORY_REFERENCE_LIMIT,
  );

  return {
    ...(context.previousIntent
      ? { previousIntent: context.previousIntent }
      : memory.previousIntent
        ? { previousIntent: memory.previousIntent }
        : {}),
    ...(context.reference
      ? { activeReference: context.reference }
      : memory.activeReference
        ? { activeReference: memory.activeReference }
        : {}),
    references: boundedReferences,
    turnCount: memory.turnCount + 1,
  };
}

export function getAtlasRememberedReference(
  memory: AtlasConversationMemory,
  type: AtlasConversationReference["type"],
): AtlasConversationReference | undefined {
  if (
    memory.activeReference &&
    memory.activeReference.type === type
  ) {
    return memory.activeReference;
  }

  for (let index = memory.references.length - 1; index >= 0; index -= 1) {
    const reference = memory.references[index];

    if (reference?.type === type) {
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
  return {
    ...(memory.previousIntent
      ? { previousIntent: memory.previousIntent }
      : {}),
    ...(memory.activeReference
      ? { reference: memory.activeReference }
      : {}),
  };
}

export function clearAtlasConversationMemory(): AtlasConversationMemory {
  return createAtlasConversationMemory();
}