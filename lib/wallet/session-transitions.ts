import { deriveWalletSessionState } from "./session-status.js";
import type {
  WalletCapabilities,
  WalletConnectionIdentity,
  WalletQualificationState,
  WalletSession,
  WalletSessionBindings,
} from "./session-types.js";
import type { SerializableProviderIdentity } from "./provider-types.js";
import { createUnknownCapabilities } from "./session-status.js";

export function createDetectedWalletSession(input: {
  sessionId: string;
  provider: SerializableProviderIdentity;
  expectedArcChainId: number;
  timestamp?: string;
}): WalletSession {
  if (!input.sessionId.trim()) throw new Error("A session ID is required.");
  if (!Number.isSafeInteger(input.expectedArcChainId) || input.expectedArcChainId <= 0) {
    throw new Error("A valid Arc chain ID is required.");
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  return finalize({
    sessionId: input.sessionId,
    provider: copyIdentity(input.provider),
    providerSelection: "detected",
    connection: "disconnected",
    chain: Object.freeze({
      expectedArcChainId: input.expectedArcChainId,
      known: false,
      arcReady: false,
    }),
    capabilities: createUnknownCapabilities(),
    qualification: untestedQualification(input.provider.registryId),
    identityVerification: Object.freeze({ status: "UNVERIFIED", reason: "NOT_CONNECTED" }),
    bindings: Object.freeze({}),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function selectWalletProvider(
  session: WalletSession,
  provider: SerializableProviderIdentity,
  timestamp?: string,
): WalletSession {
  const providerChanged = session.provider.registryId !== provider.registryId;
  return finalize({
    ...session,
    provider: copyIdentity(provider),
    providerSelection: "selected",
    ...(providerChanged
      ? {
          address: undefined,
          connection: "disconnected" as const,
          chain: resetChain(session.chain.expectedArcChainId),
          capabilities: createUnknownCapabilities(),
          qualification: untestedQualification(provider.registryId),
          identityVerification: Object.freeze({ status: "UNVERIFIED" as const, reason: "NOT_CONNECTED" as const }),
          bindings: Object.freeze({}),
        }
      : {}),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function connectWalletSession(
  session: WalletSession,
  input: {
    address: `0x${string}`;
    chainId: number;
    bindings?: WalletSessionBindings;
    timestamp?: string;
  },
): WalletSession {
  requireSelected(session);
  if (!/^0x[0-9a-f]{40}$/i.test(input.address)) {
    throw new Error("A valid connected wallet address is required.");
  }
  if (!Number.isSafeInteger(input.chainId) || input.chainId <= 0) {
    throw new Error("A valid connected chain ID is required.");
  }

  return finalize({
    ...session,
    address: input.address,
    connection: "connected",
    chain: chainState(input.chainId, session.chain.expectedArcChainId),
    bindings: freezeBindings(input.bindings ?? {}),
    identityVerification: Object.freeze({
      status: "UNVERIFIED",
      reason: "REFERENCE_RECONCILIATION_REQUIRED",
    }),
    updatedAt: input.timestamp ?? new Date().toISOString(),
  });
}

export function verifyWalletProviderIdentity(
  session: WalletSession,
  providerIdentityKey: string,
  timestamp?: string,
): WalletSession {
  if (session.connection !== "connected" || session.providerSelection !== "selected") {
    throw new Error("Identity verification requires a connected, explicitly selected provider.");
  }
  if (providerIdentityKey !== session.provider.registryId) {
    throw new Error("Identity verification evidence belongs to a different provider.");
  }
  const verifiedAt = timestamp ?? new Date().toISOString();
  return finalize({
    ...session,
    identityVerification: Object.freeze({
      status: "VERIFIED",
      providerIdentityKey,
      evidence: "EXPLICIT_SELECTION_AND_PROVIDER_REFERENCE",
      verifiedAt,
    }),
    updatedAt: verifiedAt,
  });
}

export function changeWalletChain(
  session: WalletSession,
  chainId: number,
  timestamp?: string,
): WalletSession {
  if (session.connection !== "connected") {
    throw new Error("A disconnected wallet cannot change session chain state.");
  }
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error("A valid chain ID is required.");
  }
  return finalize({
    ...session,
    chain: chainState(chainId, session.chain.expectedArcChainId),
    bindings: Object.freeze({}),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function establishArcReadiness(
  session: WalletSession,
  timestamp?: string,
): WalletSession {
  if (
    session.connection !== "connected" ||
    session.identityVerification.status !== "VERIFIED" ||
    session.chain.chainId !== session.chain.expectedArcChainId
  ) {
    throw new Error("Arc readiness requires a connected wallet on the expected chain.");
  }
  return finalize({
    ...session,
    chain: Object.freeze({ ...session.chain, known: true, arcReady: true }),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function evaluateWalletCapabilities(
  session: WalletSession,
  capabilities: Partial<WalletCapabilities>,
  timestamp?: string,
): WalletSession {
  requireSelected(session);
  return finalize({
    ...session,
    capabilities: Object.freeze({ ...session.capabilities, ...capabilities }),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function evaluateWalletQualification(
  session: WalletSession,
  qualification: WalletQualificationState,
  timestamp?: string,
): WalletSession {
  if (qualification.providerIdentityKey !== session.provider.registryId) {
    throw new Error("Qualification evidence belongs to a different provider identity.");
  }
  return finalize({
    ...session,
    qualification: freezeQualification(qualification),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function disconnectWalletSession(
  session: WalletSession,
  timestamp?: string,
): WalletSession {
  return finalize({
    ...session,
    address: undefined,
    connection: "disconnected",
    chain: resetChain(session.chain.expectedArcChainId),
    capabilities: createUnknownCapabilities(),
    identityVerification: Object.freeze({ status: "UNVERIFIED", reason: "NOT_CONNECTED" }),
    bindings: Object.freeze({}),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function removeWalletProvider(
  session: WalletSession,
  providerRegistryId: string,
  timestamp?: string,
): WalletSession {
  if (providerRegistryId !== session.provider.registryId) return session;
  return finalize({
    ...session,
    providerSelection: "unavailable",
    address: undefined,
    connection: "disconnected",
    chain: resetChain(session.chain.expectedArcChainId),
    capabilities: createUnknownCapabilities(),
    identityVerification: Object.freeze({ status: "INVALID", reason: "PROVIDER_REMOVED" }),
    bindings: Object.freeze({}),
    updatedAt: timestamp ?? new Date().toISOString(),
  });
}

export function restoreUnverifiedWalletConnection(
  session: WalletSession,
  input: {
    address: `0x${string}`;
    chainId: number;
    reason?: "AUTOMATIC_RECONNECT" | "NO_REGISTRY_MATCH" | "AMBIGUOUS_REGISTRY_MATCH" | "SELECTION_NOT_REESTABLISHED";
    timestamp?: string;
  },
): WalletSession {
  if (!/^0x[0-9a-f]{40}$/i.test(input.address)) throw new Error("A valid connected wallet address is required.");
  return finalize({
    ...session,
    address: input.address,
    connection: "connected",
    chain: chainState(input.chainId, session.chain.expectedArcChainId),
    identityVerification: Object.freeze({ status: "UNVERIFIED", reason: input.reason ?? "AUTOMATIC_RECONNECT" }),
    bindings: Object.freeze({}),
    updatedAt: input.timestamp ?? new Date().toISOString(),
  });
}

function finalize(session: Omit<WalletSession, "state">): WalletSession {
  return Object.freeze({ ...session, state: deriveWalletSessionState(session) });
}

function requireSelected(session: WalletSession) {
  if (session.providerSelection !== "selected") {
    throw new Error("Select a wallet provider before connecting or evaluating it.");
  }
}

function copyIdentity(
  identity: SerializableProviderIdentity,
): WalletConnectionIdentity {
  return Object.freeze({ ...identity });
}

function resetChain(expectedArcChainId: number) {
  return Object.freeze({ expectedArcChainId, known: false, arcReady: false });
}

function chainState(chainId: number, expectedArcChainId: number) {
  return Object.freeze({
    chainId,
    expectedArcChainId,
    known: true,
    arcReady: false,
  });
}

function untestedQualification(providerIdentityKey: string): WalletQualificationState {
  return Object.freeze({
    status: "UNTESTED",
    providerIdentityKey,
    reasons: Object.freeze([]),
  });
}

function freezeQualification(
  qualification: WalletQualificationState,
): WalletQualificationState {
  return Object.freeze({
    ...qualification,
    reasons: Object.freeze([...qualification.reasons]),
  });
}

function freezeBindings(bindings: WalletSessionBindings): WalletSessionBindings {
  return Object.freeze({
    ...(bindings.wagmi ? { wagmi: Object.freeze({ ...bindings.wagmi }) } : {}),
    ...(bindings.viem ? { viem: Object.freeze({ ...bindings.viem }) } : {}),
    ...(bindings.circle ? { circle: Object.freeze({ ...bindings.circle }) } : {}),
  });
}
