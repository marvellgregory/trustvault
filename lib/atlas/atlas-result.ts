import type { AtlasEvidence, AtlasGroundingLevel } from "./atlas-types.js";

export type AtlasToolErrorCode =
  | "INVALID_INPUT"
  | "AUTHORIZATION_REQUIRED"
  | "DATA_UNAVAILABLE"
  | "UNKNOWN_TOOL"
  | "UNSAFE_ROUTE"
  | "EXECUTION_FAILED";

export type AtlasToolResult<T = unknown> =
  | {
      ok: true;
      data: T;
      groundingLevel: AtlasGroundingLevel;
      evidence: readonly AtlasEvidence[];
    }
  | {
      ok: false;
      code: AtlasToolErrorCode;
      message: string;
      groundingLevel: "UNAVAILABLE";
      evidence: readonly [];
    };

export function atlasToolSuccess<T>(
  data: T,
  groundingLevel: AtlasGroundingLevel = "UNAVAILABLE",
  evidence: readonly AtlasEvidence[] = [],
): AtlasToolResult<T> {
  return { ok: true, data, groundingLevel, evidence };
}

export function atlasToolFailure(
  code: AtlasToolErrorCode,
  message: string,
): AtlasToolResult<never> {
  return {
    ok: false,
    code,
    message,
    groundingLevel: "UNAVAILABLE",
    evidence: [],
  };
}
