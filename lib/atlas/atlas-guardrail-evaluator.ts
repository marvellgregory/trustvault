import {
  getAtlasCapabilityPolicy,
  type AtlasCapability,
  type AtlasGuardrailReason,
} from "./atlas-guardrail-policy";

export const ATLAS_CONFIRMATION_EVIDENCE = [
  "NONE",
  "EXPLICIT_USER_ACTION",
  "CONFIRMED_TRANSACTION",
] as const;

export type AtlasConfirmationEvidence =
  (typeof ATLAS_CONFIRMATION_EVIDENCE)[number];

export type AtlasTrustedGuardrailContext = {
  isAuthenticated: boolean;
  confirmationEvidence?: AtlasConfirmationEvidence;
};

export type AtlasGuardrailEvaluation = {
  capability: AtlasCapability;
  decision: "ALLOW" | "REQUIRE_AUTH" | "REQUIRE_CONFIRMATION" | "DENY";
  reason: AtlasGuardrailReason;
};

function hasRequiredConfirmationEvidence(
  capability: AtlasCapability,
  evidence: AtlasConfirmationEvidence,
): boolean {
  if (capability === "transaction-confirmation") {
    return evidence === "EXPLICIT_USER_ACTION";
  }

  if (capability === "execution-handoff") {
    return evidence === "CONFIRMED_TRANSACTION";
  }

  return false;
}

export function evaluateAtlasCapability(
  capability: AtlasCapability,
  context: AtlasTrustedGuardrailContext,
): AtlasGuardrailEvaluation {
  const policy = getAtlasCapabilityPolicy(capability);

  if (policy.decision === "DENY") {
    return policy;
  }

  if (policy.decision === "REQUIRE_AUTH") {
    if (!context.isAuthenticated) {
      return policy;
    }

    return {
      capability,
      decision: "ALLOW",
      reason: "SAFE_PUBLIC_OPERATION",
    };
  }

  if (policy.decision === "REQUIRE_CONFIRMATION") {
    const evidence =
      context.confirmationEvidence ?? "NONE";

    if (
      !hasRequiredConfirmationEvidence(
        capability,
        evidence,
      )
    ) {
      return policy;
    }

    return {
      capability,
      decision: "ALLOW",
      reason: "SAFE_PUBLIC_OPERATION",
    };
  }

  return policy;
}