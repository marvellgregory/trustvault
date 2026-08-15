import type {
  CapabilitySupport,
  WalletCapabilities,
  WalletSession,
  WalletSessionState,
} from "./session-types.js";

const CAPABILITY_NAMES = [
  "canRequestAccounts",
  "canSwitchChain",
  "canAddChain",
  "canSendTransaction",
  "canWriteContract",
  "circleAdapterAvailable",
  "supportsArcTestnet",
  "qualifiedForTrustVault",
] as const satisfies readonly (keyof WalletCapabilities)[];

const COMPATIBILITY_REQUIREMENTS = [
  "canRequestAccounts",
  "canSendTransaction",
  "canWriteContract",
  "circleAdapterAvailable",
  "supportsArcTestnet",
] as const satisfies readonly (keyof WalletCapabilities)[];

export function createUnknownCapabilities(): WalletCapabilities {
  return Object.freeze(
    Object.fromEntries(
      CAPABILITY_NAMES.map((name) => [name, "unknown"]),
    ) as Record<keyof WalletCapabilities, CapabilitySupport>,
  );
}

export function isTechnicallyCompatible(
  capabilities: WalletCapabilities,
): boolean {
  return COMPATIBILITY_REQUIREMENTS.every(
    (name) => capabilities[name] === "supported",
  );
}

export function deriveWalletSessionState(
  session: Omit<WalletSession, "state">,
): WalletSessionState {
  if (session.providerSelection === "unavailable") return "INVALIDATED";

  if (session.identityVerification.status === "INVALID") return "INVALIDATED";

  if (
    session.connection === "connected" &&
    session.identityVerification.status !== "VERIFIED"
  ) {
    return "IDENTITY_UNVERIFIED";
  }

  if (
    session.providerSelection !== "selected" ||
    session.connection !== "connected" ||
    !session.address
  ) {
    return "DETECTED";
  }

  if (!session.chain.known || !session.chain.arcReady) return "CONNECTED";
  if (!isTechnicallyCompatible(session.capabilities)) return "ARC_READY";

  if (
    session.qualification.status === "QUALIFIED" &&
    session.qualification.providerIdentityKey === session.provider.registryId &&
    session.capabilities.qualifiedForTrustVault === "supported"
  ) {
    return "TRUSTVAULT_QUALIFIED";
  }

  return "COMPATIBLE";
}
