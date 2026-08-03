"use client";

import { useState } from "react";

import type { GiftData } from "@/components/gift-vault/types";
import { useGiftVaultSend } from "@/components/gift-vault/hooks/useGiftVaultSend";
import type { SendGiftResult } from "@/lib/app-kit/send";

type TransactionStatus =
  | "idle"
  | "sending"
  | "success"
  | "error";

export function useGiftVaultTransaction() {
  const { sendGift } = useGiftVaultSend();

  const [status, setStatus] =
    useState<TransactionStatus>("idle");

  const [result, setResult] =
    useState<SendGiftResult | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function executeTransaction(data: GiftData) {
    try {
      setStatus("sending");
      setError(null);

      const response = await sendGift({
        recipientAddress: data.walletAddress,
        amount: data.amount,
      });

      setResult(response);

      setStatus("success");

      return response;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Transaction failed.";

      setError(message);

      setStatus("error");

      throw err;
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