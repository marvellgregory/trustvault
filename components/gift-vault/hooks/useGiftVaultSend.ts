"use client";

import { useState } from "react";

import { useAccount, useChainId } from "wagmi";

import { sendGiftVault, type SendGiftResult } from "@/lib/app-kit/send";
import { useCircleProviderBinding } from "@/components/wallet/useCircleProviderBinding";
import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";

type Status =
  | "idle"
  | "sending"
  | "success"
  | "error";

export function useGiftVaultSend() {
  const circleBinding = useCircleProviderBinding();
  const transactionReadiness = useWalletTransactionReadiness();
  const { address } = useAccount();

  const chainId = useChainId();

  const [status, setStatus] = useState<Status>("idle");

  const [error, setError] = useState<string>();

  const [result, setResult] = useState<SendGiftResult>();

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
        circleBinding,
        connectedAddress: address,
        chainId,
        recipientAddress: input.recipientAddress,
        amount: input.amount,
        readinessAuthority: transactionReadiness.authority,
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
