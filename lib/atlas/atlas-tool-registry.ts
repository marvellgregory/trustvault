import { assertFoundationalAtlasTool } from "./atlas-policy.js";
import { atlasToolFailure } from "./atlas-result.js";
import type { AtlasToolResult } from "./atlas-result.js";
import type {
  AtlasTool,
  AtlasToolContext,
  AtlasToolMetadata,
} from "./atlas-tool.js";
import type { AtlasToolCategory } from "./atlas-types.js";

export class AtlasToolRegistry {
  readonly #tools = new Map<string, AtlasTool>();

  constructor(tools: readonly AtlasTool[] = []) {
    for (const tool of tools) this.register(tool);
  }

  register(tool: AtlasTool): void {
    if (this.#tools.has(tool.id)) {
      throw new Error(`Duplicate Atlas tool ID: ${tool.id}`);
    }
    assertFoundationalAtlasTool(tool);
    this.#tools.set(tool.id, tool);
  }

  get(id: string): AtlasTool | undefined {
    return this.#tools.get(id);
  }

  getMetadata(): readonly AtlasToolMetadata[] {
    return [...this.#tools.values()].map((tool) => ({
      id: tool.id,
      description: tool.description,
      category: tool.category,
      readOnly: tool.readOnly,
      requiresAuthentication: tool.requiresAuthentication,
      requiresWallet: tool.requiresWallet,
      riskLevel: tool.riskLevel,
    }));
  }

  filterByCategory(category: AtlasToolCategory): readonly AtlasToolMetadata[] {
    return this.getMetadata().filter((tool) => tool.category === category);
  }

  async execute(
    id: string,
    context: AtlasToolContext,
    input: unknown,
  ): Promise<AtlasToolResult> {
    const tool = this.#tools.get(id);
    if (!tool) {
      return atlasToolFailure(
        "UNKNOWN_TOOL",
        `Atlas tool "${id}" is not registered.`,
      );
    }

    try {
      return await tool.execute(context, input);
    } catch {
      return atlasToolFailure(
        "EXECUTION_FAILED",
        `Atlas tool "${id}" could not complete.`,
      );
    }
  }
}
