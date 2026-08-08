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
import type { CreateTimedGiftResult } from "@/lib/gift-vault/create-gift";
import { formatGiftUnlock } from "@/lib/gift-vault/timezone";

type GiftVaultReceiptProps = {
  data: GiftData;
  result: CreateTimedGiftResult;
  onReset: () => void;
};

export function GiftVaultReceipt({
  data,
  result,
  onReset,
}: GiftVaultReceiptProps) {
  const receipt =
    useMemo<TransactionReceiptData>(() => {
      const timestamp =
        new Date().toISOString();

      const receiptId = createReceiptId(
        "gift",
        result.txHash,
      );

      const unlock =
        formatGiftUnlock(
          result.unlockTimestamp,
          data.timeZone,
        );

      return {
        id: receiptId,
        type: "gift",
        status: "confirmed",

        title: "Your timed gift is locked.",
        description:
          `Gift #${result.giftId} is confirmed on Arc Testnet. The recipient can claim the locked USDC at or after ${unlock.local}.`,

        amount: data.amount,
        asset: "USDC",

        recipientName:
          data.recipientName,
        recipientAddress:
          data.walletAddress,

        network: "Arc Testnet",
        environment: "testnet",

        transactionHash:
          result.txHash,
        explorerUrl:
          result.explorerUrl,

        createdAt: timestamp,
        confirmedAt: timestamp,

        unlockDate: unlock.local,
        personalMessage:
          data.message || undefined,

        giftVaultId:
          `Gift #${result.giftId}`,

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
      <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Onchain Gift Vault
        </p>

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">
              Gift ID
            </dt>
            <dd className="mt-1 font-semibold text-zinc-950">
              #{result.giftId}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-500">
              Confirmed block
            </dt>
            <dd className="mt-1 font-mono text-xs font-semibold text-zinc-950">
              {result.blockNumber}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-zinc-500">
              Timed vault contract
            </dt>
            <dd className="mt-1 break-all font-mono text-xs font-semibold text-zinc-950">
              {result.contractAddress}
            </dd>
          </div>
        </dl>
      </div>

      <ReceiptPermalink
        receipt={receipt}
      />
    </TransactionReceipt>
  );
}
