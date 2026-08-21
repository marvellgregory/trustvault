import type {
  MarketplaceOrder,
  OrderId,
} from "@/lib/marketplace/order-types";

import {
  fetchMarketplaceOrder,
  fetchMarketplaceOrders,
  persistMarketplaceOrder,
  type MarketplaceOrderPersistenceResult,
} from "@/lib/aws/marketplace-order-client";

export type MarketplaceOrderSyncState =
  | "local-only"
  | "syncing"
  | "persisted"
  | "failed";

export type MarketplaceOrderSyncResult = {
  orderId: OrderId;
  state: MarketplaceOrderSyncState;
  order?: MarketplaceOrder;
  error?: {
    status: number | null;
    code: string;
    message: string;
  };
};

type OrderSyncQueue = {
  inFlight: Promise<MarketplaceOrderSyncResult> | null;
  latestPending: MarketplaceOrder | null;
};

const queues =
  new Map<OrderId, OrderSyncQueue>();

function failureResult(
  orderId: OrderId,
  result: Extract<
    MarketplaceOrderPersistenceResult,
    { ok: false }
  >,
): MarketplaceOrderSyncResult {
  return {
    orderId,
    state: "failed",
    error: {
      status: result.status,
      code: result.code,
      message: result.message,
    },
  };
}

async function persistOrder(
  order: MarketplaceOrder,
): Promise<MarketplaceOrderSyncResult> {
  const result =
    await persistMarketplaceOrder(order);

  if (!result.ok) {
    return failureResult(
      order.id,
      result,
    );
  }

  return {
    orderId: order.id,
    state: "persisted",
    order: result.order,
  };
}

function queueFor(
  orderId: OrderId,
): OrderSyncQueue {
  const existing =
    queues.get(orderId);

  if (existing) {
    return existing;
  }

  const created: OrderSyncQueue = {
    inFlight: null,
    latestPending: null,
  };

  queues.set(
    orderId,
    created,
  );

  return created;
}

async function drainQueue(
  orderId: OrderId,
  firstOrder: MarketplaceOrder,
): Promise<MarketplaceOrderSyncResult> {
  const queue =
    queueFor(orderId);

  let current =
    firstOrder;

  let latestResult =
    await persistOrder(current);

  while (queue.latestPending) {
    const pending =
      queue.latestPending;

    queue.latestPending =
      null;

    /*
     * Always persist the newest queued snapshot after the
     * current network write completes.
     *
     * This prevents an older request from overwriting a
     * newer Marketplace payment/order state.
     */
    current =
      pending;

    latestResult =
      await persistOrder(current);
  }

  return latestResult;
}

export function syncMarketplaceOrder(
  order: MarketplaceOrder,
): Promise<MarketplaceOrderSyncResult> {
  const queue =
    queueFor(order.id);

  if (queue.inFlight) {
    /*
     * Coalesce multiple rapid updates.
     *
     * We do not enqueue every intermediate snapshot. The
     * newest MarketplaceOrder replaces the previous pending
     * snapshot so the cloud ultimately receives the latest
     * known state.
     */
    queue.latestPending =
      order;

    return queue.inFlight;
  }

  const task =
    drainQueue(
      order.id,
      order,
    )
      .finally(() => {
        const current =
          queues.get(order.id);

        if (current) {
          current.inFlight =
            null;

          if (!current.latestPending) {
            queues.delete(
              order.id,
            );
          }
        }
      });

  queue.inFlight =
    task;

  return task;
}

export async function loadMarketplaceOrderFromCloud(
  orderId: OrderId,
): Promise<MarketplaceOrderSyncResult> {
  const result =
    await fetchMarketplaceOrder(orderId);

  if (!result.ok) {
    return failureResult(
      orderId,
      result,
    );
  }

  return {
    orderId,
    state: "persisted",
    order: result.order,
  };
}

export async function loadMarketplaceOrdersFromCloud(): Promise<
  | {
      state: "persisted";
      orders: MarketplaceOrder[];
    }
  | {
      state: "failed";
      error: {
        status: number | null;
        code: string;
        message: string;
      };
    }
> {
  const result =
    await fetchMarketplaceOrders();

  if (!result.ok) {
    return {
      state: "failed",
      error: {
        status: result.status,
        code: result.code,
        message: result.message,
      },
    };
  }

  return {
    state: "persisted",
    orders: result.orders,
  };
}

export function isMarketplaceOrderSyncInFlight(
  orderId: OrderId,
): boolean {
  return Boolean(
    queues.get(orderId)?.inFlight,
  );
}

