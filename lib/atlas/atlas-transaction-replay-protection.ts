import type {
  AtlasPreparedTransaction,
  AtlasTransactionConfirmation,
  AtlasTransactionReview,
} from "./atlas-transaction-preparation";

import {
  confirmAtlasTransaction,
} from "./atlas-transaction-preparation";

export const ATLAS_CONFIRMATION_REPLAY_LIMIT = 128;

export type AtlasTransactionReplayState = {
  consumedTransactionIds: readonly string[];
};

export function createAtlasTransactionReplayState(): AtlasTransactionReplayState {
  return {
    consumedTransactionIds: [],
  };
}

function normalizeTransactionId(value: string): string {
  return value.trim().toLowerCase();
}

export function hasAtlasTransactionBeenConsumed(
  state: AtlasTransactionReplayState,
  transactionId: string,
): boolean {
  const normalized = normalizeTransactionId(transactionId);

  if (!normalized) {
    return false;
  }

  return state.consumedTransactionIds.some(
    (existing) =>
      normalizeTransactionId(existing) === normalized,
  );
}

export function confirmAtlasTransactionOnce(
  state: AtlasTransactionReplayState,
  transaction: AtlasPreparedTransaction,
  review: AtlasTransactionReview,
  confirmation: AtlasTransactionConfirmation,
): {
  transaction: AtlasPreparedTransaction;
  replayState: AtlasTransactionReplayState;
} {
  if (
    hasAtlasTransactionBeenConsumed(
      state,
      transaction.id,
    )
  ) {
    throw new Error(
      "Transaction confirmation has already been consumed.",
    );
  }

  const confirmedTransaction = confirmAtlasTransaction(
    transaction,
    review,
    confirmation,
  );

  const consumedTransactionIds = [
    ...state.consumedTransactionIds.filter(
      (existing) =>
        normalizeTransactionId(existing) !==
        normalizeTransactionId(transaction.id),
    ),
    transaction.id,
  ].slice(-ATLAS_CONFIRMATION_REPLAY_LIMIT);

  return {
    transaction: confirmedTransaction,
    replayState: {
      consumedTransactionIds,
    },
  };
}