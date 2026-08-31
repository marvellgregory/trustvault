export const ATLAS_GUARDRAIL_DECISIONS = [
  "ALLOW",
  "REQUIRE_AUTH",
  "REQUIRE_CONFIRMATION",
  "DENY",
] as const;

export type AtlasGuardrailDecision =
  (typeof ATLAS_GUARDRAIL_DECISIONS)[number];

export const ATLAS_CAPABILITIES = [
  "public-read",
  "private-read",
  "navigation",
  "transaction-prepare",
  "transaction-review",
  "transaction-confirmation",
  "execution-handoff",
  "wallet-signing",
  "autonomous-transaction",
  "secret-handling",
] as const;

export type AtlasCapability =
  (typeof ATLAS_CAPABILITIES)[number];

export type AtlasGuardrailReason =
  | "SAFE_PUBLIC_OPERATION"
  | "PRIVATE_DATA_REQUIRES_AUTH"
  | "FINANCIAL_ACTION_REQUIRES_CONFIRMATION"
  | "SIGNING_AUTHORITY_FORBIDDEN"
  | "AUTONOMOUS_FINANCIAL_EXECUTION_FORBIDDEN"
  | "SECRET_HANDLING_FORBIDDEN";

export type AtlasCapabilityPolicy = {
  capability: AtlasCapability;
  decision: AtlasGuardrailDecision;
  reason: AtlasGuardrailReason;
};

const POLICY: Readonly<
  Record<AtlasCapability, AtlasCapabilityPolicy>
> = {
  "public-read": {
    capability: "public-read",
    decision: "ALLOW",
    reason: "SAFE_PUBLIC_OPERATION",
  },

  "private-read": {
    capability: "private-read",
    decision: "REQUIRE_AUTH",
    reason: "PRIVATE_DATA_REQUIRES_AUTH",
  },

  navigation: {
    capability: "navigation",
    decision: "ALLOW",
    reason: "SAFE_PUBLIC_OPERATION",
  },

  "transaction-prepare": {
    capability: "transaction-prepare",
    decision: "ALLOW",
    reason: "SAFE_PUBLIC_OPERATION",
  },

  "transaction-review": {
    capability: "transaction-review",
    decision: "ALLOW",
    reason: "SAFE_PUBLIC_OPERATION",
  },

  "transaction-confirmation": {
    capability: "transaction-confirmation",
    decision: "REQUIRE_CONFIRMATION",
    reason: "FINANCIAL_ACTION_REQUIRES_CONFIRMATION",
  },

  "execution-handoff": {
    capability: "execution-handoff",
    decision: "REQUIRE_CONFIRMATION",
    reason: "FINANCIAL_ACTION_REQUIRES_CONFIRMATION",
  },

  "wallet-signing": {
    capability: "wallet-signing",
    decision: "DENY",
    reason: "SIGNING_AUTHORITY_FORBIDDEN",
  },

  "autonomous-transaction": {
    capability: "autonomous-transaction",
    decision: "DENY",
    reason: "AUTONOMOUS_FINANCIAL_EXECUTION_FORBIDDEN",
  },

  "secret-handling": {
    capability: "secret-handling",
    decision: "DENY",
    reason: "SECRET_HANDLING_FORBIDDEN",
  },
};

export function getAtlasCapabilityPolicy(
  capability: AtlasCapability,
): AtlasCapabilityPolicy {
  return POLICY[capability];
}