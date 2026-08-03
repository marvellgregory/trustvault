import type { TransactionReceiptData } from "@/components/receipts/receipt-types";

export type StoredReceipt = {
  receipt: TransactionReceiptData;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptStore = {
  save(receipt: TransactionReceiptData): Promise<StoredReceipt>;
  findById(receiptId: string): Promise<StoredReceipt | null>;
  findAll(): Promise<StoredReceipt[]>;
  remove(receiptId: string): Promise<void>;
  clear(): Promise<void>;
};

const STORAGE_KEY = "trustvault.receipts.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function readBrowserReceipts(): Record<string, StoredReceipt> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return parsedValue as Record<string, StoredReceipt>;
  } catch {
    return {};
  }
}

function writeBrowserReceipts(
  receipts: Record<string, StoredReceipt>,
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

export const browserReceiptStore: ReceiptStore = {
  async save(receipt) {
    const receipts = readBrowserReceipts();
    const now = new Date().toISOString();
    const existingReceipt = receipts[receipt.id];

    const storedReceipt: StoredReceipt = {
      receipt,
      createdAt: existingReceipt?.createdAt ?? now,
      updatedAt: now,
    };

    receipts[receipt.id] = storedReceipt;
    writeBrowserReceipts(receipts);

    return storedReceipt;
  },

  async findById(receiptId) {
    const receipts = readBrowserReceipts();

    return receipts[receiptId] ?? null;
  },

  async findAll() {
    const receipts = Object.values(readBrowserReceipts());

    return receipts.sort((first, second) => {
      const firstTime = new Date(first.updatedAt).getTime();
      const secondTime = new Date(second.updatedAt).getTime();

      return secondTime - firstTime;
    });
  },

  async remove(receiptId) {
    const receipts = readBrowserReceipts();

    delete receipts[receiptId];
    writeBrowserReceipts(receipts);
  },

  async clear() {
    if (!isBrowser()) {
      throw new Error(
        "Browser receipt storage is unavailable during server rendering.",
      );
    }

    window.localStorage.removeItem(STORAGE_KEY);
  },
};

export function createReceiptPath(receiptId: string) {
  return `/receipt/${encodeURIComponent(receiptId)}`;
}

export function createAbsoluteReceiptUrl(receiptId: string) {
  const path = createReceiptPath(receiptId);

  if (!isBrowser()) {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}
