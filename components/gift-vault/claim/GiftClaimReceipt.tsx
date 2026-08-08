"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";

import { TransactionReceipt } from "@/components/receipts/TransactionReceipt";
import {
  createReceiptId,
  defaultReceiptPrivacy,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";
import type { GiftClaimResult } from "@/lib/gift-vault/claim-gift";

type Props = {
  giftId: string;
  recipientAddress: string;
  amountBaseUnits: bigint;
  result: GiftClaimResult;
  onDone: () => void;
};

export function GiftClaimReceipt({
  giftId,
  recipientAddress,
  amountBaseUnits,
  result,
  onDone,
}: Props) {
  const receipt =
    useMemo<TransactionReceiptData>(() => {
      const createdAt =
        new Date().toISOString();

      return {
        id: createReceiptId(
          "gift",
          result.txHash,
        ),
        type: "gift",
        status: "confirmed",
        title: "Gift claimed successfully.",
        description:
          `Gift #${giftId} was released from the TrustVault timed Gift Vault contract to the recipient wallet on Arc Testnet.`,
        amount: formatUnits(
          amountBaseUnits,
          6,
        ),
        asset: "USDC",
        recipientAddress,
        network: "Arc Testnet",
        environment: "testnet",
        transactionHash: result.txHash,
        explorerUrl: result.explorerUrl,
        createdAt,
        confirmedAt: createdAt,
        giftVaultId: `Gift #${giftId}`,
        privacy: {
          ...defaultReceiptPrivacy,
          showRecipientName: false,
          showRecipientAddress: true,
          showTransactionHash: true,
        },
        metadata: {
          onchainEnforced: true,
          action: "gift-claim",
          giftId,
          confirmedBlock: result.blockNumber,
        },
      };
    }, [
      amountBaseUnits,
      giftId,
      recipientAddress,
      result,
    ]);

  return (
    <TransactionReceipt
      receipt={receipt}
      onReset={onDone}
    />
  );
}
