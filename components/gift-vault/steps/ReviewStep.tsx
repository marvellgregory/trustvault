"use client";

import { isAddress } from "viem";
import { arcTestnet } from "viem/chains";
import { useAccount } from "wagmi";

import type { GiftData } from "@/components/gift-vault/types";
import { EstimateCard } from "@/components/gift-vault/review/EstimateCard";
import { ReviewSummary } from "@/components/gift-vault/review/ReviewSummary";
import { WalletVerification } from "@/components/gift-vault/review/WalletVerification";
import { UnifiedTransactionReview } from "@/components/transaction-review/UnifiedTransactionReview";
import { TRUSTVAULT_GIFT_VAULT_ADDRESS } from "@/lib/gift-vault/contract";

type GiftTransactionStatus =
  | "idle"
  | "approving"
  | "approval-pending"
  | "submitting"
  | "confirmation-pending"
  | "success"
  | "error";

export function ReviewStep({
  data,
  confirmed,
  onConfirmedChange,
  transactionStatus,
  hasPendingGift,
  hasPendingApproval,
}: {
  data: GiftData;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  transactionStatus: GiftTransactionStatus;
  hasPendingGift: boolean;
  hasPendingApproval: boolean;
}) {
  const { address, chainId } = useAccount();

  const approvalComplete =
    transactionStatus === "submitting" ||
    transactionStatus === "confirmation-pending" ||
    transactionStatus === "success" ||
    hasPendingGift;

  const approvalActive =
    transactionStatus === "approving" ||
    transactionStatus === "approval-pending" ||
    hasPendingApproval;

  const giftBroadcast =
    transactionStatus === "confirmation-pending" ||
    transactionStatus === "success" ||
    hasPendingGift;

  return (
    <UnifiedTransactionReview
      eyebrow="Final review"
      title="Review timed Gift Vault"
      description="Verify the recipient, unlock schedule, connected wallet and deployed Gift Vault contract before any wallet request is opened."
      accent="rose"
      summary={[
        { label: "Recipient", value: data.recipientName },
        { label: "Recipient wallet", value: data.walletAddress, mono: true },
        { label: "Network", value: "Arc Testnet" },
        { label: "Asset", value: "USDC" },
        { label: "Gift amount", value: `${data.amount} USDC` },
        {
          label: "Unlock",
          value: `${data.unlockDate} ${data.unlockTime} (${data.timeZone || "UTC"})`,
        },
        {
          label: "Gift Vault contract",
          value: TRUSTVAULT_GIFT_VAULT_ADDRESS,
          mono: true,
        },
        {
          label: "Network fee",
          value: "Shown by wallet before each required signature",
        },
      ]}
      progress={[
        { label: "Wallet connected", state: address ? "complete" : "pending" },
        {
          label: "Arc network verified",
          state: chainId === arcTestnet.id ? "complete" : "pending",
        },
        {
          label: "Recipient wallet checked",
          state: isAddress(data.walletAddress) ? "complete" : "pending",
        },
        {
          label: "Unlock schedule reviewed",
          state:
            data.unlockDate && data.unlockTime && data.timeZone
              ? "complete"
              : "pending",
        },
        { label: "Gift Vault contract verified", state: "complete" },
        {
          label: "Final approval",
          state: confirmed ? "complete" : "pending",
        },
        {
          label: "USDC approval",
          state:
            approvalComplete
              ? "complete"
              : approvalActive
                ? "active"
                : "pending",
        },
        {
          label: "Gift Vault transaction",
          state:
            giftBroadcast
              ? "complete"
              : transactionStatus === "submitting"
                ? "active"
                : "pending",
        },
        {
          label: "Arc confirmation & receipt",
          state:
            transactionStatus === "success"
              ? "complete"
              : giftBroadcast
                ? "active"
                : "pending",
        },
      ]}
      confirmed={confirmed}
      onConfirmedChange={onConfirmedChange}
      confirmationDisabled={
        transactionStatus === "approving" ||
        transactionStatus === "submitting" ||
        hasPendingGift ||
        hasPendingApproval
      }
      confirmationText="I have reviewed the recipient, amount, unlock date and time, connected wallet, Arc Testnet and the deployed Gift Vault contract."
    >
      <ReviewSummary data={data} />
      <WalletVerification />
      <EstimateCard data={data} />

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        <p className="font-semibold">
          Up to two wallet confirmations may be required.
        </p>
        <p className="mt-1">
          If the vault allowance is insufficient, the first request approves
          USDC for the exact gift amount. The next request creates the timed
          gift. TrustVault does not silently replace a transaction that has
          already been broadcast.
        </p>
      </div>
    </UnifiedTransactionReview>
  );
}
