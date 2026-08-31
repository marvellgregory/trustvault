import {
  getAtlasCapabilityPolicy,
  type AtlasCapability,
  type AtlasGuardrailReason,
} from "./atlas-guardrail-policy";

import type {
  AtlasPreparedTransactionStatus,
} from "./atlas-transaction-preparation";

export type AtlasTrustedGuardrailContext = {
  isAuthenticated: boolean;
  transactionStatus?: AtlasPreparedTransactionStatus;
};

export type AtlasGuardrailEvaluation = {
  capability: AtlasCapability;
  decision: "ALLOW" | "REQUIRE_AUTH" | "REQUIRE_CONFIRMATION" | "DENY";
  reason: AtlasGuardrailReason;
};

const CONFIRMED_TRANSACTION_STATUSES =
  new Set<AtlasPreparedTransactionStatus>([
    "confirmed",
  ]);

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
    if (
      context.transactionStatus === undefined ||
      !CONFIRMED_TRANSACTION_STATUSES.has(
        context.transactionStatus,
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