export const ATLAS_INFRASTRUCTURE_SNAPSHOT_VERSION =
  1 as const;

export const ATLAS_INFRASTRUCTURE_NETWORK_STATES = [
  "UNKNOWN",
  "ARC_READY",
  "WRONG_NETWORK",
] as const;

export type AtlasInfrastructureNetworkState =
  (typeof ATLAS_INFRASTRUCTURE_NETWORK_STATES)[number];

export const ATLAS_INFRASTRUCTURE_WALLET_STATES = [
  "DISCONNECTED",
  "CONNECTED_UNVERIFIED",
  "CONNECTED_VERIFIED",
  "INVALIDATED",
] as const;

export type AtlasInfrastructureWalletState =
  (typeof ATLAS_INFRASTRUCTURE_WALLET_STATES)[number];

export const ATLAS_INFRASTRUCTURE_CIRCLE_STATES = [
  "UNBOUND",
  "READY",
  "INVALIDATED",
] as const;

export type AtlasInfrastructureCircleState =
  (typeof ATLAS_INFRASTRUCTURE_CIRCLE_STATES)[number];

export const ATLAS_INFRASTRUCTURE_TRANSACTION_STATES = [
  "UNKNOWN",
  "QUALIFICATION_PENDING",
  "TRANSACTION_READY",
  "TEST_REQUIRED",
  "INCOMPATIBLE",
  "INVALIDATED",
] as const;

export type AtlasInfrastructureTransactionState =
  (typeof ATLAS_INFRASTRUCTURE_TRANSACTION_STATES)[number];

export type AtlasInfrastructureSnapshotInput =
  Readonly<{
    wallet: Readonly<{
      state: AtlasInfrastructureWalletState;
      account?: `0x${string}`;
      providerIdentityKey?: string;
    }>;
    network: Readonly<{
      state: AtlasInfrastructureNetworkState;
      chainId?: number;
      expectedChainId: number;
    }>;
    circle: Readonly<{
      state: AtlasInfrastructureCircleState;
      exactProviderVerified: boolean;
      providerIdentityKey?: string;
      bindingGeneration?: string;
    }>;
    transaction: Readonly<{
      state: AtlasInfrastructureTransactionState;
      qualificationGeneration?: string;
      reasons?: readonly string[];
    }>;
    observedAt: string;
  }>;

export type AtlasInfrastructureSnapshot =
  Readonly<{
    version:
      typeof ATLAS_INFRASTRUCTURE_SNAPSHOT_VERSION;

    wallet: Readonly<{
      state: AtlasInfrastructureWalletState;
      account?: `0x${string}`;
      providerIdentityKey?: string;
    }>;

    network: Readonly<{
      state: AtlasInfrastructureNetworkState;
      chainId?: number;
      expectedChainId: number;
    }>;

    circle: Readonly<{
      state: AtlasInfrastructureCircleState;
      exactProviderVerified: boolean;
      providerIdentityKey?: string;
      bindingGeneration?: string;
    }>;

    transaction: Readonly<{
      state: AtlasInfrastructureTransactionState;
      qualificationGeneration?: string;
      reasons: readonly string[];
    }>;

    observedAt: string;

    authority:
      "READ_ONLY_INFRASTRUCTURE_EVIDENCE";
  }>;

export function createAtlasInfrastructureSnapshot(
  input: AtlasInfrastructureSnapshotInput,
): AtlasInfrastructureSnapshot {
  return Object.freeze({
    version:
      ATLAS_INFRASTRUCTURE_SNAPSHOT_VERSION,

    wallet:
      Object.freeze({
        ...input.wallet,
      }),

    network:
      Object.freeze({
        ...input.network,
      }),

    circle:
      Object.freeze({
        ...input.circle,
      }),

    transaction:
      Object.freeze({
        ...input.transaction,
        reasons:
          Object.freeze([
            ...(input.transaction.reasons ?? []),
          ]),
      }),

    observedAt:
      input.observedAt,

    authority:
      "READ_ONLY_INFRASTRUCTURE_EVIDENCE",
  });
}