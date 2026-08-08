"use client";

import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi";

import type { GiftData } from "@/components/gift-vault/types";
import {
  createTimedGift,
  type CreateTimedGiftResult,
} from "@/lib/gift-vault/create-gift";
import { zonedDateTimeToUnixSeconds } from "@/lib/gift-vault/timezone";

type TransactionStatus =
  | "idle"
  | "sending"
  | "success"
  | "error";

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

  const [error, setError] =
    useState<string | null>(null);

  async function executeTransaction(
    data: GiftData,
  ) {
    try {
      setStatus("sending");
      setError(null);

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
        });

      setResult(response);
      setStatus("success");

      return response;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Gift Vault transaction failed.";

      setError(message);
      setStatus("error");

      throw caughtError;
    }
  }

  function resetTransaction() {
    setStatus("idle");
    setResult(null);
    setError(null);
  }

  return {
    executeTransaction,
    resetTransaction,
    status,
    result,
    error,
    isSending: status === "sending",
    isSuccess: status === "success",
    isError: status === "error",
  };
}
