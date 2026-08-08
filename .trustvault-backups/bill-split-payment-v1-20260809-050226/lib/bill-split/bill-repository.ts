import type { BillSplit } from "@/components/bill-split/types";

const STORAGE_KEY = "trustvault.bill-splits.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Record<string, BillSplit> {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as Record<string, BillSplit>;
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, BillSplit>) {
  if (!isBrowser()) {
    throw new Error(
      "Bill Split storage is unavailable during server rendering.",
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records),
  );
}

export const browserBillSplitRepository = {
  async save(bill: BillSplit) {
    const records = readAll();
    records[bill.id] = bill;
    writeAll(records);
    return bill;
  },

  async findById(id: string) {
    return readAll()[id] ?? null;
  },

  async findAll() {
    return Object.values(readAll()).sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );
  },

  async remove(id: string) {
    const records = readAll();
    delete records[id];
    writeAll(records);
  },
};
