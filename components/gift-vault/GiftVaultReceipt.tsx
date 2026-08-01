import { TransactionReceipt } from "@/components/receipts/TransactionReceipt";
import {
  createReceiptId,
  defaultReceiptPrivacy,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";

import type { GiftData } from "@/components/gift-vault/types";
import type { SendGiftResult } from "@/lib/app-kit/send";

type GiftVaultReceiptProps = {
  data: GiftData;
  result: SendGiftResult;
  onReset: () => void;
};

export function GiftVaultReceipt({
  data,
  result,
  onReset,
}: GiftVaultReceiptProps) {
  const createdAt = new Date().toISOString();

  const receipt: TransactionReceiptData = {
    id: createReceiptId("gift", result.txHash),
    type: "gift",
    status: "confirmed",

    title: "Your gift has been sent.",
    description:
      "The USDC transfer was submitted through Circle App Kit on Arc Testnet and recorded onchain.",

    amount: data.amount,
    asset: "USDC",

    recipientName: data.recipientName,
    recipientAddress: data.walletAddress,

    network: "Arc Testnet",
    environment: "testnet",

    transactionHash: result.txHash,
    explorerUrl: result.explorerUrl,

    createdAt,
    confirmedAt: createdAt,

    unlockDate: data.unlockDate,
    personalMessage: data.message || undefined,

    giftVaultId: createReceiptId("gift", result.txHash),

    privacy: {
      ...defaultReceiptPrivacy,
      showRecipientName: true,
      showRecipientAddress: false,
      showPersonalMessage: false,
      showTransactionHash: true,
    },
  };

  return (
    <TransactionReceipt
      receipt={receipt}
      onReset={onReset}
    />
  );
}
