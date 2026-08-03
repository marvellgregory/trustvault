"use client";

import { useMemo } from "react";

import type { GiftData } from "@/components/gift-vault/types";
import { ReceiptPermalink } from "@/components/receipts/ReceiptPermalink";
import { TransactionReceipt } from "@/components/receipts/TransactionReceipt";
import {
  createReceiptId,
  defaultReceiptPrivacy,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";
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
  const receipt = useMemo<TransactionReceiptData>(() => {
    const timestamp = new Date().toISOString();
    const receiptId = createReceiptId("gift", result.txHash);

    return {
      id: receiptId,
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

      createdAt: timestamp,
      confirmedAt: timestamp,

      unlockDate: data.unlockDate,
      personalMessage: data.message || undefined,

      giftVaultId: receiptId,

      privacy: {
        ...defaultReceiptPrivacy,
        showRecipientName: true,
        showRecipientAddress: false,
        showPersonalMessage: false,
        showTransactionHash: true,
      },
    };
  }, [data, result]);

  return (
    <TransactionReceipt
      receipt={receipt}
      onReset={onReset}
    >
      <ReceiptPermalink receipt={receipt} />
    </TransactionReceipt>
  );
}
