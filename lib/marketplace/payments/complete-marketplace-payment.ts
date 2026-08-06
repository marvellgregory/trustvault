import {
  createPublicClient,
  http,
} from "viem";
import { arcTestnet } from "viem/chains";

import {
  awardConfirmedOrderTrustPoints,
} from "@/lib/account/customer-account-service";
import type {
  MarketplaceOrder,
} from "@/lib/marketplace/order-types";
import {
  createMarketplaceReceipt,
} from "@/lib/marketplace/payments/create-marketplace-receipt";
import {
  browserOrderRepository,
} from "@/lib/marketplace/repository/order-repository";
import {
  createReceiptPath,
} from "@/lib/receipts/receipt-store";

type CompleteMarketplacePaymentInput = {
  order: MarketplaceOrder;
  transactionHash: `0x${string}`;
};

export type CompleteMarketplacePaymentResult = {
  order: MarketplaceOrder;

  receiptId: string;
  receiptPath: string;

  confirmedAt: string;
  blockNumber: string;

  trustPointsAwarded: number;
  trustPointsBalance: number;
};

const arcPublicClient =
  createPublicClient({
    chain:
      arcTestnet,

    transport:
      http(
        "https://rpc.testnet.arc.network",
        {
          retryCount:
            3,

          retryDelay:
            750,

          timeout:
            20_000,
        },
      ),
  });

export async function completeMarketplacePayment({
  order,
  transactionHash,
}: CompleteMarketplacePaymentInput):
  Promise<CompleteMarketplacePaymentResult> {
  if (
    order.payment.transactionHash &&
    order.payment.transactionHash.toLowerCase() !==
      transactionHash.toLowerCase()
  ) {
    throw new Error(
      "The transaction hash does not match the saved Marketplace payment.",
    );
  }

  const transactionReceipt =
    await arcPublicClient.waitForTransactionReceipt({
      hash:
        transactionHash,

      confirmations:
        1,

      timeout:
        120_000,

      pollingInterval:
        2_000,
    });

  if (
    transactionReceipt.status !==
    "success"
  ) {
    throw new Error(
      "The Arc transaction failed and the Marketplace order was not marked as paid.",
    );
  }

  const confirmedAt =
    new Date().toISOString();

  const confirmedOrder =
    await browserOrderRepository.updatePayment({
      orderId:
        order.id,

      payment: {
        status:
          "confirmed",

        transactionHash,

        confirmedAt,

        errorCode:
          undefined,

        errorMessage:
          undefined,
      },

      timelineEvent: {
        type:
          "payment-confirmed",

        title:
          "Payment confirmed",

        description:
          `${order.payment.amount.amount} USDC was confirmed on Arc Testnet in block ${transactionReceipt.blockNumber.toString()}.`,

        actor: {
          type:
            "system",

          displayName:
            "TrustVault",
        },
      },
    });

  const paidOrder =
    confirmedOrder.status ===
      "paid"
      ? confirmedOrder
      : await browserOrderRepository.updateStatus({
          orderId:
            order.id,

          status:
            "paid",

          note:
            "The Arc Testnet USDC payment was confirmed onchain.",

          actor: {
            type:
              "system",

            displayName:
              "TrustVault",
          },
        });

  const completedOrder: MarketplaceOrder = {
    ...paidOrder,

    payment:
      confirmedOrder.payment,

    timeline:
      confirmedOrder.timeline,
  };

  const reward =
    await awardConfirmedOrderTrustPoints(
      completedOrder,
    );

  const receipt =
    await createMarketplaceReceipt({
      order:
        completedOrder,

      transactionHash,

      explorerUrl:
        confirmedOrder.payment.explorerUrl ??
        `${arcTestnet.blockExplorers.default.url}/tx/${transactionHash}`,

      confirmedAt,
    });

  const receiptPath =
    createReceiptPath(
      receipt.id,
    );

  const orderWithReceipt =
    await browserOrderRepository.findById(
      order.id,
    );

  if (!orderWithReceipt) {
    throw new Error(
      "The payment was confirmed, but TrustVault could not reload the completed order.",
    );
  }

  return {
    order:
      orderWithReceipt,

    receiptId:
      receipt.id,

    receiptPath,

    confirmedAt,

    blockNumber:
      transactionReceipt.blockNumber.toString(),

    trustPointsAwarded:
      reward.entry.points,

    trustPointsBalance:
      reward.balance.confirmed,
  };
}
