import type { WalletSession } from "./session-types.js";
import type { SerializableProviderIdentity } from "./provider-types.js";

export type WalletConsistencyIssueCode =
  | "MISSING_SELECTED_PROVIDER"
  | "MISSING_CONNECTED_ADDRESS"
  | "UNKNOWN_CHAIN"
  | "PROVIDER_NOT_IN_REGISTRY"
  | "PROVIDER_IDENTITY_MISMATCH"
  | "WAGMI_ACCOUNT_MISMATCH"
  | "VIEM_ACCOUNT_MISMATCH"
  | "CIRCLE_PROVIDER_MISMATCH"
  | "CHAIN_MISMATCH"
  | "IDENTITY_UNVERIFIED"
  | "CIRCLE_BINDING_INVALID";

export type WalletConsistencyIssue = Readonly<{
  code: WalletConsistencyIssueCode;
  message: string;
}>;

export type WalletConsistencyResult = Readonly<{
  valid: boolean;
  issues: readonly WalletConsistencyIssue[];
}>;

export function validateWalletSessionConsistency(input: {
  session: WalletSession;
  registryProviders: readonly SerializableProviderIdentity[];
  expectedChainId?: number;
}): WalletConsistencyResult {
  const { session } = input;
  const issues: WalletConsistencyIssue[] = [];

  if (session.connection === "connected" && session.identityVerification.status !== "VERIFIED") {
    addIssue(issues, "IDENTITY_UNVERIFIED", "The connected provider identity is not verified.");
  }

  if (
    session.circleEvidence.status === "CIRCLE_READY" &&
    (session.identityVerification.status !== "VERIFIED" ||
      !session.chain.arcReady ||
      session.circleEvidence.providerIdentityKey !== session.provider.registryId ||
      !session.address ||
      !session.circleEvidence.account ||
      !sameAddress(session.address, session.circleEvidence.account) ||
      session.circleEvidence.chainId !== session.chain.chainId ||
      !session.circleEvidence.exactProviderVerified)
  ) {
    addIssue(issues, "CIRCLE_BINDING_INVALID", "Circle readiness evidence is inconsistent with the wallet session.");
  }

  if (session.providerSelection !== "selected") {
    addIssue(issues, "MISSING_SELECTED_PROVIDER", "No wallet provider is selected.");
  }

  if (session.connection === "connected" && !session.address) {
    addIssue(issues, "MISSING_CONNECTED_ADDRESS", "The connected account is missing.");
  }

  if (session.connection === "connected" && !session.chain.known) {
    addIssue(issues, "UNKNOWN_CHAIN", "The connected chain is unknown.");
  }

  const registryProvider = input.registryProviders.find(
    (provider) => provider.registryId === session.provider.registryId,
  );

  if (!registryProvider) {
    addIssue(
      issues,
      "PROVIDER_NOT_IN_REGISTRY",
      "The selected provider is no longer present in the registry.",
    );
  } else if (!sameIdentity(session.provider, registryProvider)) {
    addIssue(
      issues,
      "PROVIDER_IDENTITY_MISMATCH",
      "The selected provider identity changed unexpectedly.",
    );
  }

  if (
    session.address &&
    session.bindings.wagmi?.account &&
    !sameAddress(session.address, session.bindings.wagmi.account)
  ) {
    addIssue(issues, "WAGMI_ACCOUNT_MISMATCH", "The Wagmi account does not match.");
  }

  if (
    session.address &&
    session.bindings.viem?.account &&
    !sameAddress(session.address, session.bindings.viem.account)
  ) {
    addIssue(issues, "VIEM_ACCOUNT_MISMATCH", "The Viem account does not match.");
  }

  for (const binding of [session.bindings.wagmi, session.bindings.viem]) {
    if (
      binding &&
      binding.providerIdentityKey !== session.provider.registryId
    ) {
      addIssue(
        issues,
        "PROVIDER_IDENTITY_MISMATCH",
        "A wallet binding uses a different provider identity.",
      );
      break;
    }
  }

  if (
    session.bindings.circle &&
    session.bindings.circle.providerIdentityKey !== session.provider.registryId
  ) {
    addIssue(
      issues,
      "CIRCLE_PROVIDER_MISMATCH",
      "The Circle adapter identity does not match the selected provider.",
    );
  }

  const expectedChainId = input.expectedChainId ?? session.chain.expectedArcChainId;
  if (
    session.chain.known &&
    session.chain.chainId !== expectedChainId
  ) {
    addIssue(issues, "CHAIN_MISMATCH", "The active chain does not match.");
  }

  for (const binding of [session.bindings.wagmi, session.bindings.viem]) {
    if (
      binding?.chainId !== undefined &&
      session.chain.chainId !== binding.chainId
    ) {
      addIssue(issues, "CHAIN_MISMATCH", "A wallet binding uses a different chain.");
      break;
    }
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

function sameIdentity(
  left: WalletSession["provider"],
  right: SerializableProviderIdentity,
) {
  return (
    left.registryId === right.registryId &&
    left.source === right.source &&
    left.uuid === right.uuid &&
    left.rdns === right.rdns
  );
}

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function addIssue(
  issues: WalletConsistencyIssue[],
  code: WalletConsistencyIssueCode,
  message: string,
) {
  if (!issues.some((issue) => issue.code === code)) {
    issues.push(Object.freeze({ code, message }));
  }
}
