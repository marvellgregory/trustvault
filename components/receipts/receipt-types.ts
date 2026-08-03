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

export type TransactionReceiptData = {
  id: string;
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

  return `${value.slice(0, startLength)}…${value.slice(-endLength)}`;
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
