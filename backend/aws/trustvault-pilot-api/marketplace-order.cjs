const TABLE_NAME = "TrustVaultPilot";

const ORDER_ID_PATTERN = /^order-[A-Za-z0-9_-]{1,120}$/;
const CUSTOMER_ID_PATTERN = /^tvc_[a-fA-F0-9]{32}$/;
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const ALLOWED_ORDER_STATUSES = new Set([
  "draft",
  "pending-payment",
  "payment-processing",
  "paid",
  "escrow-funded",
  "processing",
  "packed",
  "shipped",
  "out-for-delivery",
  "delivered",
  "completed",
  "cancelled",
  "refund-requested",
  "partially-refunded",
  "refunded",
  "disputed",
]);

class MarketplaceOrderError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "MarketplaceOrderError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireCustomerId(session) {
  if (!CUSTOMER_ID_PATTERN.test(session?.customerId ?? "")) {
    throw new MarketplaceOrderError(
      401,
      "ORDER_AUTHENTICATION_REQUIRED",
      "An authenticated customer session is required.",
    );
  }

  return session.customerId;
}

function requireSessionWallet(session) {
  if (!EVM_ADDRESS_PATTERN.test(session?.walletAddress ?? "")) {
    throw new MarketplaceOrderError(
      401,
      "ORDER_AUTHENTICATION_REQUIRED",
      "An authenticated customer wallet is required.",
    );
  }

  return session.walletAddress.toLowerCase();
}

function requireOrderId(orderId) {
  if (typeof orderId !== "string" || !ORDER_ID_PATTERN.test(orderId)) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_ORDER_ID",
      "A valid marketplace order identifier is required.",
    );
  }

  return orderId;
}

function isTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateOrderForPersistence(session, input) {
  const customerId = requireCustomerId(session);
  const walletAddress = requireSessionWallet(session);

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "A marketplace order is required.",
    );
  }

  const orderId = requireOrderId(input.id);

  if (
    typeof input.orderNumber !== "string" ||
    input.orderNumber.trim().length === 0 ||
    input.orderNumber.length > 100
  ) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order number is invalid.",
    );
  }

  if (!ALLOWED_ORDER_STATUSES.has(input.status)) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order status is invalid.",
    );
  }

  if (
    !input.buyer ||
    typeof input.buyer !== "object" ||
    !EVM_ADDRESS_PATTERN.test(input.buyer.walletAddress ?? "")
  ) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order buyer is invalid.",
    );
  }

  if (input.buyer.walletAddress.toLowerCase() !== walletAddress) {
    throw new MarketplaceOrderError(
      403,
      "ORDER_OWNERSHIP_MISMATCH",
      "The marketplace order does not belong to the authenticated wallet.",
    );
  }

  if (
    input.buyer.userId !== undefined &&
    input.buyer.userId !== customerId
  ) {
    throw new MarketplaceOrderError(
      403,
      "ORDER_OWNERSHIP_MISMATCH",
      "The marketplace order does not belong to the authenticated customer.",
    );
  }

  if (
    !input.seller ||
    typeof input.seller !== "object" ||
    typeof input.seller.id !== "string" ||
    input.seller.id.trim().length === 0
  ) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order seller is invalid.",
    );
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order must contain at least one item.",
    );
  }

  if (
    !input.payment ||
    typeof input.payment !== "object" ||
    input.payment.asset !== "USDC" ||
    input.payment.chainId !== 5_042_002 ||
    !EVM_ADDRESS_PATTERN.test(input.payment.payerWallet ?? "") ||
    input.payment.payerWallet.toLowerCase() !== walletAddress
  ) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order payment details are invalid.",
    );
  }

  if (
    !isTimestamp(input.createdAt) ||
    !isTimestamp(input.updatedAt)
  ) {
    throw new MarketplaceOrderError(
      400,
      "INVALID_MARKETPLACE_ORDER",
      "The marketplace order timestamps are invalid.",
    );
  }

  const serialized = JSON.stringify(input);

  if (Buffer.byteLength(serialized, "utf8") > 200_000) {
    throw new MarketplaceOrderError(
      413,
      "MARKETPLACE_ORDER_TOO_LARGE",
      "The marketplace order is too large to persist.",
    );
  }

  return {
    customerId,
    walletAddress,
    orderId,
    order: {
      ...input,
      buyer: {
        ...input.buyer,
        userId: customerId,
        walletAddress: session.walletAddress,
      },
      payment: {
        ...input.payment,
        payerWallet: session.walletAddress,
      },
    },
  };
}

function orderFromItem(item, expectedCustomerId) {
  if (
    !item ||
    item.entityType?.S !== "MARKETPLACE_ORDER" ||
    item.customerId?.S !== expectedCustomerId ||
    typeof item.orderJson?.S !== "string"
  ) {
    throw new MarketplaceOrderError(
      404,
      "MARKETPLACE_ORDER_NOT_FOUND",
      "The marketplace order was not found.",
    );
  }

  let order;

  try {
    order = JSON.parse(item.orderJson.S);
  } catch {
    throw new MarketplaceOrderError(
      500,
      "MARKETPLACE_ORDER_INVALID",
      "The persisted marketplace order is invalid.",
    );
  }

  return validatePersistedOrder(order, expectedCustomerId);
}

function validatePersistedOrder(order, expectedCustomerId) {
  if (
    !order ||
    typeof order !== "object" ||
    Array.isArray(order) ||
    !ORDER_ID_PATTERN.test(order.id ?? "") ||
    order.buyer?.userId !== expectedCustomerId ||
    !EVM_ADDRESS_PATTERN.test(order.buyer?.walletAddress ?? "") ||
    !Array.isArray(order.items) ||
    !ALLOWED_ORDER_STATUSES.has(order.status) ||
    !isTimestamp(order.createdAt) ||
    !isTimestamp(order.updatedAt)
  ) {
    throw new MarketplaceOrderError(
      500,
      "MARKETPLACE_ORDER_INVALID",
      "The persisted marketplace order is invalid.",
    );
  }

  return Object.freeze(order);
}

async function saveMarketplaceOrder(session, input, options) {
  const validated = validateOrderForPersistence(session, input);
  const now = options.now ? options.now() : new Date();

  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Marketplace order persistence requires valid server time.");
  }

  const order = {
    ...validated.order,
    updatedAt: now.toISOString(),
  };

  await options.putItem({
    TableName: TABLE_NAME,
    Item: {
      PK: { S: `CUSTOMER#${validated.customerId}` },
      SK: { S: `ORDER#${validated.orderId}` },
      entityType: { S: "MARKETPLACE_ORDER" },
      customerId: { S: validated.customerId },
      orderId: { S: validated.orderId },
      orderNumber: { S: order.orderNumber },
      status: { S: order.status },
      createdAt: { S: order.createdAt },
      updatedAt: { S: order.updatedAt },
      orderJson: { S: JSON.stringify(order) },
    },
  });

  return Object.freeze(order);
}

async function getMarketplaceOrder(session, orderId, options) {
  const customerId = requireCustomerId(session);
  requireSessionWallet(session);
  const validOrderId = requireOrderId(orderId);

  const loaded = await options.getItem({
    TableName: TABLE_NAME,
    Key: {
      PK: { S: `CUSTOMER#${customerId}` },
      SK: { S: `ORDER#${validOrderId}` },
    },
    ConsistentRead: true,
  });

  return orderFromItem(loaded?.Item, customerId);
}

module.exports = {
  MarketplaceOrderError,
  getMarketplaceOrder,
  orderFromItem,
  saveMarketplaceOrder,
  validateOrderForPersistence,
};
