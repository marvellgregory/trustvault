import type { AtlasToolResult } from "./atlas-result.js";
import type { AtlasRiskLevel, AtlasToolCategory } from "./atlas-types.js";

export type AtlasToolContext = {
  pathname: string;
  isAuthenticated: boolean;
  hasConnectedWallet: boolean;
  navigate?: (route: string) => void | Promise<void>;
};

export type AtlasTool<TInput = unknown, TOutput = unknown> = {
  id: string;
  description: string;
  category: AtlasToolCategory;
  readOnly: boolean;
  requiresAuthentication: boolean;
  requiresWallet: boolean;
  riskLevel: AtlasRiskLevel;
  execute(
    context: AtlasToolContext,
    input: TInput,
  ): AtlasToolResult<TOutput> | Promise<AtlasToolResult<TOutput>>;
};

export type AtlasToolMetadata = Omit<AtlasTool, "execute">;

