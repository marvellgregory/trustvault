import type {
  AtlasIntent,
  AtlasIssueCategory,
  AtlasRiskLevel,
} from "./atlas-types.js";

export const ATLAS_WEB_ELIGIBILITY_DECISIONS = [
  "BLOCKED",
  "LOCAL_FIRST",
  "ELIGIBLE",
] as const;

export type AtlasWebEligibilityDecision =
  (typeof ATLAS_WEB_ELIGIBILITY_DECISIONS)[number];

export type AtlasWebEligibilityReason =
  | "PRIVATE_CUSTOMER_DATA"
  | "TRANSACTION_AUTHORITY"
  | "SENSITIVE_TRUSTVAULT_TRUTH"
  | "DIAGNOSIS"
  | "SUPPORT_WORKFLOW"
  | "TRUSTVAULT_FEATURE_KNOWLEDGE"
  | "PUBLIC_INFORMATION";

export type AtlasWebEligibility = {
  decision: AtlasWebEligibilityDecision;
  reason: AtlasWebEligibilityReason;
};

export type AtlasWebEligibilityInput = {
  intent: AtlasIntent;
  issueCategory: AtlasIssueCategory;
  requiresPrivateData?: boolean;
  toolId?: string;
  riskLevel?: AtlasRiskLevel;
  feature?: string;
};

const PRIVATE_INTENTS = new Set<AtlasIntent>([
  "marketplace-order",
  "receipt",
  "gift",
  "bill-split",
  "activity",
  "delivery-tracking",
]);

const ALWAYS_SENSITIVE_ISSUES = new Set<AtlasIssueCategory>([
  "wallet",
  "network",
  "payment",
  "account",
  "security",
  "refund-dispute",
]);

const TRANSACTION_RISKS = new Set<AtlasRiskLevel>([
  "prepare",
  "mutation",
  "transaction",
]);

export function resolveAtlasWebEligibility(
  input: AtlasWebEligibilityInput,
): AtlasWebEligibility {
  if (input.requiresPrivateData === true) {
    return {
      decision: "BLOCKED",
      reason: "PRIVATE_CUSTOMER_DATA",
    };
  }

  if (
    input.riskLevel !== undefined &&
    TRANSACTION_RISKS.has(input.riskLevel)
  ) {
    return {
      decision: "BLOCKED",
      reason: "TRANSACTION_AUTHORITY",
    };
  }

  if (input.intent === "diagnosis") {
    return {
      decision: "BLOCKED",
      reason: "DIAGNOSIS",
    };
  }

  if (ALWAYS_SENSITIVE_ISSUES.has(input.issueCategory)) {
    return {
      decision: "BLOCKED",
      reason: "SENSITIVE_TRUSTVAULT_TRUTH",
    };
  }

  if (
    input.feature !== undefined ||
    input.intent === "navigation" ||
    input.intent === "route-context"
  ) {
    return {
      decision: "LOCAL_FIRST",
      reason: "TRUSTVAULT_FEATURE_KNOWLEDGE",
    };
  }

  if (PRIVATE_INTENTS.has(input.intent)) {
    return {
      decision: "BLOCKED",
      reason: "PRIVATE_CUSTOMER_DATA",
    };
  }

  if (input.intent === "support") {
    return {
      decision: "LOCAL_FIRST",
      reason: "SUPPORT_WORKFLOW",
    };
  }

  return {
    decision: "ELIGIBLE",
    reason: "PUBLIC_INFORMATION",
  };
}
