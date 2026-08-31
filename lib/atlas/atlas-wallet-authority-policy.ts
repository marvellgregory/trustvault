export const ATLAS_WALLET_AUTHORITY_ACTIONS = [
  "prepare-intent",
  "review-intent",
  "request-confirmation",
  "create-execution-handoff",
  "possess-wallet-provider",
  "possess-signing-account",
  "access-wallet-secret",
  "sign-wallet-operation",
  "broadcast-wallet-operation",
  "autonomous-fund-movement",
] as const;

export type AtlasWalletAuthorityAction =
  (typeof ATLAS_WALLET_AUTHORITY_ACTIONS)[number];

export const ATLAS_WALLET_AUTHORITY_DECISIONS = [
  "ATLAS_ALLOWED",
  "USER_WALLET_REQUIRED",
  "FORBIDDEN",
] as const;

export type AtlasWalletAuthorityDecision =
  (typeof ATLAS_WALLET_AUTHORITY_DECISIONS)[number];

export type AtlasWalletAuthorityReason =
  | "SAFE_INTENT_OPERATION"
  | "EXECUTION_REQUIRES_EXTERNAL_USER_WALLET"
  | "WALLET_PROVIDER_OWNERSHIP_FORBIDDEN"
  | "SIGNING_ACCOUNT_OWNERSHIP_FORBIDDEN"
  | "WALLET_SECRET_ACCESS_FORBIDDEN"
  | "WALLET_SIGNING_FORBIDDEN"
  | "WALLET_BROADCAST_FORBIDDEN"
  | "AUTONOMOUS_FUND_MOVEMENT_FORBIDDEN";

export type AtlasWalletAuthorityPolicy = Readonly<{
  action: AtlasWalletAuthorityAction;
  decision: AtlasWalletAuthorityDecision;
  reason: AtlasWalletAuthorityReason;
}>;

const POLICY: Readonly<
  Record<
    AtlasWalletAuthorityAction,
    AtlasWalletAuthorityPolicy
  >
> = Object.freeze({
  "prepare-intent": Object.freeze({
    action: "prepare-intent",
    decision: "ATLAS_ALLOWED",
    reason: "SAFE_INTENT_OPERATION",
  }),

  "review-intent": Object.freeze({
    action: "review-intent",
    decision: "ATLAS_ALLOWED",
    reason: "SAFE_INTENT_OPERATION",
  }),

  "request-confirmation": Object.freeze({
    action: "request-confirmation",
    decision: "ATLAS_ALLOWED",
    reason: "SAFE_INTENT_OPERATION",
  }),

  "create-execution-handoff": Object.freeze({
    action: "create-execution-handoff",
    decision: "USER_WALLET_REQUIRED",
    reason: "EXECUTION_REQUIRES_EXTERNAL_USER_WALLET",
  }),

  "possess-wallet-provider": Object.freeze({
    action: "possess-wallet-provider",
    decision: "FORBIDDEN",
    reason: "WALLET_PROVIDER_OWNERSHIP_FORBIDDEN",
  }),

  "possess-signing-account": Object.freeze({
    action: "possess-signing-account",
    decision: "FORBIDDEN",
    reason: "SIGNING_ACCOUNT_OWNERSHIP_FORBIDDEN",
  }),

  "access-wallet-secret": Object.freeze({
    action: "access-wallet-secret",
    decision: "FORBIDDEN",
    reason: "WALLET_SECRET_ACCESS_FORBIDDEN",
  }),

  "sign-wallet-operation": Object.freeze({
    action: "sign-wallet-operation",
    decision: "FORBIDDEN",
    reason: "WALLET_SIGNING_FORBIDDEN",
  }),

  "broadcast-wallet-operation": Object.freeze({
    action: "broadcast-wallet-operation",
    decision: "FORBIDDEN",
    reason: "WALLET_BROADCAST_FORBIDDEN",
  }),

  "autonomous-fund-movement": Object.freeze({
    action: "autonomous-fund-movement",
    decision: "FORBIDDEN",
    reason: "AUTONOMOUS_FUND_MOVEMENT_FORBIDDEN",
  }),
});

export function getAtlasWalletAuthorityPolicy(
  action: AtlasWalletAuthorityAction,
): AtlasWalletAuthorityPolicy {
  return POLICY[action];
}