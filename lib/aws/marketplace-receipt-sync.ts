import type {
  TransactionReceiptData,
} from "@/components/receipts/receipt-types";

import {
  fetchMarketplaceReceipt,
  fetchMarketplaceReceipts,
  persistMarketplaceReceipt,
  type MarketplaceReceiptPersistenceResult,
} from "@/lib/aws/marketplace-receipt-client";

export type MarketplaceReceiptSyncState =
  | "local-only"
  | "syncing"
  | "persisted"
  | "failed";

export type MarketplaceReceiptSyncResult = {
  receiptId: string;
  state: MarketplaceReceiptSyncState;
  receipt?: TransactionReceiptData;
  error?: {
    status: number | null;
    code: string;
    message: string;
  };
};

type ReceiptSyncQueue = {
  inFlight:
    | Promise<MarketplaceReceiptSyncResult>
    | null;

  latestPending:
    | TransactionReceiptData
    | null;
};

const queues =
  new Map<string, ReceiptSyncQueue>();

function failureResult(
  receiptId: string,
  result: Extract<
    MarketplaceReceiptPersistenceResult,
    { ok: false }
  >,
): MarketplaceReceiptSyncResult {
  return {
    receiptId,
    state: "failed",
    error: {
      status: result.status,
      code: result.code,
      message: result.message,
    },
  };
}

async function persistReceipt(
  receipt: TransactionReceiptData,
): Promise<MarketplaceReceiptSyncResult> {
  const result =
    await persistMarketplaceReceipt(
      receipt,
    );

  if (!result.ok) {
    return failureResult(
      receipt.id,
      result,
    );
  }

  return {
    receiptId: receipt.id,
    state: "persisted",
    receipt: result.receipt,
  };
}

function queueFor(
  receiptId: string,
): ReceiptSyncQueue {
  const existing =
    queues.get(receiptId);

  if (existing) {
    return existing;
  }

  const created: ReceiptSyncQueue = {
    inFlight: null,
    latestPending: null,
  };

  queues.set(
    receiptId,
    created,
  );

  return created;
}

async function drainQueue(
  receiptId: string,
  firstReceipt: TransactionReceiptData,
): Promise<MarketplaceReceiptSyncResult> {
  const queue =
    queueFor(receiptId);

  let current =
    firstReceipt;

  let latestResult =
    await persistReceipt(current);

  while (queue.latestPending) {
    const pending =
      queue.latestPending;

    queue.latestPending =
      null;

    /*
     * Persist only the newest queued receipt snapshot
     * after the active request completes.
     *
     * This mirrors Marketplace order synchronization and
     * prevents an older snapshot from overwriting a newer
     * receipt state.
     */
    current =
      pending;

    latestResult =
      await persistReceipt(current);
  }

  return latestResult;
}

export function syncMarketplaceReceipt(
  receipt: TransactionReceiptData,
): Promise<MarketplaceReceiptSyncResult> {
  const queue =
    queueFor(receipt.id);

  if (queue.inFlight) {
    /*
     * Coalesce rapid updates.
     *
     * The newest receipt snapshot replaces any previous
     * pending snapshot.
     */
    queue.latestPending =
      receipt;

    return queue.inFlight;
  }

  const task =
    drainQueue(
      receipt.id,
      receipt,
    )
      .finally(() => {
        const current =
          queues.get(receipt.id);

        if (current) {
          current.inFlight =
            null;

          if (!current.latestPending) {
            queues.delete(
              receipt.id,
            );
          }
        }
      });

  queue.inFlight =
    task;

  return task;
}

export async function loadMarketplaceReceiptFromCloud(
  receiptId: string,
): Promise<MarketplaceReceiptSyncResult> {
  const result =
    await fetchMarketplaceReceipt(
      receiptId,
    );

  if (!result.ok) {
    return failureResult(
      receiptId,
      result,
    );
  }

  return {
    receiptId,
    state: "persisted",
    receipt: result.receipt,
  };
}

export async function loadMarketplaceReceiptsFromCloud(): Promise<
  | {
      state: "persisted";
      receipts: TransactionReceiptData[];
    }
  | {
      state: "failed";
      error: {
        status: number | null;
        code: string;
        message: string;
      };
    }
> {
  const result =
    await fetchMarketplaceReceipts();

  if (!result.ok) {
    return {
      state: "failed",
      error: {
        status: result.status,
        code: result.code,
        message: result.message,
      },
    };
  }

  return {
    state: "persisted",
    receipts: result.receipts,
  };
}

export function isMarketplaceReceiptSyncInFlight(
  receiptId: string,
): boolean {
  return Boolean(
    queues.get(receiptId)?.inFlight,
  );
}
