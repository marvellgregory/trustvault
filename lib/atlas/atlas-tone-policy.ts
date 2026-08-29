import type {
  AtlasGroundingLevel,
  AtlasIntent,
  AtlasIssueCategory,
  AtlasToneMetadata,
} from "./atlas-types.js";

export type AtlasTonePolicyInput = {
  intent: AtlasIntent;
  issueCategory: AtlasIssueCategory;
  groundingLevel: AtlasGroundingLevel;
  visualState?: string;
  requiresPrivateData?: boolean;
};

export type AtlasTonePolicy = AtlasToneMetadata;

const RESTRAINED_ISSUES = new Set<AtlasIssueCategory>([
  "wallet",
  "network",
  "payment",
  "account",
  "security",
  "refund-dispute",
]);

const PLAYFUL_ISSUES = new Set<AtlasIssueCategory>([
  "gift-vault",
  "bill-split",
  "business",
  "general",
]);

const PLAYFUL_INTENTS = new Set<AtlasIntent>([
  "knowledge",
  "route-context",
  "gift",
  "bill-split",
]);

export function resolveAtlasTonePolicy(
  input: AtlasTonePolicyInput,
): AtlasTonePolicy {
  if (
    input.groundingLevel === "UNAVAILABLE" ||
    input.visualState === "error" ||
    input.visualState === "warning" ||
    input.visualState === "support" ||
    input.intent === "diagnosis" ||
    RESTRAINED_ISSUES.has(input.issueCategory)
  ) {
    return {
      mode: "restrained",
      humourAllowed: false,
    };
  }

  if (
    input.groundingLevel === "VERIFIED" &&
    input.requiresPrivateData !== true &&
    PLAYFUL_ISSUES.has(input.issueCategory) &&
    PLAYFUL_INTENTS.has(input.intent)
  ) {
    return {
      mode: "playful",
      humourAllowed: true,
    };
  }

  return {
    mode: "warm",
    humourAllowed: false,
  };
}
