import type {
  AtlasPreparedTransaction,
  AtlasTransactionReview,
} from "./atlas-transaction-preparation";

import {
  getAtlasTransactionReviewBinding,
} from "./atlas-transaction-preparation";

export const ATLAS_EXECUTION_HANDOFF_VERSION = 1 as const;

export type AtlasExecutionHandoff = {
  version: typeof ATLAS_EXECUTION_HANDOFF_VERSION;
  transactionId: string;
  kind: AtlasPreparedTransaction["kind"];
  asset: AtlasPreparedTransaction["asset"];
  destination: AtlasPreparedTransaction["destination"];
  source: AtlasPreparedTransaction["source"];
  chainId: number;
  preparedAt: number;
  expiresAt: number;
  confirmedAt: number;
  reviewBinding: string;
};

export type CreateAtlasExecutionHandoffInput = {
  transaction: AtlasPreparedTransaction;
  review: AtlasTransactionReview;
  confirmedAt: number;
};

function requireFiniteTimestamp(
  value: number,
  field: string,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${field} must be a finite non-negative timestamp.`,
    );
  }

  return value;
}

export function createAtlasExecutionHandoff(
  input: CreateAtlasExecutionHandoffInput,
): AtlasExecutionHandoff {
  const confirmedAt = requireFiniteTimestamp(
    input.confirmedAt,
    "confirmedAt",
  );

  if (input.transaction.status !== "confirmed") {
    throw new Error(
      "Only confirmed transactions can create an execution handoff.",
    );
  }

  if (
    input.review.transactionId !==
    input.transaction.id
  ) {
    throw new Error(
      "Execution handoff review does not match transaction.",
    );
  }

  if (
    input.review.binding !==
    getAtlasTransactionReviewBinding(input.transaction)
  ) {
    throw new Error(
      "Confirmed transaction changed after review.",
    );
  }

  if (
    confirmedAt < input.review.reviewedAt
  ) {
    throw new Error(
      "Execution handoff confirmation cannot precede review.",
    );
  }

  if (
    confirmedAt >= input.transaction.expiresAt
  ) {
    throw new Error(
      "Confirmed transaction has expired before execution handoff.",
    );
  }

  return {
    version: ATLAS_EXECUTION_HANDOFF_VERSION,
    transactionId: input.transaction.id,
    kind: input.transaction.kind,
    asset: {
      ...input.transaction.asset,
    },
    destination: {
      ...input.transaction.destination,
    },
    source: {
      ...input.transaction.source,
    },
    chainId: input.transaction.chainId,
    preparedAt: input.transaction.preparedAt,
    expiresAt: input.transaction.expiresAt,
    confirmedAt,
    reviewBinding: input.review.binding,
  };
}