import type {
  CustomerProfile,
} from "@/lib/account/customer-types";
import {
  browserCustomerRepository,
} from "@/lib/account/customer-repository";
import type {
  MarketplaceOrder,
} from "@/lib/marketplace/order-types";
import {
  browserOrderRepository,
} from "@/lib/marketplace/repository/order-repository";
import type {
  TrustPointsBalance,
  TrustPointsEntry,
} from "@/lib/trustpoints/trustpoints-types";
import {
  browserTrustPointsRepository,
} from "@/lib/trustpoints/trustpoints-repository";

export type CustomerAccountSnapshot = {
  customer: CustomerProfile;
  orders: MarketplaceOrder[];

  trustPoints: {
    balance: TrustPointsBalance;
    entries: TrustPointsEntry[];
  };

  totals: {
    orderCount: number;
    confirmedOrderCount: number;
    receiptCount: number;
    lifetimeSpendUsdc: string;
  };
};

function normalizeWalletAddress(
  walletAddress: string,
) {
  const normalized =
    walletAddress.trim();

  if (
    !/^0x[a-fA-F0-9]{40}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "A valid connected wallet address is required.",
    );
  }

  return normalized;
}

function orderHasConfirmedPayment(
  order: MarketplaceOrder,
) {
  return (
    order.payment.status ===
      "confirmed" &&
    Boolean(
      order.payment.transactionHash,
    )
  );
}

export async function getOrCreateCustomerForOrder(
  order: MarketplaceOrder,
) {
  const walletAddress =
    normalizeWalletAddress(
      order.buyer.walletAddress,
    );

  return browserCustomerRepository.getOrCreateByWallet({
    walletAddress,

    displayName:
      order.buyer.displayName,

    email:
      order.buyer.email,
  });
}

export async function awardConfirmedOrderTrustPoints(
  order: MarketplaceOrder,
) {
  if (
    !orderHasConfirmedPayment(
      order,
    )
  ) {
    throw new Error(
      "TrustPoints can only be awarded after the Marketplace payment is confirmed.",
    );
  }

  const transactionHash =
    order.payment.transactionHash;

  if (!transactionHash) {
    throw new Error(
      "A confirmed transaction hash is required before TrustPoints can be awarded.",
    );
  }

  const customer =
    await getOrCreateCustomerForOrder(
      order,
    );

  const award =
    await browserTrustPointsRepository.awardMarketplacePurchase({
      customerId:
        customer.id,

      walletAddress:
        order.buyer.walletAddress,

      orderId:
        order.id,

      orderNumber:
        order.orderNumber,

      transactionHash,

      amountUsdc:
        order.payment.amount.amount,
    });

  return {
    customer,
    ...award,
  };
}

export async function syncCustomerAccountForWallet(
  walletAddress: string,
): Promise<CustomerAccountSnapshot> {
  const normalizedWallet =
    normalizeWalletAddress(
      walletAddress,
    );

  const orders =
    await browserOrderRepository.findAll({
      buyerWallet:
        normalizedWallet,
    });

  const mostRecentOrder =
    orders[0];

  const customer =
    await browserCustomerRepository.getOrCreateByWallet({
      walletAddress:
        normalizedWallet,

      displayName:
        mostRecentOrder?.buyer
          .displayName,

      email:
        mostRecentOrder?.buyer
          .email,
    });

  for (const order of orders) {
    if (
      orderHasConfirmedPayment(
        order,
      )
    ) {
      await browserTrustPointsRepository.awardMarketplacePurchase({
        customerId:
          customer.id,

        walletAddress:
          normalizedWallet,

        orderId:
          order.id,

        orderNumber:
          order.orderNumber,

        transactionHash:
          order.payment.transactionHash!,

        amountUsdc:
          order.payment.amount.amount,
      });
    }
  }

  const entries =
    await browserTrustPointsRepository.findAllForCustomer(
      customer.id,
    );

  const balance =
    await browserTrustPointsRepository.getBalance(
      customer.id,
    );

  const confirmedOrders =
    orders.filter(
      (order) =>
        orderHasConfirmedPayment(
          order,
        ),
    );

  const lifetimeSpend =
    confirmedOrders.reduce(
      (total, order) => {
        const amount =
          Number(
            order.payment.amount.amount,
          );

        return Number.isFinite(
          amount,
        )
          ? total + amount
          : total;
      },
      0,
    );

  return {
    customer,
    orders,

    trustPoints: {
      balance,
      entries,
    },

    totals: {
      orderCount:
        orders.length,

      confirmedOrderCount:
        confirmedOrders.length,

      receiptCount:
        orders.filter(
          (order) =>
            Boolean(
              order.receipt,
            ),
        ).length,

      lifetimeSpendUsdc:
        lifetimeSpend.toFixed(
          2,
        ),
    },
  };
}
