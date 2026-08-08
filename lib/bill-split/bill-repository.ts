import type { BillSplit } from "@/components/bill-split/types";

const STORAGE_KEY = "trustvault.bill-splits.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function sameAddress(left?: string, right?: string) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

function deriveBillStatus(bill: BillSplit): BillSplit["status"] {
  return bill.participants.every((participant) => participant.status === "paid")
    ? "settled"
    : "active";
}

function normalizeOrganizerSelfShares(input: BillSplit) {
  let changed = false;

  const participants = input.participants.map((participant) => {
    if (
      participant.status !== "paid" &&
      sameAddress(participant.walletAddress, input.organizerAddress)
    ) {
      changed = true;

      return {
        ...participant,
        status: "paid" as const,
        paidAt: participant.paidAt ?? input.createdAt,
        settlementType: "organizer-self-share" as const,
      };
    }

    return participant;
  });

  const normalized: BillSplit = {
    ...input,
    participants,
    status: participants.every((participant) => participant.status === "paid")
      ? "settled"
      : "active",
  };

  return { bill: normalized, changed };
}

function readAllRaw(): Record<string, BillSplit> {
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

function readAll(): Record<string, BillSplit> {
  const records = readAllRaw();

  if (!isBrowser()) return records;

  let changed = false;

  for (const [id, bill] of Object.entries(records)) {
    const normalized = normalizeOrganizerSelfShares(bill);
    records[id] = normalized.bill;
    changed ||= normalized.changed;
  }

  if (changed) {
    writeAll(records);
  }

  return records;
}

export const browserBillSplitRepository = {
  async save(bill: BillSplit) {
    const records = readAll();
    const normalized = normalizeOrganizerSelfShares({
      ...bill,
      status: deriveBillStatus(bill),
    }).bill;

    records[normalized.id] = normalized;
    writeAll(records);
    return normalized;
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

  async markParticipantPaid(input: {
    billId: string;
    participantId: string;
    transactionHash: `0x${string}`;
    explorerUrl: string;
    paidAt?: string;
  }) {
    const records = readAll();
    const bill = records[input.billId];

    if (!bill) {
      throw new Error("Bill Split could not be found.");
    }

    const participantExists = bill.participants.some(
      (participant) => participant.id === input.participantId,
    );

    if (!participantExists) {
      throw new Error("Bill Split participant could not be found.");
    }

    const now = input.paidAt ?? new Date().toISOString();

    const participants = bill.participants.map((participant) =>
      participant.id === input.participantId
        ? {
            ...participant,
            status: "paid" as const,
            transactionHash: input.transactionHash,
            explorerUrl: input.explorerUrl,
            paidAt: now,
            settlementType: "onchain-usdc" as const,
          }
        : participant,
    );

    const updated: BillSplit = {
      ...bill,
      participants,
      updatedAt: now,
      status: participants.every(
        (participant) => participant.status === "paid",
      )
        ? "settled"
        : "active",
    };

    records[input.billId] = updated;
    writeAll(records);

    return updated;
  },

  async remove(id: string) {
    const records = readAll();
    delete records[id];
    writeAll(records);
  },
};
