import {
  allowedOrderTransitions,
  calculateOrderItemSubtotal,
  canTransitionOrderStatus,
  createOrderEventId,
  type CreateMarketplaceOrderInput,
  type EscrowStatus,
  type FulfillmentStatus,
  type MarketplaceOrder,
  type MarketplaceOrderItem,
  type OrderAddress,
  type OrderDeliveryConfirmation,
  type OrderEscrow,
  type OrderEventType,
  type OrderFulfillment,
  type OrderId,
  type OrderPayment,
  type OrderReceiptReference,
  type OrderRefund,
  type OrderStatus,
  type OrderTimelineEvent,
  type OrderValidationIssue,
  type OrderValidationResult,
  type PaymentStatus,
  type RefundStatus,
  type UpdateOrderStatusInput,
} from "@/lib/marketplace/order-types";

import {
  syncMarketplaceOrder,
  type MarketplaceOrderSyncResult,
} from "@/lib/aws/marketplace-order-sync";

export const ORDER_UPDATED_EVENT =
  "trustvault:marketplace-order-updated";

export const ORDER_SYNC_UPDATED_EVENT =
  "trustvault:marketplace-order-sync-updated";

export type MarketplaceOrderSyncUpdate = {
  orderId: OrderId;
  state:
    | "syncing"
    | "persisted"
    | "failed";
  result?: MarketplaceOrderSyncResult;
};

const STORAGE_KEY =
  "trustvault.marketplace.orders.v1";

const ORDER_SEQUENCE_KEY =
  "trustvault.marketplace.order-sequence.v1";

export type OrderRepositoryFilters = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  escrowStatus?: EscrowStatus;
  fulfillmentStatus?: FulfillmentStatus;
  refundStatus?: RefundStatus;

  buyerWallet?: string;
  sellerId?: string;

  search?: string;
};

export type UpdateOrderPaymentInput = {
  orderId: OrderId;
  payment: Partial<OrderPayment>;
  timelineEvent?: {
    type: OrderEventType;
    title: string;
    description?: string;
    actor?: OrderTimelineEvent["actor"];
  };
};

export type UpdateOrderEscrowInput = {
  orderId: OrderId;
  escrow: Partial<OrderEscrow>;
  timelineEvent?: {
    type: OrderEventType;
    title: string;
    description?: string;
    actor?: OrderTimelineEvent["actor"];
  };
};

export type UpdateOrderFulfillmentInput = {
  orderId: OrderId;
  fulfillment: Partial<OrderFulfillment>;
  timelineEvent?: {
    type: OrderEventType;
    title: string;
    description?: string;
    actor?: OrderTimelineEvent["actor"];
  };
};

export type UpdateOrderDeliveryConfirmationInput = {
  orderId: OrderId;
  deliveryConfirmation: Partial<OrderDeliveryConfirmation>;
  timelineEvent?: {
    type: OrderEventType;
    title: string;
    description?: string;
    actor?: OrderTimelineEvent["actor"];
  };
};

export type UpdateOrderRefundInput = {
  orderId: OrderId;
  refund: Partial<OrderRefund>;
  timelineEvent?: {
    type: OrderEventType;
    title: string;
    description?: string;
    actor?: OrderTimelineEvent["actor"];
  };
};

export type AttachOrderReceiptInput = {
  orderId: OrderId;
  receipt: OrderReceiptReference;
};

export type OrderRepository = {
  create(
    input: CreateMarketplaceOrderInput,
  ): Promise<MarketplaceOrder>;

  findById(
    orderId: OrderId,
  ): Promise<MarketplaceOrder | null>;

  findByOrderNumber(
    orderNumber: string,
  ): Promise<MarketplaceOrder | null>;

  findAll(
    filters?: OrderRepositoryFilters,
  ): Promise<MarketplaceOrder[]>;

  count(
    filters?: OrderRepositoryFilters,
  ): Promise<number>;

  updateStatus(
    input: UpdateOrderStatusInput,
  ): Promise<MarketplaceOrder>;

  updatePayment(
    input: UpdateOrderPaymentInput,
  ): Promise<MarketplaceOrder>;

  updateEscrow(
    input: UpdateOrderEscrowInput,
  ): Promise<MarketplaceOrder>;

  updateFulfillment(
    input: UpdateOrderFulfillmentInput,
  ): Promise<MarketplaceOrder>;

  updateDeliveryConfirmation(
    input: UpdateOrderDeliveryConfirmationInput,
  ): Promise<MarketplaceOrder>;

  updateRefund(
    input: UpdateOrderRefundInput,
  ): Promise<MarketplaceOrder>;

  attachReceipt(
    input: AttachOrderReceiptInput,
  ): Promise<MarketplaceOrder>;

  addTimelineEvent(
    orderId: OrderId,
    event: Omit<
      OrderTimelineEvent,
      "id" | "orderId" | "occurredAt"
    > & {
      occurredAt?: string;
    },
  ): Promise<MarketplaceOrder>;

  remove(
    orderId: OrderId,
  ): Promise<void>;

  clear(): Promise<void>;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeSearchValue(
  value: string,
) {
  return value.trim().toLowerCase();
}

function createOrderId() {
  return `order-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getNextOrderSequence() {
  if (!isBrowser()) {
    return 1;
  }

  try {
    const storedSequence =
      window.localStorage.getItem(
        ORDER_SEQUENCE_KEY,
      );

    const currentSequence =
      Number(storedSequence);

    const nextSequence =
      Number.isInteger(currentSequence) &&
      currentSequence >= 0
        ? currentSequence + 1
        : 1;

    window.localStorage.setItem(
      ORDER_SEQUENCE_KEY,
      String(nextSequence),
    );

    return nextSequence;
  } catch {
    return Date.now() % 1000000;
  }
}

function createOrderNumber() {
  const now = new Date();

  const year = now
    .getFullYear()
    .toString()
    .slice(-2);

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  const sequence = String(
    getNextOrderSequence(),
  ).padStart(6, "0");

  return `TV-${year}${month}${day}-${sequence}`;
}

function isMarketplaceOrder(
  value: unknown,
): value is MarketplaceOrder {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<MarketplaceOrder>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.orderNumber ===
      "string" &&
    typeof candidate.status === "string" &&
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.timeline) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function readOrders(): Record<
  OrderId,
  MarketplaceOrder
> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    const entries =
      Object.entries(parsedValue);

    return entries.reduce(
      (
        result,
        [orderId, order],
      ) => {
        if (isMarketplaceOrder(order)) {
          result[orderId] = order;
        }

        return result;
      },
      {} as Record<
        OrderId,
        MarketplaceOrder
      >,
    );
  } catch {
    return {};
  }
}

function writeOrders(
  orders: Record<
    OrderId,
    MarketplaceOrder
  >,
) {
  if (!isBrowser()) {
    throw new Error(
      "Marketplace order storage is unavailable during server rendering.",
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(orders),
  );
}

function broadcastOrderUpdate(
  order: MarketplaceOrder,
) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      ORDER_UPDATED_EVENT,
      {
        detail: order,
      },
    ),
  );
}
function broadcastOrderSyncUpdate(
  update: MarketplaceOrderSyncUpdate,
) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      ORDER_SYNC_UPDATED_EVENT,
      {
        detail: update,
      },
    ),
  );
}

function syncOrderSnapshot(
  order: MarketplaceOrder,
) {
  if (!isBrowser()) {
    return;
  }

  broadcastOrderSyncUpdate({
    orderId: order.id,
    state: "syncing",
  });

  void syncMarketplaceOrder(order)
    .then((result) => {
      broadcastOrderSyncUpdate({
        orderId: order.id,
        state:
          result.state === "persisted"
            ? "persisted"
            : "failed",
        result,
      });
    })
    .catch(() => {
      broadcastOrderSyncUpdate({
        orderId: order.id,
        state: "failed",
      });
    });
}

function saveOrder(
  order: MarketplaceOrder,
) {
  const orders = readOrders();

  const updatedOrder: MarketplaceOrder =
    {
      ...order,
      updatedAt:
        new Date().toISOString(),
    };

  orders[updatedOrder.id] =
    updatedOrder;

  writeOrders(orders);
  broadcastOrderUpdate(updatedOrder);

  /*
   * Keep browser persistence synchronous and responsive.
   * Durable AWS persistence happens separately and never
   * blocks the existing Checkout / Payment Review flow.
   */
  syncOrderSnapshot(updatedOrder);

  return updatedOrder;
}

function normalizeAmount(
  value: number,
) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value
    .toFixed(6)
    .replace(/\.?0+$/, "");
}

function getNumericAmount(
  amount?: string,
) {
  if (!amount) {
    return 0;
  }

  const numericAmount =
    Number(amount);

  return Number.isFinite(
    numericAmount,
  )
    ? numericAmount
    : 0;
}

function validateAddress(
  address?: OrderAddress,
) {
  if (!address) {
    return false;
  }

  return Boolean(
    address.fullName.trim() &&
      address.addressLine1.trim() &&
      address.city.trim() &&
      address.postalCode.trim() &&
      address.country.trim(),
  );
}

export function validateMarketplaceOrderInput(
  input: CreateMarketplaceOrderInput,
): OrderValidationResult {
  const issues: OrderValidationIssue[] =
    [];

  if (input.items.length === 0) {
    issues.push({
      code: "missing-items",
      field: "items",
      message:
        "An order must contain at least one item.",
      severity: "error",
    });
  }

  if (!input.buyer.walletAddress.trim()) {
    issues.push({
      code: "missing-buyer-wallet",
      field: "buyer.walletAddress",
      message:
        "A buyer wallet address is required.",
      severity: "error",
    });
  }

  if (
    !input.seller.id ||
    !input.seller.displayName.trim()
  ) {
    issues.push({
      code: "missing-seller",
      field: "seller",
      message:
        "A valid seller is required.",
      severity: "error",
    });
  }

  const totalAmount =
    getNumericAmount(
      input.totals.total.amount,
    );

  if (
    !Number.isFinite(totalAmount) ||
    totalAmount <= 0
  ) {
    issues.push({
      code: "invalid-total",
      field: "totals.total",
      message:
        "The order total must be greater than zero.",
      severity: "error",
    });
  }

  const requiresShipping =
    input.items.some(
      (item) =>
        item.shipping !== undefined ||
        item.snapshot.selectedOptions !==
          undefined,
    );

  if (
    requiresShipping &&
    !validateAddress(
      input.shippingAddress,
    )
  ) {
    issues.push({
      code: "missing-shipping-address",
      field: "shippingAddress",
      message:
        "A complete shipping address is required for this order.",
      severity: "error",
    });
  }

  return {
    valid: !issues.some(
      (issue) =>
        issue.severity === "error",
    ),
    issues,
  };
}

function createInitialTimelineEvent(
  orderId: OrderId,
  orderNumber: string,
): OrderTimelineEvent {
  return {
    id: createOrderEventId(
      orderId,
      "order-created",
    ),

    orderId,
    type: "order-created",

    title: "Order created",

    description:
      `TrustVault order ${orderNumber} was created and is ready for payment review.`,

    occurredAt:
      new Date().toISOString(),

    actor: {
      type: "system",
      displayName: "TrustVault",
    },
  };
}

function createInitialPayment(
  input: CreateMarketplaceOrderInput,
): OrderPayment {
  return {
    status: "not-started",

    network: input.network,
    chainId: input.chainId,
    asset: "USDC",

    payerWallet:
      input.buyer.walletAddress,

    recipientWallet:
      input.seller.walletAddress,

    amount: {
      amount:
        input.totals.total.amount,
      currency: "USDC",
    },
  };
}

function orderRequiresEscrow(
  items: MarketplaceOrderItem[],
) {
  return items.some(
    (item) =>
      item.gift?.enabled ||
      item.shipping !== undefined,
  );
}

function createInitialEscrow(
  required: boolean,
): OrderEscrow {
  return {
    required,

    status: required
      ? "pending"
      : "not-required",
  };
}

function createInitialFulfillment(
  items: MarketplaceOrderItem[],
): OrderFulfillment {
  const requiresFulfillment =
    items.some(
      (item) =>
        item.shipping !== undefined,
    );

  return {
    status: requiresFulfillment
      ? "unfulfilled"
      : "not-required",
  };
}

function createMarketplaceOrder(
  input: CreateMarketplaceOrderInput,
): MarketplaceOrder {
  const validation =
    validateMarketplaceOrderInput(input);

  if (!validation.valid) {
    const message =
      validation.issues
        .filter(
          (issue) =>
            issue.severity === "error",
        )
        .map((issue) => issue.message)
        .join(" ");

    throw new Error(
      message ||
        "The Marketplace order is invalid.",
    );
  }

  const now =
    new Date().toISOString();

  const orderId =
    createOrderId();

  const orderNumber =
    createOrderNumber();

  const escrowRequired =
    orderRequiresEscrow(
      input.items,
    );

  return {
    id: orderId,
    orderNumber,

    status: "draft",

    buyer: input.buyer,
    seller: input.seller,

    items: input.items.map(
      (item, index) => ({
        ...item,

        id:
          item.id ||
          `${orderId}-item-${index + 1}`,

        orderId,

        subtotal:
          calculateOrderItemSubtotal(
            item.snapshot.unitPrice,
            item.quantity,
          ),

        createdAt:
          item.createdAt || now,
      }),
    ),

    billingAddress:
      input.billingAddress,

    shippingAddress:
      input.shippingAddress,

    totals: input.totals,

    payment:
      createInitialPayment(input),

    escrow:
      createInitialEscrow(
        escrowRequired,
      ),

    fulfillment:
      createInitialFulfillment(
        input.items,
      ),

    deliveryConfirmation: {
      status: escrowRequired
        ? "pending"
        : "not-required",
    },

    refund: {
      status: "none",
    },

    timeline: [
      createInitialTimelineEvent(
        orderId,
        orderNumber,
      ),
    ],

    createdAt: now,
    updatedAt: now,
  };
}

function getTimelineEventForStatus(
  order: MarketplaceOrder,
  status: OrderStatus,
  note?: string,
  actor?: OrderTimelineEvent["actor"],
): OrderTimelineEvent | null {
  const occurredAt =
    new Date().toISOString();

  const eventMap: Partial<
    Record<
      OrderStatus,
      {
        type: OrderEventType;
        title: string;
        description: string;
      }
    >
  > = {
    "pending-payment": {
      type: "payment-started",
      title: "Payment review started",
      description:
        "The order is ready for wallet review and payment approval.",
    },

    "payment-processing": {
      type: "payment-submitted",
      title: "Payment submitted",
      description:
        "The buyer submitted the USDC payment request.",
    },

    paid: {
      type: "payment-confirmed",
      title: "Payment confirmed",
      description:
        "The USDC payment was confirmed.",
    },

    "escrow-funded": {
      type: "escrow-funded",
      title: "Escrow funded",
      description:
        "Protected funds were deposited into escrow.",
    },

    processing: {
      type: "processing-started",
      title: "Order processing",
      description:
        "The seller began preparing the order.",
    },

    packed: {
      type: "packed",
      title: "Order packed",
      description:
        "The order was packed and prepared for shipment.",
    },

    shipped: {
      type: "shipped",
      title: "Order shipped",
      description:
        "The seller shipped the order.",
    },

    "out-for-delivery": {
      type: "out-for-delivery",
      title: "Out for delivery",
      description:
        "The order is currently out for delivery.",
    },

    delivered: {
      type: "delivered",
      title: "Order delivered",
      description:
        "The order was marked as delivered.",
    },

    completed: {
      type: "completed",
      title: "Order completed",
      description:
        "The order lifecycle was completed.",
    },

    cancelled: {
      type: "cancelled",
      title: "Order cancelled",
      description:
        "The order was cancelled.",
    },

    "refund-requested": {
      type: "refund-requested",
      title: "Refund requested",
      description:
        "A refund request was submitted.",
    },

    refunded: {
      type: "refund-completed",
      title: "Refund completed",
      description:
        "The refund was completed.",
    },

    disputed: {
      type: "dispute-opened",
      title: "Dispute opened",
      description:
        "A dispute was opened for this order.",
    },
  };

  const eventDetails =
    eventMap[status];

  if (!eventDetails) {
    return null;
  }

  return {
    id: createOrderEventId(
      order.id,
      eventDetails.type,
    ),

    orderId: order.id,
    type: eventDetails.type,

    title:
      eventDetails.title,

    description:
      note ||
      eventDetails.description,

    occurredAt,

    actor:
      actor ?? {
        type: "system",
        displayName: "TrustVault",
      },
  };
}

function getCompletionFields(
  status: OrderStatus,
) {
  const now =
    new Date().toISOString();

  return {
    completedAt:
      status === "completed"
        ? now
        : undefined,

    cancelledAt:
      status === "cancelled"
        ? now
        : undefined,
  };
}

function requireOrder(
  orderId: OrderId,
) {
  const order =
    readOrders()[orderId];

  if (!order) {
    throw new Error(
      "The selected Marketplace order could not be found.",
    );
  }

  return order;
}

function matchesFilters(
  order: MarketplaceOrder,
  filters?: OrderRepositoryFilters,
) {
  if (!filters) {
    return true;
  }

  if (
    filters.status &&
    order.status !== filters.status
  ) {
    return false;
  }

  if (
    filters.paymentStatus &&
    order.payment.status !==
      filters.paymentStatus
  ) {
    return false;
  }

  if (
    filters.escrowStatus &&
    order.escrow.status !==
      filters.escrowStatus
  ) {
    return false;
  }

  if (
    filters.fulfillmentStatus &&
    order.fulfillment.status !==
      filters.fulfillmentStatus
  ) {
    return false;
  }

  if (
    filters.refundStatus &&
    order.refund.status !==
      filters.refundStatus
  ) {
    return false;
  }

  if (
    filters.buyerWallet &&
    order.buyer.walletAddress.toLowerCase() !==
      filters.buyerWallet.toLowerCase()
  ) {
    return false;
  }

  if (
    filters.sellerId &&
    order.seller.id !==
      filters.sellerId
  ) {
    return false;
  }

  const search =
    filters.search &&
    normalizeSearchValue(
      filters.search,
    );

  if (search) {
    const searchableText = [
      order.id,
      order.orderNumber,
      order.status,
      order.buyer.displayName,
      order.buyer.email,
      order.buyer.walletAddress,
      order.seller.displayName,
      order.seller.storeName,
      ...order.items.flatMap(
        (item) => [
          item.productId,
          item.snapshot.sku,
          item.snapshot.title,
        ],
      ),
    ]
      .filter(
        (value): value is string =>
          typeof value === "string",
      )
      .join(" ")
      .toLowerCase();

    if (
      !searchableText.includes(search)
    ) {
      return false;
    }
  }

  return true;
}

function sortOrders(
  first: MarketplaceOrder,
  second: MarketplaceOrder,
) {
  return (
    new Date(
      second.updatedAt,
    ).getTime() -
    new Date(
      first.updatedAt,
    ).getTime()
  );
}

function appendTimelineEvent(
  order: MarketplaceOrder,
  event:
    | OrderTimelineEvent
    | null,
) {
  if (!event) {
    return order.timeline;
  }

  return [
    ...order.timeline,
    event,
  ];
}

export const browserOrderRepository: OrderRepository =
  {
    async create(input) {
      const order =
        createMarketplaceOrder(input);

      return saveOrder(order);
    },

    async findById(orderId) {
      return (
        readOrders()[orderId] ??
        null
      );
    },

    async findByOrderNumber(
      orderNumber,
    ) {
      return (
        Object.values(
          readOrders(),
        ).find(
          (order) =>
            order.orderNumber ===
            orderNumber,
        ) ?? null
      );
    },

    async findAll(filters) {
      return Object.values(
        readOrders(),
      )
        .filter((order) =>
          matchesFilters(
            order,
            filters,
          ),
        )
        .sort(sortOrders);
    },

    async count(filters) {
      const orders =
        await this.findAll(filters);

      return orders.length;
    },

    async updateStatus(input) {
      const order =
        requireOrder(input.orderId);

      if (
        order.status !== input.status &&
        !canTransitionOrderStatus(
          order.status,
          input.status,
        )
      ) {
        const allowedTransitions =
          allowedOrderTransitions[
            order.status
          ];

        throw new Error(
          allowedTransitions.length > 0
            ? `Order status cannot move from "${order.status}" to "${input.status}". Allowed transitions: ${allowedTransitions.join(", ")}.`
            : `Order status "${order.status}" is terminal and cannot be changed.`,
        );
      }

      const event =
        getTimelineEventForStatus(
          order,
          input.status,
          input.note,
          input.actor,
        );

      const completionFields =
        getCompletionFields(
          input.status,
        );

      return saveOrder({
        ...order,
        status: input.status,

        timeline:
          appendTimelineEvent(
            order,
            event,
          ),

        completedAt:
          completionFields.completedAt ??
          order.completedAt,

        cancelledAt:
          completionFields.cancelledAt ??
          order.cancelledAt,
      });
    },

    async updatePayment(input) {
      const order =
        requireOrder(input.orderId);

      const timelineEvent =
        input.timelineEvent
          ? {
              id: createOrderEventId(
                order.id,
                input.timelineEvent.type,
              ),

              orderId: order.id,

              type:
                input.timelineEvent.type,

              title:
                input.timelineEvent.title,

              description:
                input.timelineEvent.description,

              occurredAt:
                new Date().toISOString(),

              actor:
                input.timelineEvent.actor ??
                {
                  type: "system",
                  displayName:
                    "TrustVault",
                },
            }
          : null;

      return saveOrder({
        ...order,

        payment: {
          ...order.payment,
          ...input.payment,
        },

        timeline:
          appendTimelineEvent(
            order,
            timelineEvent,
          ),
      });
    },

    async updateEscrow(input) {
      const order =
        requireOrder(input.orderId);

      const timelineEvent =
        input.timelineEvent
          ? {
              id: createOrderEventId(
                order.id,
                input.timelineEvent.type,
              ),

              orderId: order.id,

              type:
                input.timelineEvent.type,

              title:
                input.timelineEvent.title,

              description:
                input.timelineEvent.description,

              occurredAt:
                new Date().toISOString(),

              actor:
                input.timelineEvent.actor ??
                {
                  type: "system",
                  displayName:
                    "TrustVault",
                },
            }
          : null;

      return saveOrder({
        ...order,

        escrow: {
          ...order.escrow,
          ...input.escrow,
        },

        timeline:
          appendTimelineEvent(
            order,
            timelineEvent,
          ),
      });
    },

    async updateFulfillment(input) {
      const order =
        requireOrder(input.orderId);

      const timelineEvent =
        input.timelineEvent
          ? {
              id: createOrderEventId(
                order.id,
                input.timelineEvent.type,
              ),

              orderId: order.id,

              type:
                input.timelineEvent.type,

              title:
                input.timelineEvent.title,

              description:
                input.timelineEvent.description,

              occurredAt:
                new Date().toISOString(),

              actor:
                input.timelineEvent.actor ??
                {
                  type: "system",
                  displayName:
                    "TrustVault",
                },
            }
          : null;

      return saveOrder({
        ...order,

        fulfillment: {
          ...order.fulfillment,
          ...input.fulfillment,
        },

        timeline:
          appendTimelineEvent(
            order,
            timelineEvent,
          ),
      });
    },

    async updateDeliveryConfirmation(
      input,
    ) {
      const order =
        requireOrder(input.orderId);

      const timelineEvent =
        input.timelineEvent
          ? {
              id: createOrderEventId(
                order.id,
                input.timelineEvent.type,
              ),

              orderId: order.id,

              type:
                input.timelineEvent.type,

              title:
                input.timelineEvent.title,

              description:
                input.timelineEvent.description,

              occurredAt:
                new Date().toISOString(),

              actor:
                input.timelineEvent.actor ??
                {
                  type: "system",
                  displayName:
                    "TrustVault",
                },
            }
          : null;

      return saveOrder({
        ...order,

        deliveryConfirmation: {
          ...order.deliveryConfirmation,
          ...input.deliveryConfirmation,
        },

        timeline:
          appendTimelineEvent(
            order,
            timelineEvent,
          ),
      });
    },

    async updateRefund(input) {
      const order =
        requireOrder(input.orderId);

      const timelineEvent =
        input.timelineEvent
          ? {
              id: createOrderEventId(
                order.id,
                input.timelineEvent.type,
              ),

              orderId: order.id,

              type:
                input.timelineEvent.type,

              title:
                input.timelineEvent.title,

              description:
                input.timelineEvent.description,

              occurredAt:
                new Date().toISOString(),

              actor:
                input.timelineEvent.actor ??
                {
                  type: "system",
                  displayName:
                    "TrustVault",
                },
            }
          : null;

      return saveOrder({
        ...order,

        refund: {
          ...order.refund,
          ...input.refund,
        },

        timeline:
          appendTimelineEvent(
            order,
            timelineEvent,
          ),
      });
    },

    async attachReceipt(input) {
      const order =
        requireOrder(input.orderId);

      return saveOrder({
        ...order,
        receipt: input.receipt,
      });
    },

    async addTimelineEvent(
      orderId,
      event,
    ) {
      const order =
        requireOrder(orderId);

      const timelineEvent: OrderTimelineEvent =
        {
          ...event,

          id: createOrderEventId(
            order.id,
            event.type,
          ),

          orderId: order.id,

          occurredAt:
            event.occurredAt ??
            new Date().toISOString(),
        };

      return saveOrder({
        ...order,

        timeline: [
          ...order.timeline,
          timelineEvent,
        ],
      });
    },

    async remove(orderId) {
      const orders = readOrders();

      delete orders[orderId];

      writeOrders(orders);
    },

    async clear() {
      if (!isBrowser()) {
        throw new Error(
          "Marketplace order storage is unavailable during server rendering.",
        );
      }

      window.localStorage.removeItem(
        STORAGE_KEY,
      );

      window.localStorage.removeItem(
        ORDER_SEQUENCE_KEY,
      );
    },
  };

export function getOrderStorageKey() {
  return STORAGE_KEY;
}

export function subscribeToOrderSyncUpdates(
  listener: (
    update: MarketplaceOrderSyncUpdate,
  ) => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  function handleSyncEvent(
    event: Event,
  ) {
    const customEvent =
      event as CustomEvent<
        MarketplaceOrderSyncUpdate
      >;

    listener(customEvent.detail);
  }

  window.addEventListener(
    ORDER_SYNC_UPDATED_EVENT,
    handleSyncEvent,
  );

  return () => {
    window.removeEventListener(
      ORDER_SYNC_UPDATED_EVENT,
      handleSyncEvent,
    );
  };
}

export function subscribeToOrderUpdates(
  listener: (
    order: MarketplaceOrder,
  ) => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  function handleCustomEvent(
    event: Event,
  ) {
    const customEvent =
      event as CustomEvent<
        MarketplaceOrder
      >;

    listener(customEvent.detail);
  }

  function handleStorageEvent(
    event: StorageEvent,
  ) {
    if (
      event.key !== STORAGE_KEY
    ) {
      return;
    }

    const orders =
      Object.values(
        readOrders(),
      ).sort(sortOrders);

    const latestOrder =
      orders[0];

    if (latestOrder) {
      listener(latestOrder);
    }
  }

  window.addEventListener(
    ORDER_UPDATED_EVENT,
    handleCustomEvent,
  );

  window.addEventListener(
    "storage",
    handleStorageEvent,
  );

  return () => {
    window.removeEventListener(
      ORDER_UPDATED_EVENT,
      handleCustomEvent,
    );

    window.removeEventListener(
      "storage",
      handleStorageEvent,
    );
  };
}

export function createOrderItemFromCartSnapshot(input: {
  orderId?: OrderId;
  itemId?: string;

  productId: string;
  variantId?: string;

  quantity: number;

  sku: string;
  title: string;
  slug: string;
  coverImageSrc?: string;

  selectedOptions?: Record<string, string>;

  unitPriceAmount: string;

  gift?: MarketplaceOrderItem["gift"];
  shipping?: MarketplaceOrderItem["shipping"];
}): MarketplaceOrderItem {
  const orderId =
    input.orderId ?? "pending-order";

  const createdAt =
    new Date().toISOString();

  const unitPrice = {
    amount:
      input.unitPriceAmount,
    currency: "USDC" as const,
  };

  return {
    id:
      input.itemId ??
      `${orderId}-item-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

    orderId,

    productId:
      input.productId,

    variantId:
      input.variantId,

    quantity:
      input.quantity,

    snapshot: {
      productId:
        input.productId,

      sku:
        input.sku,

      title:
        input.title,

      slug:
        input.slug,

      coverImageSrc:
        input.coverImageSrc,

      selectedOptions:
        input.selectedOptions,

      unitPrice,
    },

    gift:
      input.gift,

    shipping:
      input.shipping,

    subtotal: {
      amount:
        normalizeAmount(
          getNumericAmount(
            input.unitPriceAmount,
          ) * input.quantity,
        ),

      currency: "USDC",
    },

    createdAt,
  };
}


