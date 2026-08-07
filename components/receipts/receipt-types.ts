export type ReceiptTransactionType =
  | "gift"
  | "bill-split"
  | "purchase"
  | "escrow"
  | "refund"
  | "bridge"
  | "swap";

export type ReceiptTransactionStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "refunded";

export type ReceiptEnvironment =
  | "testnet"
  | "mainnet";

export type ReceiptPrivacyOptions = {
  showRecipientName: boolean;
  showSenderAddress: boolean;
  showRecipientAddress: boolean;
  showPersonalMessage: boolean;
  showTransactionHash: boolean;
};

export type ReceiptParty = {
  displayName?: string;
  email?: string;
  walletAddress?: string;
  address?: string;
};

export type ReceiptSeller = {
  displayName?: string;
  storeName?: string;
  settlementWallet?: string;
  settlementWalletChecked?: boolean;
};

export type ReceiptRewards = {
  pointsAwarded: number;
  balanceAfterAward?: number;
  programName?: string;
};

export type ReceiptTimelineStep = {
  id: string;
  label: string;
  status: "complete" | "pending";
  occurredAt?: string;
};

export type TransactionReceiptData = {
  id: string;
  displayId?: string;

  type: ReceiptTransactionType;
  status: ReceiptTransactionStatus;

  title: string;
  description?: string;

  amount: string;
  asset: string;

  senderAddress?: string;
  recipientName?: string;
  recipientAddress?: string;

  network: string;
  environment: ReceiptEnvironment;

  transactionHash?: string;
  explorerUrl?: string;

  createdAt: string;
  confirmedAt?: string;

  unlockDate?: string;
  personalMessage?: string;

  orderId?: string;
  billSplitId?: string;
  giftVaultId?: string;

  customer?: ReceiptParty;
  seller?: ReceiptSeller;
  rewards?: ReceiptRewards;
  timeline?: ReceiptTimelineStep[];

  privacy: ReceiptPrivacyOptions;

  metadata?: Record<string, string | number | boolean | null>;
};

export const defaultReceiptPrivacy: ReceiptPrivacyOptions = {
  showRecipientName: true,
  showSenderAddress: false,
  showRecipientAddress: false,
  showPersonalMessage: false,
  showTransactionHash: true,
};

export function shortenReceiptValue(
  value: string,
  startLength = 8,
  endLength = 6,
) {
  if (value.length <= startLength + endLength + 1) {
    return value;
  }

  return `${value.slice(0, startLength)}â€¦${value.slice(-endLength)}`;
}

export function createReceiptId(
  type: ReceiptTransactionType,
  transactionHash?: string,
) {
  const source =
    transactionHash?.slice(2, 14) ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `${type}-${source}`;
}

export function createEnterpriseReceiptNumber(
  createdAt: string,
  transactionHash?: string,
) {
  const parsedDate = new Date(createdAt);
  const date =
    Number.isNaN(parsedDate.getTime())
      ? new Date()
      : parsedDate;

  const datePart = date
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  let numericPart: string;

  if (transactionHash && /^0x[a-fA-F0-9]+$/.test(transactionHash)) {
    try {
      const hashSlice = transactionHash.slice(2, 14) || "0";
      numericPart = (BigInt(`0x${hashSlice}`) % BigInt(1_000_000))
        .toString()
        .padStart(6, "0");
    } catch {
      numericPart = String(date.getTime() % 1_000_000).padStart(6, "0");
    }
  } else {
    numericPart = String(date.getTime() % 1_000_000).padStart(6, "0");
  }

  return `TV-${datePart}-${numericPart}`;
}
