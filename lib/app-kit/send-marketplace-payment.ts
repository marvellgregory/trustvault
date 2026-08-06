import { isAddress } from "viem";
import { arcTestnet } from "viem/chains";

import {
  sendGiftVault,
} from "@/lib/app-kit/send";

export type SendMarketplacePaymentInput = {
  connectedAddress: `0x${string}`;
  chainId: number;
  recipientAddress: string;
  amount: string;
  orderId: string;
  orderNumber: string;
};

export type SendMarketplacePaymentResult = {
  orderId: string;
  orderNumber: string;
  transactionHash: string;
  explorerUrl: string;
  submittedAt: string;
  network: "Arc Testnet";
  asset: "USDC";
  amount: string;
};

function validateAmount(value: string) {
  const amount = value.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(amount)) {
    throw new Error(
      "The Marketplace payment amount must contain no more than 6 decimal places.",
    );
  }

  if (Number(amount) <= 0) {
    throw new Error(
      "The Marketplace payment amount must be greater than zero.",
    );
  }

  return amount;
}

export async function sendMarketplacePayment(
  input: SendMarketplacePaymentInput,
): Promise<SendMarketplacePaymentResult> {
  if (!input.orderId.trim()) {
    throw new Error(
      "A Marketplace order ID is required.",
    );
  }

  if (!input.orderNumber.trim()) {
    throw new Error(
      "A Marketplace order number is required.",
    );
  }

  if (input.chainId !== arcTestnet.id) {
    throw new Error(
      "Switch the connected wallet to Arc Testnet before approving payment.",
    );
  }

  if (!isAddress(input.connectedAddress)) {
    throw new Error(
      "The connected buyer wallet is invalid.",
    );
  }

  if (!isAddress(input.recipientAddress)) {
    throw new Error(
      "The seller settlement wallet is invalid.",
    );
  }

  if (
    input.connectedAddress.toLowerCase() ===
    input.recipientAddress.toLowerCase()
  ) {
    throw new Error(
      "The buyer and seller settlement wallets must be different.",
    );
  }

  const amount =
    validateAmount(input.amount);

  const result =
    await sendGiftVault({
      connectedAddress:
        input.connectedAddress,
      chainId:
        input.chainId,
      recipientAddress:
        input.recipientAddress,
      amount,
    });

  const transactionHash =
    result.txHash?.trim();

  if (!transactionHash) {
    throw new Error(
      "Circle App Kit did not return a transaction hash.",
    );
  }

  const explorerUrl =
    result.explorerUrl?.trim() ||
    `${arcTestnet.blockExplorers.default.url}/tx/${transactionHash}`;

  return {
    orderId:
      input.orderId,
    orderNumber:
      input.orderNumber,
    transactionHash,
    explorerUrl,
    submittedAt:
      new Date().toISOString(),
    network:
      "Arc Testnet",
    asset:
      "USDC",
    amount,
  };
}
