export const ATLAS_PREPARED_TRANSACTION_VERSION = 1 as const;

export type AtlasTransactionKind =
  | "marketplace-payment"
  | "gift"
  | "bill-split-payment";

export type AtlasPreparedTransactionStatus =
  | "prepared"
  | "reviewed"
  | "confirmed"
  | "cancelled"
  | "expired";

export type AtlasTransactionAsset = {
  symbol: "USDC";
  amount: string;
};

export type AtlasTransactionDestination = {
  address: string;
  label?: string;
};

export type AtlasTransactionSourceReference = {
  type:
    | "marketplace-order"
    | "gift"
    | "bill-split";
  id: string;
};

export type AtlasPreparedTransaction = {
  version: typeof ATLAS_PREPARED_TRANSACTION_VERSION;
  id: string;
  kind: AtlasTransactionKind;
  status: AtlasPreparedTransactionStatus;
  asset: AtlasTransactionAsset;
  destination: AtlasTransactionDestination;
  source: AtlasTransactionSourceReference;
  chainId: number;
  preparedAt: number;
  expiresAt: number;
};

export type AtlasTransactionReview = {
  transactionId: string;
  binding: string;
  reviewedAt: number;
};

export type AtlasTransactionConfirmation = {
  transactionId: string;
  confirmedAt: number;
  confirmationToken: string;
};

export type PrepareAtlasTransactionInput = {
  id: string;
  kind: AtlasTransactionKind;
  amount: string;
  destinationAddress: string;
  destinationLabel?: string;
  source: AtlasTransactionSourceReference;
  chainId: number;
  preparedAt: number;
  expiresAt: number;
};

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function requireFiniteTimestamp(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative timestamp.`);
  }

  return value;
}

function requireChainId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("chainId must be a positive safe integer.");
  }

  return value;
}

export function getAtlasTransactionReviewBinding(
  transaction: AtlasPreparedTransaction,
): string {
  return JSON.stringify({
    version: transaction.version,
    id: transaction.id,
    kind: transaction.kind,
    asset: {
      symbol: transaction.asset.symbol,
      amount: transaction.asset.amount,
    },
    destination: {
      address: transaction.destination.address,
      label: transaction.destination.label ?? null,
    },
    source: {
      type: transaction.source.type,
      id: transaction.source.id,
    },
    chainId: transaction.chainId,
    preparedAt: transaction.preparedAt,
    expiresAt: transaction.expiresAt,
  });
}

export function prepareAtlasTransaction(
  input: PrepareAtlasTransactionInput,
): AtlasPreparedTransaction {
  const preparedAt = requireFiniteTimestamp(
    input.preparedAt,
    "preparedAt",
  );

  const expiresAt = requireFiniteTimestamp(
    input.expiresAt,
    "expiresAt",
  );

  if (expiresAt <= preparedAt) {
    throw new Error("expiresAt must be later than preparedAt.");
  }

  return {
    version: ATLAS_PREPARED_TRANSACTION_VERSION,
    id: requireNonEmpty(input.id, "id"),
    kind: input.kind,
    status: "prepared",
    asset: {
      symbol: "USDC",
      amount: requireNonEmpty(input.amount, "amount"),
    },
    destination: {
      address: requireNonEmpty(
        input.destinationAddress,
        "destinationAddress",
      ),
      ...(input.destinationLabel?.trim()
        ? { label: input.destinationLabel.trim() }
        : {}),
    },
    source: {
      type: input.source.type,
      id: requireNonEmpty(input.source.id, "source.id"),
    },
    chainId: requireChainId(input.chainId),
    preparedAt,
    expiresAt,
  };
}

export function isAtlasPreparedTransactionExpired(
  transaction: AtlasPreparedTransaction,
  now: number,
): boolean {
  requireFiniteTimestamp(now, "now");

  return now >= transaction.expiresAt;
}

export function reviewAtlasTransaction(
  transaction: AtlasPreparedTransaction,
  reviewedAt: number,
): {
  transaction: AtlasPreparedTransaction;
  review: AtlasTransactionReview;
} {
  requireFiniteTimestamp(reviewedAt, "reviewedAt");

  if (transaction.status !== "prepared") {
    throw new Error("Only prepared transactions can be reviewed.");
  }

  if (reviewedAt < transaction.preparedAt) {
    throw new Error("Review cannot occur before preparation.");
  }

  if (isAtlasPreparedTransactionExpired(transaction, reviewedAt)) {
    throw new Error("Prepared transaction has expired.");
  }

  const reviewedTransaction: AtlasPreparedTransaction = {
    ...transaction,
    status: "reviewed",
  };

  return {
    transaction: reviewedTransaction,
    review: {
      transactionId: transaction.id,
      binding: getAtlasTransactionReviewBinding(reviewedTransaction),
      reviewedAt,
    },
  };
}

export function confirmAtlasTransaction(
  transaction: AtlasPreparedTransaction,
  review: AtlasTransactionReview,
  confirmation: AtlasTransactionConfirmation,
): AtlasPreparedTransaction {
  requireFiniteTimestamp(
    confirmation.confirmedAt,
    "confirmedAt",
  );

  if (transaction.status !== "reviewed") {
    throw new Error(
      "Transaction must be reviewed before confirmation.",
    );
  }

  if (
    review.transactionId !== transaction.id ||
    confirmation.transactionId !== transaction.id
  ) {
    throw new Error(
      "Confirmation does not match the reviewed transaction.",
    );
  }

  if (
    review.binding !==
    getAtlasTransactionReviewBinding(transaction)
  ) {
    throw new Error(
      "Reviewed transaction changed after review.",
    );
  }

  if (confirmation.confirmedAt < review.reviewedAt) {
    throw new Error(
      "Confirmation cannot occur before review.",
    );
  }

  if (!confirmation.confirmationToken.trim()) {
    throw new Error("Explicit confirmation is required.");
  }

  if (
    isAtlasPreparedTransactionExpired(
      transaction,
      confirmation.confirmedAt,
    )
  ) {
    throw new Error("Prepared transaction has expired.");
  }

  return {
    ...transaction,
    status: "confirmed",
  };
}

export function cancelAtlasTransaction(
  transaction: AtlasPreparedTransaction,
): AtlasPreparedTransaction {
  if (
    transaction.status === "confirmed" ||
    transaction.status === "cancelled"
  ) {
    throw new Error(
      "Confirmed or cancelled transactions cannot be cancelled.",
    );
  }

  return {
    ...transaction,
    status: "cancelled",
  };
}