import {
  createReceiptId,
  defaultReceiptPrivacy,
  type TransactionReceiptData,
} from "@/components/receipts/receipt-types";

import type {
  MarketplaceOrder,
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
};

export async function createMarketplaceReceipt({
  order,
  transactionHash,
  explorerUrl,
  confirmedAt,
}: CreateMarketplaceReceiptInput) {
  const receiptId =
    createReceiptId(
      "purchase",
      transactionHash,
    );

  const timestamp =
    confirmedAt ??
    new Date().toISOString();

  const receipt: TransactionReceiptData = {
    id:
      receiptId,

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
      order.seller.storeName ||
      order.seller.displayName,

    recipientAddress:
      order.payment.recipientWallet ||
      order.seller.walletAddress,

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
