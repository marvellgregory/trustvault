import type {
  CartGiftOptions,
  CartShippingSelection,
  CartTotals,
} from "@/lib/marketplace/cart-types";
import type {
  ProductId,
  ProductPrice,
  ProductSku,
  SellerId,
} from "@/lib/marketplace/product-types";

export type OrderId = string;
export type OrderItemId = string;
export type OrderEventId = string;

export type OrderStatus =
  | "draft"
  | "pending-payment"
  | "payment-processing"
  | "paid"
  | "escrow-funded"
  | "processing"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refund-requested"
  | "partially-refunded"
  | "refunded"
  | "disputed";

export type PaymentStatus =
  | "not-started"
  | "estimating"
  | "awaiting-signature"
  | "submitted"
  | "confirmed"
  | "failed"
  | "refunded";

export type EscrowStatus =
  | "not-required"
  | "pending"
  | "funded"
  | "release-pending"
  | "released"
  | "refund-pending"
  | "refunded"
  | "disputed";

export type FulfillmentStatus =
  | "not-required"
  | "unfulfilled"
  | "processing"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "returned";

export type DeliveryConfirmationStatus =
  | "not-required"
  | "pending"
  | "buyer-confirmed"
  | "auto-confirmed"
  | "disputed";

export type RefundStatus =
  | "none"
  | "requested"
  | "approved"
  | "processing"
  | "partially-refunded"
  | "refunded"
  | "rejected";

export type OrderAddress = {
  fullName: string;
  phone?: string;
  email?: string;

  addressLine1: string;
  addressLine2?: string;

  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type OrderBuyer = {
  userId?: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
};

export type OrderSeller = {
  id: SellerId;
  displayName: string;
  storeName?: string;
  walletAddress?: string;
  verified: boolean;
};

export type OrderItemSnapshot = {
  productId: ProductId;
  sku: ProductSku;
  title: string;
  slug: string;
  coverImageSrc?: string;
  selectedOptions?: Record<string, string>;
  unitPrice: ProductPrice;
};

export type MarketplaceOrderItem = {
  id: OrderItemId;
  orderId: OrderId;

  productId: ProductId;
  variantId?: string;

  quantity: number;

  snapshot: OrderItemSnapshot;

  gift?: CartGiftOptions;
  shipping?: CartShippingSelection;

  subtotal: ProductPrice;

  createdAt: string;
};

export type OrderPayment = {
  status: PaymentStatus;

  network: string;
  chainId: number;
  asset: "USDC";

  payerWallet: string;
  recipientWallet?: string;

  amount: ProductPrice;
  estimatedFee?: ProductPrice;

  transactionHash?: string;
  explorerUrl?: string;

  submittedAt?: string;
  confirmedAt?: string;

  errorCode?: string;
  errorMessage?: string;
};

export type OrderEscrow = {
  required: boolean;
  status: EscrowStatus;

  contractAddress?: string;

  depositTransactionHash?: string;
  releaseTransactionHash?: string;
  refundTransactionHash?: string;

  fundedAt?: string;
  releaseEligibleAt?: string;
  releasedAt?: string;
  refundedAt?: string;

  disputeId?: string;
};

export type OrderFulfillment = {
  status: FulfillmentStatus;

  carrier?: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;

  shippedAt?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
};

export type OrderDeliveryConfirmation = {
  status: DeliveryConfirmationStatus;

  requestedAt?: string;
  confirmedAt?: string;
  autoConfirmationAt?: string;

  confirmedBy?: string;
};

export type OrderRefund = {
  status: RefundStatus;

  amount?: ProductPrice;
  reason?: string;

  requestedAt?: string;
  approvedAt?: string;
  completedAt?: string;

  transactionHash?: string;
  explorerUrl?: string;
};

export type OrderReceiptReference = {
  receiptId: string;
  receiptPath: string;
  createdAt: string;
};

export type OrderEventType =
  | "order-created"
  | "payment-started"
  | "payment-submitted"
  | "payment-confirmed"
  | "escrow-funded"
  | "processing-started"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "delivery-confirmed"
  | "escrow-released"
  | "completed"
  | "cancelled"
  | "refund-requested"
  | "refund-approved"
  | "refund-completed"
  | "dispute-opened"
  | "dispute-resolved";

export type OrderTimelineEvent = {
  id: OrderEventId;
  orderId: OrderId;
  type: OrderEventType;

  title: string;
  description?: string;

  occurredAt: string;

  actor?: {
    type:
      | "buyer"
      | "seller"
      | "system"
      | "admin";
    id?: string;
    displayName?: string;
  };

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type MarketplaceOrder = {
  id: OrderId;
  orderNumber: string;

  status: OrderStatus;

  buyer: OrderBuyer;
  seller: OrderSeller;

  items: MarketplaceOrderItem[];

  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;

  totals: CartTotals;

  payment: OrderPayment;
  escrow: OrderEscrow;
  fulfillment: OrderFulfillment;
  deliveryConfirmation: OrderDeliveryConfirmation;
  refund: OrderRefund;

  timeline: OrderTimelineEvent[];

  receipt?: OrderReceiptReference;

  notes?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
};

export type CreateMarketplaceOrderInput = {
  cartId: string;

  buyer: OrderBuyer;
  seller: OrderSeller;

  items: MarketplaceOrderItem[];

  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;

  totals: CartTotals;

  network: string;
  chainId: number;
};

export type UpdateOrderStatusInput = {
  orderId: OrderId;
  status: OrderStatus;
  note?: string;
  actor?: OrderTimelineEvent["actor"];
};

export type OrderValidationIssue = {
  field?: string;
  code:
    | "missing-items"
    | "invalid-total"
    | "missing-buyer-wallet"
    | "missing-seller"
    | "missing-shipping-address"
    | "invalid-payment-state"
    | "invalid-escrow-state"
    | "invalid-status-transition";
  message: string;
  severity: "warning" | "error";
};

export type OrderValidationResult = {
  valid: boolean;
  issues: OrderValidationIssue[];
};

export const allowedOrderTransitions: Record<
  OrderStatus,
  OrderStatus[]
> = {
  draft: [
    "pending-payment",
    "cancelled",
  ],

  "pending-payment": [
    "payment-processing",
    "cancelled",
  ],

  "payment-processing": [
    "paid",
    "cancelled",
  ],

  paid: [
    "escrow-funded",
    "processing",
    "refund-requested",
    "cancelled",
  ],

  "escrow-funded": [
    "processing",
    "refund-requested",
    "disputed",
  ],

  processing: [
    "packed",
    "cancelled",
    "refund-requested",
  ],

  packed: [
    "shipped",
    "cancelled",
  ],

  shipped: [
    "out-for-delivery",
    "delivered",
    "disputed",
  ],

  "out-for-delivery": [
    "delivered",
    "disputed",
  ],

  delivered: [
    "completed",
    "refund-requested",
    "disputed",
  ],

  completed: [
    "refund-requested",
    "partially-refunded",
    "refunded",
  ],

  cancelled: [],

  "refund-requested": [
    "partially-refunded",
    "refunded",
    "completed",
  ],

  "partially-refunded": [
    "refunded",
    "completed",
  ],

  refunded: [],

  disputed: [
    "completed",
    "refunded",
    "partially-refunded",
    "cancelled",
  ],
};

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return allowedOrderTransitions[
    currentStatus
  ].includes(nextStatus);
}

export function createOrderEventId(
  orderId: OrderId,
  eventType: OrderEventType,
) {
  return `${orderId}-${eventType}-${Date.now()}`;
}

export function calculateOrderItemSubtotal(
  unitPrice: ProductPrice,
  quantity: number,
): ProductPrice {
  const numericPrice = Number(unitPrice.amount);

  const total =
    Number.isFinite(numericPrice) && quantity > 0
      ? numericPrice * quantity
      : 0;

  return {
    amount: total.toFixed(6).replace(/\.?0+$/, ""),
    currency: "USDC",
  };
}

export function isOrderTerminal(
  status: OrderStatus,
) {
  return [
    "completed",
    "cancelled",
    "refunded",
  ].includes(status);
}
