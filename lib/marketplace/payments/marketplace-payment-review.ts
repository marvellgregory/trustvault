import {
  getAddress,
  isAddress,
  parseUnits,
} from "viem";

import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_USDC_ADDRESS,
} from "@/lib/arc/arc-testnet-assets";
import type {
  MarketplaceOrder,
  MarketplacePaymentReviewSnapshot,
} from "@/lib/marketplace/order-types";
import type {
  TransactionReadiness,
} from "@/lib/wallet/wallet-qualification";

const REVIEW_INVALIDATED_MESSAGE =
  "Marketplace payment details or wallet authority changed. Review the payment again before approving it.";

function invalidReview(): never {
  throw new Error(REVIEW_INVALIDATED_MESSAGE);
}

function normalizedAddress(
  value: string | undefined,
): `0x${string}` {
  if (!value || !isAddress(value)) {
    return invalidReview();
  }

  return getAddress(value);
}

function amountBaseUnits(
  value: string,
): string {
  try {
    const parsed = parseUnits(value.trim(), 6);

    if (parsed <= BigInt(0)) {
      return invalidReview();
    }

    return parsed.toString();
  } catch {
    return invalidReview();
  }
}

function requireReadyWallet(
  readiness: TransactionReadiness,
) {
  if (
    readiness.status !== "TRANSACTION_READY" ||
    !readiness.account ||
    readiness.chainId !== ARC_TESTNET_CHAIN_ID ||
    !readiness.providerIdentityKey ||
    !readiness.qualificationGeneration
  ) {
    invalidReview();
  }

  return {
    account: normalizedAddress(readiness.account),
    providerIdentityKey:
      readiness.providerIdentityKey,
    qualificationGeneration:
      readiness.qualificationGeneration,
  };
}

export function createMarketplacePaymentReviewSnapshot(
  order: MarketplaceOrder,
  readiness: TransactionReadiness,
): MarketplacePaymentReviewSnapshot {
  const wallet = requireReadyWallet(readiness);
  const buyer = normalizedAddress(
    order.buyer.walletAddress,
  );
  const payer = normalizedAddress(
    order.payment.payerWallet,
  );
  const recipient = normalizedAddress(
    order.payment.recipientWallet,
  );

  if (
    wallet.account.toLowerCase() !==
      buyer.toLowerCase() ||
    payer.toLowerCase() !== buyer.toLowerCase() ||
    order.payment.chainId !==
      ARC_TESTNET_CHAIN_ID ||
    order.payment.asset !== "USDC" ||
    order.payment.amount.currency !== "USDC"
  ) {
    invalidReview();
  }

  return Object.freeze({
    version: 1,
    orderId: order.id,
    payerWallet: payer,
    recipientWallet: recipient,
    chainId: ARC_TESTNET_CHAIN_ID,
    asset: "USDC",
    tokenAddress:
      ARC_TESTNET_USDC_ADDRESS,
    tokenDecimals: 6,
    amountBaseUnits: amountBaseUnits(
      order.payment.amount.amount,
    ),
    providerIdentityKey:
      wallet.providerIdentityKey,
    qualificationGeneration:
      wallet.qualificationGeneration,
  });
}

export function assertMarketplacePaymentReviewCurrent(
  input: Readonly<{
    review: MarketplacePaymentReviewSnapshot;
    order: MarketplaceOrder;
    readiness: TransactionReadiness;
    connectedAddress: string;
    chainId: number;
    recipientWallet: string;
    asset: string;
    tokenAddress: string;
    amount: string;
  }>,
): void {
  const wallet = requireReadyWallet(input.readiness);
  const currentAddress = normalizedAddress(
    input.connectedAddress,
  );
  const buyer = normalizedAddress(
    input.order.buyer.walletAddress,
  );
  const payer = normalizedAddress(
    input.order.payment.payerWallet,
  );
  const recipient = normalizedAddress(
    input.recipientWallet,
  );
  const orderRecipient = normalizedAddress(
    input.order.payment.recipientWallet,
  );

  if (
    input.review.version !== 1 ||
    input.review.orderId !== input.order.id ||
    input.review.chainId !== ARC_TESTNET_CHAIN_ID ||
    input.chainId !== input.review.chainId ||
    input.order.payment.chainId !==
      input.review.chainId ||
    input.review.asset !== "USDC" ||
    input.asset !== input.review.asset ||
    input.order.payment.asset !==
      input.review.asset ||
    input.order.payment.amount.currency !==
      input.review.asset ||
    input.review.tokenDecimals !== 6 ||
    input.review.tokenAddress.toLowerCase() !==
      ARC_TESTNET_USDC_ADDRESS.toLowerCase() ||
    input.tokenAddress.toLowerCase() !==
      input.review.tokenAddress.toLowerCase() ||
    currentAddress.toLowerCase() !==
      input.review.payerWallet.toLowerCase() ||
    buyer.toLowerCase() !==
      input.review.payerWallet.toLowerCase() ||
    payer.toLowerCase() !==
      input.review.payerWallet.toLowerCase() ||
    wallet.account.toLowerCase() !==
      input.review.payerWallet.toLowerCase() ||
    recipient.toLowerCase() !==
      input.review.recipientWallet.toLowerCase() ||
    orderRecipient.toLowerCase() !==
      input.review.recipientWallet.toLowerCase() ||
    amountBaseUnits(input.amount) !==
      input.review.amountBaseUnits ||
    amountBaseUnits(
      input.order.payment.amount.amount,
    ) !== input.review.amountBaseUnits ||
    wallet.providerIdentityKey !==
      input.review.providerIdentityKey ||
    wallet.qualificationGeneration !==
      input.review.qualificationGeneration
  ) {
    invalidReview();
  }
}

export function marketplacePaymentReviewsMatch(
  left: MarketplacePaymentReviewSnapshot | undefined,
  right: MarketplacePaymentReviewSnapshot,
): boolean {
  return Boolean(
    left &&
    left.version === right.version &&
    left.orderId === right.orderId &&
    left.payerWallet.toLowerCase() ===
      right.payerWallet.toLowerCase() &&
    left.recipientWallet.toLowerCase() ===
      right.recipientWallet.toLowerCase() &&
    left.chainId === right.chainId &&
    left.asset === right.asset &&
    left.tokenAddress.toLowerCase() ===
      right.tokenAddress.toLowerCase() &&
    left.tokenDecimals === right.tokenDecimals &&
    left.amountBaseUnits ===
      right.amountBaseUnits &&
    left.providerIdentityKey ===
      right.providerIdentityKey &&
    left.qualificationGeneration ===
      right.qualificationGeneration
  );
}
