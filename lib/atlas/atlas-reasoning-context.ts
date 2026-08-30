import type {
  AtlasConversationContext,
  AtlasConversationReference,
} from "./atlas-conversation-context.js";
import {
  getAtlasRememberedReference,
  type AtlasConversationMemory,
} from "./atlas-conversation-memory";
import {
  extractAtlasEntities,
  type AtlasExtractedEntity,
} from "./atlas-entity-extraction";
import {
  classifyAtlasIntent,
  type AtlasIntentClassification,
} from "./atlas-intent";
import {
  resolveAtlasFollowUp,
  type AtlasFollowUpResolution,
} from "./atlas-follow-up";

export type AtlasReasoningResolutionSource =
  | "follow-up"
  | "explicit-entity"
  | "contextual-entity"
  | "classification";

export type AtlasReasoningContext = {
  message: string;
  classification: AtlasIntentClassification;
  entities: readonly AtlasExtractedEntity[];
  conversation?: AtlasConversationContext;
  followUp: AtlasFollowUpResolution | null;
  resolutionSource: AtlasReasoningResolutionSource;
  hasExplicitEntity: boolean;
  hasContextualEntity: boolean;
  hasConversationReference: boolean;
  hasAmbiguousExplicitEntities: boolean;
  ambiguousExplicitEntityKinds: readonly AtlasExtractedEntity["kind"][];
};

function getMemoryReferenceType(
  message: string,
): AtlasConversationReference["type"] | undefined {
  const normalized = message.trim().toLowerCase();

  if (/\b(receipt|proof of payment)\b/.test(normalized)) {
    return "receipt";
  }

  if (/\b(gift|gift vault)\b/.test(normalized)) {
    return "gift";
  }

  if (/\b(bill split|split|bill)\b/.test(normalized)) {
    return "bill-split";
  }

  if (
    /\b(order|purchase|delivery|tracking|track|awb|waybill|courier|shipment|package)\b/.test(
      normalized,
    )
  ) {
    return "marketplace-order";
  }

  return undefined;
}

function resolveConversationForReasoning(
  message: string,
  conversation: AtlasConversationContext | undefined,
  memory: AtlasConversationMemory | undefined,
): AtlasConversationContext | undefined {
  if (!memory) {
    return conversation;
  }

  const referenceType = getMemoryReferenceType(message);

  if (!referenceType) {
    return conversation;
  }

  let rememberedReference = getAtlasRememberedReference(
    memory,
    referenceType,
  );

  if (
    !rememberedReference &&
    referenceType === "receipt"
  ) {
    const rememberedOrder = getAtlasRememberedReference(
      memory,
      "marketplace-order",
    );

    if (
      rememberedOrder?.type === "marketplace-order" &&
      rememberedOrder.receiptId
    ) {
      rememberedReference = rememberedOrder;
    }
  }

  if (!rememberedReference) {
    return conversation;
  }

  return {
    ...(conversation?.previousIntent
      ? { previousIntent: conversation.previousIntent }
      : memory.previousIntent
        ? { previousIntent: memory.previousIntent }
        : {}),
    reference: rememberedReference,
  };
}

export function buildAtlasReasoningContext(
  message: string,
  conversation?: AtlasConversationContext,
  memory?: AtlasConversationMemory,
): AtlasReasoningContext {
  const classification = classifyAtlasIntent(message);
  const entities = extractAtlasEntities(message);
  const resolvedConversation = resolveConversationForReasoning(
    message,
    conversation,
    memory,
  );
  const candidateFollowUp = resolveAtlasFollowUp(
    message,
    resolvedConversation,
  );
  const conversationReference = resolvedConversation?.reference;

  const hasConflictingExplicitEntity = Boolean(
    conversationReference &&
      entities.some(
        (entity) =>
          entity.reference === "explicit" &&
          entity.kind === conversationReference.type,
      ),
  );

  const followUp = hasConflictingExplicitEntity ? null : candidateFollowUp;

  const hasExplicitEntity = entities.some(
    (entity) => entity.reference === "explicit",
  );

  const hasContextualEntity = entities.some(
    (entity) => entity.reference !== "explicit",
  );

  const hasConversationReference = Boolean(
    resolvedConversation?.reference,
  );

  const explicitEntityCounts = new Map<AtlasExtractedEntity["kind"], number>();

  for (const entity of entities) {
    if (entity.reference !== "explicit") continue;

    explicitEntityCounts.set(
      entity.kind,
      (explicitEntityCounts.get(entity.kind) ?? 0) + 1,
    );
  }

  const ambiguousExplicitEntityKinds = Array.from(
    explicitEntityCounts.entries(),
  )
    .filter(([, count]) => count > 1)
    .map(([kind]) => kind);

  const hasAmbiguousExplicitEntities =
    ambiguousExplicitEntityKinds.length > 0;

  let resolutionSource: AtlasReasoningResolutionSource = "classification";

  if (followUp) {
    resolutionSource = "follow-up";
  } else if (hasExplicitEntity) {
    resolutionSource = "explicit-entity";
  } else if (hasContextualEntity) {
    resolutionSource = "contextual-entity";
  }

  return {
    message,
    classification,
    entities,
    ...(resolvedConversation
      ? { conversation: resolvedConversation }
      : {}),
    followUp,
    resolutionSource,
    hasExplicitEntity,
    hasContextualEntity,
    hasConversationReference,
    hasAmbiguousExplicitEntities,
    ambiguousExplicitEntityKinds,
  };
}
