import type { AtlasConversationContext } from "./atlas-conversation-context.js";
import type { AtlasConversationMemory } from "./atlas-conversation-memory";
import {
  buildAtlasEntityAwareToolInput,
  getAtlasAmbiguousEntityToolReferences,
} from "./atlas-entity-tool-input";
import { buildAtlasReasoningContext } from "./atlas-reasoning-context";
import { AtlasResponseEngine } from "./atlas-response-engine";
import { classifyAtlasIssue } from "./atlas-resolution";
import type { AtlasToolContext } from "./atlas-tool.js";
import { AtlasToolRegistry } from "./atlas-tool-registry";
import { ALL_ATLAS_TOOLS } from "./atlas-tools";
import type { AtlasResponsePlan } from "./atlas-types.js";
import { resolveAtlasWebEligibility } from "./atlas-web-eligibility";

export type AtlasPlanContext = AtlasToolContext & {
  conversation?: AtlasConversationContext;
  memory?: AtlasConversationMemory;
};

export class AtlasOrchestrator {
  readonly #registry: AtlasToolRegistry;
  readonly #responses: AtlasResponseEngine;

  constructor(
    registry = new AtlasToolRegistry(ALL_ATLAS_TOOLS),
    responses = new AtlasResponseEngine(),
  ) {
    this.#registry = registry;
    this.#responses = responses;
  }

  async plan(
    message: string,
    context: AtlasPlanContext,
  ): Promise<AtlasResponsePlan> {
    const reasoning = buildAtlasReasoningContext(
      message,
      context.conversation,
      context.memory,
    );
    const followUp = reasoning.followUp;

    if (followUp) {
      const classification = {
        intent: followUp.intent,
        requiresPrivateData: true,
        toolId: followUp.toolId,
      } as const;

      const result = await this.#registry.execute(
        followUp.toolId,
        context,
        followUp.input,
      );

      return this.#responses.create({
        message,
        classification,
        context,
        result,
      });
    }

    const classification = reasoning.classification;

    if (
      classification.intent === "support" ||
      classification.intent === "activity"
    ) {
      return this.#responses.create({ message, classification, context });
    }

    if (classification.toolId) {
      const ambiguousEntities =
        getAtlasAmbiguousEntityToolReferences(
          classification.toolId,
          reasoning.entities,
        );

      if (ambiguousEntities.length > 0) {
        return this.#responses.createInputAmbiguity({
          message,
          classification,
          context,
          entities: ambiguousEntities,
        });
      }

      const input = buildAtlasEntityAwareToolInput(
        classification.toolId,
        message,
        reasoning.entities,
      );

      const result = await this.#registry.execute(
        classification.toolId,
        context,
        input,
      );

      return this.#responses.create({
        message,
        classification,
        context,
        result,
      });
    }

    const result = await this.#registry.execute(
      "search_trustvault_knowledge",
      context,
      { query: message },
    );

    const response = this.#responses.create({
      message,
      classification,
      context,
      result,
    });

    if (result.groundingLevel !== "UNAVAILABLE") {
      return response;
    }

    const issueCategory = classifyAtlasIssue(message, context.pathname);

    const eligibility = resolveAtlasWebEligibility({
      intent: classification.intent,
      issueCategory,
      requiresPrivateData: classification.requiresPrivateData,
      toolId: classification.toolId,
      feature: classification.feature,
    });

    return {
      ...response,
      webFallback: {
        trigger: "TRUSTVAULT_UNAVAILABLE",
        decision: eligibility.decision,
        reason: eligibility.reason,
      },
    };
  }
}
