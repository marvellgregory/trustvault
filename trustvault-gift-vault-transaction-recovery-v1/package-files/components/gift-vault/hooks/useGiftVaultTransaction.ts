"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi";

import type { GiftData } from "@/components/gift-vault/types";
import {
  confirmApprovalTransaction,
  confirmTimedGiftTransaction,
  createTimedGift,
  GiftApprovalPendingError,
  GiftConfirmationPendingError,
  type CreateTimedGiftResult,
  type PendingApprovalTransaction,
  type PendingGiftTransaction,
} from "@/lib/gift-vault/create-gift";
import { zonedDateTimeToUnixSeconds } from "@/lib/gift-vault/timezone";

const PENDING_GIFT_KEY =
  "trustvault:gift-vault:pending-gift";
const PENDING_APPROVAL_KEY =
  "trustvault:gift-vault:pending-approval";

type TransactionStatus =
  | "idle"
  | "approving"
  | "approval-pending"
  | "submitting"
  | "confirmation-pending"
  | "success"
  | "error";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(
  key: string,
  value: unknown,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    key,
    JSON.stringify(value),
  );
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export function useGiftVaultTransaction() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } =
    useWalletClient();

  const [status, setStatus] =
    useState<TransactionStatus>("idle");

  const [result, setResult] =
    useState<CreateTimedGiftResult | null>(
      null,
    );

  const [pendingGift, setPendingGift] =
    useState<PendingGiftTransaction | null>(
      null,
    );

  const [pendingApproval, setPendingApproval] =
    useState<PendingApprovalTransaction | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  useEffect(() => {
    const storedGift =
      readJson<PendingGiftTransaction>(
        PENDING_GIFT_KEY,
      );

    if (storedGift) {
      setPendingGift(storedGift);
      setStatus("confirmation-pending");
      setNotice(
        "A previously submitted Gift Vault transaction is awaiting confirmation. Do not submit another gift.",
      );
      return;
    }

    const storedApproval =
      readJson<PendingApprovalTransaction>(
        PENDING_APPROVAL_KEY,
      );

    if (storedApproval) {
      setPendingApproval(storedApproval);
      setStatus("approval-pending");
      setNotice(
        "A previously submitted USDC approval is awaiting confirmation.",
      );
    }
  }, []);

  const retryGiftConfirmation =
    useCallback(async () => {
      if (!publicClient || !pendingGift) {
        return;
      }

      setError(null);
      setNotice(
        "Checking the existing Gift Vault transaction. No new gift will be submitted.",
      );
      setStatus("confirmation-pending");

      try {
        const confirmed =
          await confirmTimedGiftTransaction(
            publicClient,
            pendingGift,
          );

        removeKey(PENDING_GIFT_KEY);
        setPendingGift(null);
        setResult(confirmed);
        setNotice(null);
        setStatus("success");
      } catch (caughtError) {
        if (
          caughtError instanceof
          GiftConfirmationPendingError
        ) {
          setError(null);
          setNotice(caughtError.message);
          setStatus("confirmation-pending");
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Confirmation check failed.",
        );
        setStatus("error");
      }
    }, [pendingGift, publicClient]);

  const retryApprovalConfirmation =
    useCallback(async () => {
      if (!publicClient || !pendingApproval) {
        return;
      }

      setError(null);
      setNotice(
        "Checking the existing USDC approval. No new approval will be submitted.",
      );
      setStatus("approval-pending");

      try {
        await confirmApprovalTransaction(
          publicClient,
          pendingApproval,
        );

        removeKey(PENDING_APPROVAL_KEY);
        setPendingApproval(null);
        setNotice(
          "USDC approval confirmed. Review the gift details, then click Lock Gift once to create the timed gift.",
        );
        setStatus("idle");
      } catch (caughtError) {
        if (
          caughtError instanceof
          GiftApprovalPendingError
        ) {
          setError(null);
          setNotice(caughtError.message);
          setStatus("approval-pending");
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Approval confirmation check failed.",
        );
        setStatus("error");
      }
    }, [pendingApproval, publicClient]);

  async function executeTransaction(
    data: GiftData,
  ) {
    if (pendingGift) {
      setStatus("confirmation-pending");
      setNotice(
        "A Gift Vault transaction is already pending confirmation. Retry that confirmation instead of creating another gift.",
      );
      return null;
    }

    if (pendingApproval) {
      setStatus("approval-pending");
      setNotice(
        "A USDC approval is already pending confirmation. Retry that confirmation first.",
      );
      return null;
    }

    try {
      setStatus("submitting");
      setError(null);
      setNotice(null);

      if (
        !address ||
        !chainId ||
        !publicClient ||
        !walletClient
      ) {
        throw new Error(
          "Connect your wallet before creating the Gift Vault.",
        );
      }

      const unlockTimestamp =
        zonedDateTimeToUnixSeconds(
          data.unlockDate,
          data.unlockTime,
          data.timeZone,
        );

      const response =
        await createTimedGift({
          publicClient,
          walletClient,
          connectedAddress: address,
          chainId,
          recipientAddress:
            data.walletAddress,
          amount: data.amount,
          unlockTimestamp,
          onProgress(progress) {
            if (
              progress.stage ===
              "approval-submitted"
            ) {
              const pending = {
                approvalTxHash:
                  progress.approvalTxHash,
              };

              writeJson(
                PENDING_APPROVAL_KEY,
                pending,
              );
              setPendingApproval(pending);
              setStatus("approving");
              setNotice(
                "USDC approval submitted. TrustVault is waiting for confirmation.",
              );
            }

            if (
              progress.stage ===
              "approval-confirmed"
            ) {
              removeKey(
                PENDING_APPROVAL_KEY,
              );
              setPendingApproval(null);
              setStatus("submitting");
              setNotice(
                "USDC approval confirmed. Submit the timed gift in your wallet.",
              );
            }

            if (
              progress.stage ===
              "gift-submitted"
            ) {
              const pending: PendingGiftTransaction =
                {
                  txHash: progress.txHash,
                  approvalTxHash:
                    progress.approvalTxHash,
                  amount: progress.amount,
                  amountBaseUnits:
                    progress.amountBaseUnits,
                  unlockTimestamp:
                    progress.unlockTimestamp,
                  contractAddress:
                    progress.contractAddress,
                };

              writeJson(
                PENDING_GIFT_KEY,
                pending,
              );
              setPendingGift(pending);
              setStatus(
                "confirmation-pending",
              );
              setNotice(
                "Gift Vault transaction submitted. TrustVault is confirming the existing transaction.",
              );
            }
          },
        });

      removeKey(PENDING_GIFT_KEY);
      removeKey(PENDING_APPROVAL_KEY);
      setPendingGift(null);
      setPendingApproval(null);
      setResult(response);
      setNotice(null);
      setStatus("success");

      return response;
    } catch (caughtError) {
      if (
        caughtError instanceof
        GiftConfirmationPendingError
      ) {
        writeJson(
          PENDING_GIFT_KEY,
          caughtError.pending,
        );
        setPendingGift(
          caughtError.pending,
        );
        setError(null);
        setNotice(
          caughtError.message,
        );
        setStatus(
          "confirmation-pending",
        );
        return null;
      }

      if (
        caughtError instanceof
        GiftApprovalPendingError
      ) {
        writeJson(
          PENDING_APPROVAL_KEY,
          caughtError.pending,
        );
        setPendingApproval(
          caughtError.pending,
        );
        setError(null);
        setNotice(
          caughtError.message,
        );
        setStatus("approval-pending");
        return null;
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Gift Vault transaction failed.";

      setError(message);
      setNotice(null);
      setStatus("error");

      throw caughtError;
    }
  }

  function resetTransaction() {
    // Never silently delete a broadcast Gift Vault tx.
    if (pendingGift || pendingApproval) {
      return;
    }

    setStatus("idle");
    setResult(null);
    setError(null);
    setNotice(null);
  }

  return {
    executeTransaction,
    retryGiftConfirmation,
    retryApprovalConfirmation,
    resetTransaction,
    status,
    result,
    error,
    notice,
    pendingGift,
    pendingApproval,
    isSending:
      status === "approving" ||
      status === "submitting",
    isSuccess: status === "success",
    isError: status === "error",
    isConfirmationPending:
      status === "confirmation-pending",
    isApprovalPending:
      status === "approval-pending",
  };
}
