"use client";

import { useState } from "react";

import { useAccount, useChainId } from "wagmi";

import { sendGiftVault } from "@/lib/app-kit/send";

type Status =
  | "idle"
  | "sending"
  | "success"
  | "error";

export function useGiftVaultSend() {
  const { address } = useAccount();

  const chainId = useChainId();

  const [status, setStatus] = useState<Status>("idle");

  const [error, setError] = useState<string>();

  const [result, setResult] = useState<any>();

  async function sendGift(input: {
    recipientAddress: string;
    amount: string;
  }) {
    if (!address) {
      throw new Error("Connect a wallet.");
    }

    try {
      setStatus("sending");
      setError(undefined);

      const response = await sendGiftVault({
        connectedAddress: address,
        chainId,
        recipientAddress: input.recipientAddress,
        amount: input.amount,
      });

      setResult(response);

      setStatus("success");

      return response;
    } catch (err) {
      setStatus("error");

      setError(
        err instanceof Error
          ? err.message
          : "Transaction failed.",
      );

      throw err;
    }
  }

  return {
    sendGift,
    status,
    result,
    error,
  };
}