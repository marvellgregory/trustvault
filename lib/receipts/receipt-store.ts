import type {
  TransactionReceiptData,
} from "@/components/receipts/receipt-types";

import {
  loadMarketplaceReceiptFromCloud,
  loadMarketplaceReceiptsFromCloud,
  syncMarketplaceReceipt,
} from "@/lib/aws/marketplace-receipt-sync";

export type StoredReceipt = {
  receipt: TransactionReceiptData;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptStore = {
  save(
    receipt: TransactionReceiptData,
  ): Promise<StoredReceipt>;

  findById(
    receiptId: string,
  ): Promise<StoredReceipt | null>;

  findAll(): Promise<StoredReceipt[]>;

  remove(
    receiptId: string,
  ): Promise<void>;

  clear(): Promise<void>;
};

const STORAGE_KEY =
  "trustvault.receipts.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function readBrowserReceipts(): Record<
  string,
  StoredReceipt
> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!storedValue) {
      return {};
    }

    const parsedValue =
      JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return parsedValue as Record<
      string,
      StoredReceipt
    >;
  } catch {
    return {};
  }
}

function writeBrowserReceipts(
  receipts: Record<
    string,
    StoredReceipt
  >,
) {
  if (!isBrowser()) {
    throw new Error(
      "Browser receipt storage is unavailable during server rendering.",
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(receipts),
  );
}

function isMarketplaceReceipt(
  receipt: TransactionReceiptData,
) {
  return receipt.type === "purchase";
}

function storeRecoveredReceipt(
  receipt: TransactionReceiptData,
  existing?: StoredReceipt,
): StoredReceipt {
  const receipts =
    readBrowserReceipts();

  const now =
    new Date().toISOString();

  const storedReceipt: StoredReceipt = {
    receipt,
    createdAt:
      existing?.createdAt ??
      receipt.createdAt ??
      now,
    updatedAt: now,
  };

  receipts[receipt.id] =
    storedReceipt;

  writeBrowserReceipts(
    receipts,
  );

  return storedReceipt;
}

function syncMarketplaceReceiptSnapshot(
  receipt: TransactionReceiptData,
) {
  if (
    !isBrowser() ||
    !isMarketplaceReceipt(receipt)
  ) {
    return;
  }

  /*
   * Browser persistence remains the immediate source
   * for the active UX.
   *
   * Durable AWS persistence happens asynchronously and
   * must never block receipt creation or navigation.
   */
  void syncMarketplaceReceipt(
    receipt,
  ).catch(() => {
    /*
     * AWS synchronization is deliberately non-blocking.
     *
     * The local receipt remains available even when the
     * durable persistence request cannot complete.
     */
  });
}

function sortStoredReceipts(
  receipts: StoredReceipt[],
) {
  return receipts.sort(
    (first, second) => {
      const firstTime =
        new Date(
          first.updatedAt,
        ).getTime();

      const secondTime =
        new Date(
          second.updatedAt,
        ).getTime();

      return (
        secondTime -
        firstTime
      );
    },
  );
}

export const browserReceiptStore: ReceiptStore =
  {
    async save(receipt) {
      const receipts =
        readBrowserReceipts();

      const now =
        new Date().toISOString();

      const existingReceipt =
        receipts[receipt.id];

      const storedReceipt: StoredReceipt =
        {
          receipt,
          createdAt:
            existingReceipt?.createdAt ??
            now,
          updatedAt: now,
        };

      receipts[receipt.id] =
        storedReceipt;

      writeBrowserReceipts(
        receipts,
      );

      /*
       * Local-first save:
       *
       * preserve the existing synchronous browser UX,
       * then persist Marketplace purchase receipts to
       * the authenticated AWS backend separately.
       */
      syncMarketplaceReceiptSnapshot(
        receipt,
      );

      return storedReceipt;
    },

    async findById(receiptId) {
      const receipts =
        readBrowserReceipts();

      const localReceipt =
        receipts[receiptId];

      if (localReceipt) {
        return localReceipt;
      }

      /*
       * Local cache miss.
       *
       * Marketplace receipt recovery is authenticated
       * by the server session. Browser identity is not
       * used to determine ownership.
       */
      const cloudResult =
        await loadMarketplaceReceiptFromCloud(
          receiptId,
        );

      if (
        cloudResult.state !==
          "persisted" ||
        !cloudResult.receipt
      ) {
        return null;
      }

      return storeRecoveredReceipt(
        cloudResult.receipt,
      );
    },

    async findAll() {
      /*
       * Start with everything already stored locally.
       *
       * This preserves Gift Vault, Bill Split and other
       * receipt types that are not part of Marketplace
       * AWS persistence.
       */
      const localReceipts =
        readBrowserReceipts();

      const cloudResult =
        await loadMarketplaceReceiptsFromCloud();

      if (
        cloudResult.state ===
        "persisted"
      ) {
        for (
          const receipt
          of cloudResult.receipts
        ) {
          const existing =
            localReceipts[
              receipt.id
            ];

          localReceipts[
            receipt.id
          ] = {
            receipt,
            createdAt:
              existing?.createdAt ??
              receipt.createdAt ??
              new Date().toISOString(),
            updatedAt:
              existing?.updatedAt ??
              receipt.confirmedAt ??
              receipt.createdAt ??
              new Date().toISOString(),
          };
        }

        writeBrowserReceipts(
          localReceipts,
        );
      }

      return sortStoredReceipts(
        Object.values(
          localReceipts,
        ),
      );
    },

    async remove(receiptId) {
      const receipts =
        readBrowserReceipts();

      delete receipts[
        receiptId
      ];

      /*
       * Removal remains local-only.
       *
       * There is intentionally no durable DELETE route
       * in the Marketplace receipt API at this stage.
       */
      writeBrowserReceipts(
        receipts,
      );
    },

    async clear() {
      if (!isBrowser()) {
        throw new Error(
          "Browser receipt storage is unavailable during server rendering.",
        );
      }

      /*
       * Clearing the browser cache must not delete the
       * authenticated customer's durable AWS receipts.
       *
       * A later findById/findAll can therefore recover
       * Marketplace receipts from cloud persistence.
       */
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    },
  };

export function createReceiptPath(
  receiptId: string,
) {
  return `/receipt/${encodeURIComponent(
    receiptId,
  )}`;
}

export function createAbsoluteReceiptUrl(
  receiptId: string,
) {
  const path =
    createReceiptPath(
      receiptId,
    );

  if (!isBrowser()) {
    return path;
  }

  return new URL(
    path,
    window.location.origin,
  ).toString();
}
