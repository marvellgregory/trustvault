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
  const wallet =
    Object.freeze({
      state:
        input.wallet.state,

      ...(input.wallet.account
        ? {
            account:
              input.wallet.account,
          }
        : {}),

      ...(input.wallet.providerIdentityKey
        ? {
            providerIdentityKey:
              input.wallet.providerIdentityKey,
          }
        : {}),
    });

  const network =
    Object.freeze({
      state:
        input.network.state,

      ...(input.network.chainId !== undefined
        ? {
            chainId:
              input.network.chainId,
          }
        : {}),

      expectedChainId:
        input.network.expectedChainId,
    });

  const circle =
    Object.freeze({
      state:
        input.circle.state,

      exactProviderVerified:
        input.circle.exactProviderVerified,

      ...(input.circle.providerIdentityKey
        ? {
            providerIdentityKey:
              input.circle.providerIdentityKey,
          }
        : {}),

      ...(input.circle.bindingGeneration
        ? {
            bindingGeneration:
              input.circle.bindingGeneration,
          }
        : {}),
    });

  const transaction =
    Object.freeze({
      state:
        input.transaction.state,

      ...(input.transaction.qualificationGeneration
        ? {
            qualificationGeneration:
              input.transaction.qualificationGeneration,
          }
        : {}),

      reasons:
        Object.freeze([
          ...(input.transaction.reasons ?? []),
        ]),
    });

  return Object.freeze({
    version:
      ATLAS_INFRASTRUCTURE_SNAPSHOT_VERSION,

    wallet,
    network,
    circle,
    transaction,

    observedAt:
      input.observedAt,

    authority:
      "READ_ONLY_INFRASTRUCTURE_EVIDENCE",
  });
}