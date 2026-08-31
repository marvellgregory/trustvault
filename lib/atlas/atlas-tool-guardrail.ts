import {
  evaluateAtlasCapability,
  type AtlasGuardrailEvaluation,
} from "./atlas-guardrail-evaluator";

import type {
  AtlasCapability,
} from "./atlas-guardrail-policy";

import type {
  AtlasTool,
  AtlasToolContext,
} from "./atlas-tool.js";

export function getAtlasToolCapability(
  tool: AtlasTool,
): AtlasCapability {
  if (tool.riskLevel === "navigation") {
    return "navigation";
  }

  if (
    tool.riskLevel === "read" &&
    tool.requiresAuthentication
  ) {
    return "private-read";
  }

  if (
    tool.riskLevel === "read" &&
    !tool.requiresAuthentication
  ) {
    return "public-read";
  }

  throw new Error(
    `Atlas tool "${tool.id}" has no guardrail capability mapping.`,
  );
}

export function evaluateAtlasToolGuardrail(
  tool: AtlasTool,
  context: AtlasToolContext,
): AtlasGuardrailEvaluation {
  const capability = getAtlasToolCapability(tool);

  return evaluateAtlasCapability(
    capability,
    {
      isAuthenticated: context.isAuthenticated,
    },
  );
}