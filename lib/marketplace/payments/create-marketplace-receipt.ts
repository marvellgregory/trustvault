import {
  createEnterpriseReceiptNumber,
  createReceiptId,
  defaultReceiptPrivacy,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";

import type {
  MarketplaceOrder,
  OrderAddress,
} from "@/lib/marketplace/order-types";

import {
  browserOrderRepository,
} from "@/lib/marketplace/repository/order-repository";

import {
  browserReceiptStore,
  createReceiptPath,
} from "@/lib/receipts/receipt-store";

type CreateMarketplaceReceiptInput = {
  order: MarketplaceOrder;
  transactionHash: string;
  explorerUrl: string;
  confirmedAt?: string;
  trustPointsAwarded?: number;
  trustPointsBalance?: number;
};

function formatAddress(address?: OrderAddress) {
  if (!address) {
    return undefined;
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function createMarketplaceReceipt({
  order,
  transactionHash,
  explorerUrl,
  confirmedAt,
  trustPointsAwarded,
  trustPointsBalance,
}: CreateMarketplaceReceiptInput) {
  const receiptId =
    createReceiptId(
      "purchase",
      transactionHash,
    );

  const timestamp =
    confirmedAt ??
    new Date().toISOString();

  const displayId =
    createEnterpriseReceiptNumber(
      timestamp,
      transactionHash,
    );

  const sellerName =
    order.seller.storeName ||
    order.seller.displayName;

  const settlementWallet =
    order.payment.recipientWallet ||
    order.seller.walletAddress;

  const receipt: TransactionReceiptData = {
    id:
      receiptId,

    displayId,

    type:
      "purchase",

    status:
      "confirmed",

    title:
      "Marketplace purchase completed",

    description:
      "Your USDC payment was confirmed on Arc Testnet and recorded by TrustVault.",

    amount:
      order.payment.amount.amount,

    asset:
      order.payment.amount.currency,

    senderAddress:
      order.buyer.walletAddress,

    recipientName:
      sellerName,

    recipientAddress:
      settlementWallet,

    network:
      "Arc Testnet",

    environment:
      "testnet",

    transactionHash,
    explorerUrl,

    createdAt:
      timestamp,

    confirmedAt:
      timestamp,

    orderId:
      order.id,

    customer: {
      displayName:
        order.buyer.displayName,

      email:
        order.buyer.email,

      walletAddress:
        order.buyer.walletAddress,

      address:
        formatAddress(
          order.billingAddress ??
          order.shippingAddress,
        ),
    },

    seller: {
      displayName:
        order.seller.displayName,

      storeName:
        order.seller.storeName,

      settlementWallet,

      settlementWalletChecked:
        Boolean(
          settlementWallet &&
          settlementWallet.toLowerCase() !==
            order.buyer.walletAddress.toLowerCase(),
        ),
    },

    rewards:
      typeof trustPointsAwarded === "number"
        ? {
            pointsAwarded:
              trustPointsAwarded,

            balanceAfterAward:
              trustPointsBalance,

            programName:
              "TrustPoints",
          }
        : undefined,

    timeline: [
      {
        id:
          "order-created",
        label:
          "Order created",
        status:
          "complete",
        occurredAt:
          order.createdAt,
      },
      {
        id:
          "wallet-checked",
        label:
          "Buyer wallet checked",
        status:
          "complete",
      },
      {
        id:
          "payment-broadcast",
        label:
          "USDC payment broadcast",
        status:
          "complete",
        occurredAt:
          order.payment.submittedAt,
      },
      {
        id:
          "settlement-confirmed",
        label:
          "Settlement confirmed on Arc Testnet",
        status:
          "complete",
        occurredAt:
          timestamp,
      },
      {
        id:
          "receipt-generated",
        label:
          "Receipt generated",
        status:
          "complete",
        occurredAt:
          timestamp,
      },
    ],

    privacy: {
      ...defaultReceiptPrivacy,

      showRecipientName:
        true,

      showRecipientAddress:
        false,

      showSenderAddress:
        false,

      showTransactionHash:
        true,
    },

    metadata: {
      orderNumber:
        order.orderNumber,

      sellerId:
        order.seller.id,

      itemCount:
        order.items.length,

      escrowRequired:
        order.escrow.required,

      receiptVersion:
        "2",
    },
  };

  await browserReceiptStore.save(
    receipt,
  );

  await browserOrderRepository.attachReceipt({
    orderId:
      order.id,

    receipt: {
      receiptId,

      receiptPath:
        createReceiptPath(
          receiptId,
        ),

      createdAt:
        timestamp,
    },
  });

  return receipt;
}
