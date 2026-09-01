import { isAddress } from "viem";
import { arcTestnet } from "viem/chains";
import { formatUnits } from "viem";
import type { CircleProviderBinding } from "@/lib/app-kit/circle-provider-binding";
import type { TransactionReadinessAuthority } from "@/lib/wallet/transaction-readiness-authority";
import type {
  MarketplaceOrder,
  MarketplacePaymentReviewSnapshot,
} from "@/lib/marketplace/order-types";
import { assertMarketplacePaymentReviewCurrent } from "@/lib/marketplace/payments/marketplace-payment-review";

import {
  sendGiftVault,
} from "@/lib/app-kit/send";

export type SendMarketplacePaymentInput = {
  circleBinding: CircleProviderBinding;
  order: MarketplaceOrder;
  reviewedPayment: MarketplacePaymentReviewSnapshot;
  connectedAddress: `0x${string}`;
  chainId: number;
  readinessAuthority: TransactionReadinessAuthority;
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

export async function sendMarketplacePayment(
  input: SendMarketplacePaymentInput,
): Promise<SendMarketplacePaymentResult> {
  if (!input.order.id.trim()) {
    throw new Error(
      "A Marketplace order ID is required.",
    );
  }

  if (!input.order.orderNumber.trim()) {
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

  if (!isAddress(input.order.payment.recipientWallet ?? "")) {
    throw new Error(
      "The seller settlement wallet is invalid.",
    );
  }

  if (
    input.connectedAddress.toLowerCase() ===
    input.order.payment.recipientWallet?.toLowerCase()
  ) {
    throw new Error(
      "The buyer and seller settlement wallets must be different.",
    );
  }

  const currentReadiness =
    await input.readinessAuthority.assertCurrent();

  assertMarketplacePaymentReviewCurrent({
    review: input.reviewedPayment,
    order: input.order,
    readiness: currentReadiness,
    connectedAddress: input.connectedAddress,
    chainId: input.chainId,
    recipientWallet:
      input.order.payment.recipientWallet ?? "",
    asset: input.order.payment.asset,
    tokenAddress:
      input.reviewedPayment.tokenAddress,
    amount:
      input.order.payment.amount.amount,
  });

  const amount = formatUnits(
    BigInt(input.reviewedPayment.amountBaseUnits),
    input.reviewedPayment.tokenDecimals,
  );

  const result =
    await sendGiftVault({
      circleBinding: input.circleBinding,
      connectedAddress:
        input.connectedAddress,
      chainId:
        input.chainId,
      recipientAddress:
        input.reviewedPayment.recipientWallet,
      amount,
      readinessAuthority: input.readinessAuthority,
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
      input.reviewedPayment.orderId,
    orderNumber:
      input.order.orderNumber,
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
