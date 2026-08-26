import type {
  AtlasEvidence,
  AtlasGrounding,
  AtlasGroundingLevel,
  AtlasResponsePlan,
} from "./atlas-types.js";

export const ATLAS_UNAVAILABLE_MESSAGE =
  "I couldn't verify that from the information currently available in TrustVault. I don't want to guess.";

export function createAtlasGrounding(
  level: AtlasGroundingLevel,
  evidence: readonly AtlasEvidence[],
): AtlasGrounding {
  if (level === "VERIFIED" && evidence.length === 0) {
    throw new Error("VERIFIED grounding requires TrustVault evidence.");
  }

  return { level, evidence: [...evidence] };
}

export function getAtlasGroundingLevel(
  evidence: readonly AtlasEvidence[],
  isIncomplete = false,
): AtlasGroundingLevel {
  if (evidence.length === 0) return "UNAVAILABLE";
  return isIncomplete ? "PARTIAL" : "VERIFIED";
}

export function createUnavailableResponsePlan(
  intent: AtlasResponsePlan["intent"],
  actions: AtlasResponsePlan["actions"] = [],
): AtlasResponsePlan {
  return {
    intent,
    answer: ATLAS_UNAVAILABLE_MESSAGE,
    grounding: createAtlasGrounding("UNAVAILABLE", []),
    actions,
  };
}

