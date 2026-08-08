export type PendingBillSplitPayment = {
  billId: string;
  participantId: string;
  txHash: `0x${string}`;
  payerAddress: `0x${string}`;
  organizerAddress: `0x${string}`;
  amountBaseUnits: string;
  submittedAt: string;
};

const STORAGE_KEY = "trustvault.bill-split.pending-payments.v1";

function readAll(): Record<string, PendingBillSplitPayment> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, PendingBillSplitPayment>;
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, PendingBillSplitPayment>) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function paymentKey(billId: string, participantId: string) {
  return `${billId}:${participantId}`;
}

export const billSplitPaymentRecovery = {
  get(billId: string, participantId: string) {
    return readAll()[paymentKey(billId, participantId)] ?? null;
  },

  save(payment: PendingBillSplitPayment) {
    const records = readAll();
    records[paymentKey(payment.billId, payment.participantId)] = payment;
    writeAll(records);
    return payment;
  },

  remove(billId: string, participantId: string) {
    const records = readAll();
    delete records[paymentKey(billId, participantId)];
    writeAll(records);
  },
};
