import type {
  CircleBindingEvidence,
} from "@/lib/app-kit/circle-provider-binding";
import type {
  SerializableWalletSessionSnapshot,
} from "@/lib/wallet/session-types";
import type {
  TransactionReadiness,
} from "@/lib/wallet/wallet-qualification";

import {
  createAtlasInfrastructureSnapshot,
  type AtlasInfrastructureCircleState,
  type AtlasInfrastructureNetworkState,
  type AtlasInfrastructureTransactionState,
  type AtlasInfrastructureWalletState,
  type AtlasInfrastructureSnapshot,
} from "../atlas/atlas-infrastructure-contract";

export type AtlasTrustedInfrastructureEvidence =
  Readonly<{
    wallet:
      SerializableWalletSessionSnapshot;
    circle:
      CircleBindingEvidence;
    transaction:
      TransactionReadiness;
    observedAt: string;
  }>;

function mapWalletState(
  wallet: SerializableWalletSessionSnapshot,
): AtlasInfrastructureWalletState {
  if (
    wallet.state === "INVALIDATED" ||
    wallet.identityVerification.status === "INVALID"
  ) {
    return "INVALIDATED";
  }

  if (
    wallet.connection !== "connected" ||
    !wallet.address
  ) {
    return "DISCONNECTED";
  }

  if (
    wallet.identityVerification.status === "VERIFIED"
  ) {
    return "CONNECTED_VERIFIED";
  }

  return "CONNECTED_UNVERIFIED";
}

function mapNetworkState(
  wallet: SerializableWalletSessionSnapshot,
): AtlasInfrastructureNetworkState {
  if (
    !wallet.chain.known ||
    wallet.chain.chainId === undefined
  ) {
    return "UNKNOWN";
  }

  if (
    wallet.chain.arcReady &&
    wallet.chain.chainId ===
      wallet.chain.expectedArcChainId
  ) {
    return "ARC_READY";
  }

  return "WRONG_NETWORK";
}

function mapCircleState(
  circle: CircleBindingEvidence,
): AtlasInfrastructureCircleState {
  switch (circle.status) {
    case "CIRCLE_READY":
      return "READY";

    case "CIRCLE_INVALIDATED":
      return "INVALIDATED";

    case "CIRCLE_UNBOUND":
      return "UNBOUND";
  }
}

function mapTransactionState(
  transaction: TransactionReadiness,
): AtlasInfrastructureTransactionState {
  return transaction.status;
}

function matchingAccount(
  wallet:
    SerializableWalletSessionSnapshot,
  transaction:
    TransactionReadiness,
): `0x${string}` | undefined {
  if (
    !wallet.address ||
    !transaction.account
  ) {
    return undefined;
  }

  if (
    wallet.address.toLowerCase() !==
    transaction.account.toLowerCase()
  ) {
    return undefined;
  }

  return wallet.address;
}

function matchingProviderIdentity(
  wallet:
    SerializableWalletSessionSnapshot,
  circle:
    CircleBindingEvidence,
  transaction:
    TransactionReadiness,
): string | undefined {
  const verifiedIdentity =
    wallet.identityVerification.status ===
    "VERIFIED"
      ? wallet.identityVerification
          .providerIdentityKey
      : undefined;

  if (
    !verifiedIdentity ||
    circle.providerIdentityKey !==
      verifiedIdentity ||
    transaction.providerIdentityKey !==
      verifiedIdentity
  ) {
    return undefined;
  }

  return verifiedIdentity;
}

export function createAtlasInfrastructureSnapshotFromTrustedEvidence(
  evidence: AtlasTrustedInfrastructureEvidence,
): AtlasInfrastructureSnapshot {
  const providerIdentityKey =
    matchingProviderIdentity(
      evidence.wallet,
      evidence.circle,
      evidence.transaction,
    );

  const account =
    matchingAccount(
      evidence.wallet,
      evidence.transaction,
    );

  const walletState =
    mapWalletState(evidence.wallet);

  const networkState =
    mapNetworkState(evidence.wallet);

  const circleState =
    mapCircleState(evidence.circle);

  let transactionState =
    mapTransactionState(
      evidence.transaction,
    );

  const reasons = [
    ...evidence.transaction.reasons,
  ];

  /*
   * TRANSACTION_READY is meaningful only when the
   * independently-derived evidence agrees on the
   * verified provider identity, account, Arc network,
   * and Circle readiness.
   *
   * This still remains evidence only. It never grants
   * Atlas signing or execution authority.
   */
  if (
    transactionState ===
      "TRANSACTION_READY" &&
    (
      walletState !==
        "CONNECTED_VERIFIED" ||
      networkState !==
        "ARC_READY" ||
      circleState !==
        "READY" ||
      !evidence.circle
        .exactProviderVerified ||
      !providerIdentityKey ||
      !account
    )
  ) {
    transactionState =
      "INVALIDATED";

    reasons.push(
      "Trusted infrastructure evidence is inconsistent.",
    );
  }

  return createAtlasInfrastructureSnapshot({
    wallet: {
      state:
        walletState,
      ...(account
        ? { account }
        : {}),
      ...(providerIdentityKey
        ? { providerIdentityKey }
        : {}),
    },

    network: {
      state:
        networkState,
      ...(evidence.wallet.chain
        .chainId !== undefined
        ? {
            chainId:
              evidence.wallet.chain
                .chainId,
          }
        : {}),
      expectedChainId:
        evidence.wallet.chain
          .expectedArcChainId,
    },

    circle: {
      state:
        circleState,
      exactProviderVerified:
        evidence.circle
          .exactProviderVerified,
      ...(providerIdentityKey
        ? { providerIdentityKey }
        : {}),
      ...(evidence.circle
        .bindingGeneration
        ? {
            bindingGeneration:
              evidence.circle
                .bindingGeneration,
          }
        : {}),
    },

    transaction: {
      state:
        transactionState,
      ...(evidence.transaction
        .qualificationGeneration
        ? {
            qualificationGeneration:
              evidence.transaction
                .qualificationGeneration,
          }
        : {}),
      reasons,
    },

    observedAt:
      evidence.observedAt,
  });
}