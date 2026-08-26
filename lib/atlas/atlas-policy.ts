import type { AtlasTool } from "./atlas-tool.js";

const FOUNDATION_RISK_LEVELS = new Set(["read", "navigation"]);

export function isFoundationalAtlasTool(tool: AtlasTool): boolean {
  return tool.readOnly && FOUNDATION_RISK_LEVELS.has(tool.riskLevel);
}

export function assertFoundationalAtlasTool(tool: AtlasTool): void {
  if (!isFoundationalAtlasTool(tool)) {
    throw new Error(
      `Atlas Package 1 tool "${tool.id}" must be read-only with read or navigation risk.`,
    );
  }
}

