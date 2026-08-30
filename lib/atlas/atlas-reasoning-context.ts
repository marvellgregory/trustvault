import type { AtlasConversationContext } from "./atlas-conversation-context.js";
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

export function buildAtlasReasoningContext(
  message: string,
  conversation?: AtlasConversationContext,
): AtlasReasoningContext {
  const classification = classifyAtlasIntent(message);
  const entities = extractAtlasEntities(message);
  const candidateFollowUp = resolveAtlasFollowUp(message, conversation);
  const conversationReference = conversation?.reference;

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

  const hasConversationReference = Boolean(conversation?.reference);

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
    ...(conversation ? { conversation } : {}),
    followUp,
    resolutionSource,
    hasExplicitEntity,
    hasContextualEntity,
    hasConversationReference,
    hasAmbiguousExplicitEntities,
    ambiguousExplicitEntityKinds,
  };
}
