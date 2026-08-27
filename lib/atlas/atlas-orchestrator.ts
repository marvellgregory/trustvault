import { classifyAtlasIntent, extractGiftId } from "./atlas-intent";
import { AtlasResponseEngine } from "./atlas-response-engine";
import type { AtlasToolContext } from "./atlas-tool.js";
import { AtlasToolRegistry } from "./atlas-tool-registry";
import { ALL_ATLAS_TOOLS } from "./atlas-tools";
import type { AtlasResponsePlan } from "./atlas-types.js";

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

  async plan(message: string, context: AtlasToolContext): Promise<AtlasResponsePlan> {
    const classification = classifyAtlasIntent(message);

    if (classification.intent === "support" || classification.intent === "activity") {
      return this.#responses.create({ message, classification, context });
    }

    if (classification.toolId) {
      const input =
        classification.intent === "gift"
          ? { giftId: extractGiftId(message) ?? "" }
          : { query: message };
      const result = await this.#registry.execute(
        classification.toolId,
        context,
        input,
      );
      return this.#responses.create({ message, classification, context, result });
    }

    const result = await this.#registry.execute(
      "search_trustvault_knowledge",
      context,
      { query: message },
    );
    return this.#responses.create({ message, classification, context, result });
  }
}
