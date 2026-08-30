import type { AtlasConversationContext } from "./atlas-conversation-context.js";
import {
  extractAtlasEntities,
  type AtlasExtractedEntity,
} from "./atlas-entity-extraction.ts";
import {
  classifyAtlasIntent,
  type AtlasIntentClassification,
} from "./atlas-intent.ts";
import {
  resolveAtlasFollowUp,
  type AtlasFollowUpResolution,
} from "./atlas-follow-up.ts";

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
};

export function buildAtlasReasoningContext(
  message: string,
  conversation?: AtlasConversationContext,
): AtlasReasoningContext {
  const classification = classifyAtlasIntent(message);
  const entities = extractAtlasEntities(message);
  const followUp = resolveAtlasFollowUp(message, conversation);

  const hasExplicitEntity = entities.some(
    (entity) => entity.reference === "explicit",
  );

  const hasContextualEntity = entities.some(
    (entity) => entity.reference !== "explicit",
  );

  const hasConversationReference = Boolean(conversation?.reference);

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
  };
}
