import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  MarketplaceOrderError,
  getMarketplaceOrder,
  listMarketplaceOrders,
  saveMarketplaceOrder,
  validateOrderForPersistence,
} = require("./marketplace-order.cjs");

const CUSTOMER_ID = "tvc_11111111111111111111111111111111";
const WALLET = "0x1111111111111111111111111111111111111111";
const OTHER_WALLET = "0x2222222222222222222222222222222222222222";
const NOW = new Date("2026-08-21T00:30:00.000Z");

const session = {
  customerId: CUSTOMER_ID,
  walletAddress: WALLET,
  chainId: 5_042_002,
};

function validOrder() {
  return {
    id: "order-1724200000000-test",
    orderNumber: "TV-20260821-000001",
    status: "pending-payment",
    buyer: {
      walletAddress: WALLET,
    },
    seller: {
      id: "seller-demo",
      displayName: "Demo Seller",
      verified: true,
    },
    items: [
      {
        id: "item-1",
        orderId: "order-1724200000000-test",
        productId: "product-1",
        quantity: 1,
        snapshot: {
          productId: "product-1",
          sku: "SKU-1",
          title: "Demo Product",
          slug: "demo-product",
          unitPrice: {
            amount: "10",
            currency: "USDC",
          },
        },
        subtotal: {
          amount: "10",
          currency: "USDC",
        },
        createdAt: "2026-08-21T00:00:00.000Z",
      },
    ],
    totals: {
      subtotal: { amount: "10", currency: "USDC" },
      shipping: { amount: "0", currency: "USDC" },
      tax: { amount: "0", currency: "USDC" },
      discount: { amount: "0", currency: "USDC" },
      total: { amount: "10", currency: "USDC" },
    },
    payment: {
      status: "not-started",
      network: "Arc Testnet",
      chainId: 5_042_002,
      asset: "USDC",
      payerWallet: WALLET,
      amount: { amount: "10", currency: "USDC" },
    },
    escrow: {
      required: false,
      status: "not-required",
    },
    fulfillment: {
      status: "unfulfilled",
    },
    deliveryConfirmation: {
      status: "pending",
    },
    refund: {
      status: "none",
    },
    timeline: [],
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
  };
}

test("order validation derives customer ownership from authenticated session", () => {
  const result = validateOrderForPersistence(session, validOrder());

  assert.equal(result.customerId, CUSTOMER_ID);
  assert.equal(result.walletAddress, WALLET.toLowerCase());
  assert.equal(result.order.buyer.userId, CUSTOMER_ID);
});

test("order validation rejects unauthenticated sessions", () => {
  assert.throws(
    () => validateOrderForPersistence({}, validOrder()),
    (error) =>
      error instanceof MarketplaceOrderError &&
      error.statusCode === 401 &&
      error.code === "ORDER_AUTHENTICATION_REQUIRED",
  );
});

test("order validation rejects a buyer wallet that differs from authenticated wallet", () => {
  const order = validOrder();
  order.buyer.walletAddress = OTHER_WALLET;

  assert.throws(
    () => validateOrderForPersistence(session, order),
    (error) =>
      error instanceof MarketplaceOrderError &&
      error.statusCode === 403 &&
      error.code === "ORDER_OWNERSHIP_MISMATCH",
  );
});

test("order validation rejects payer impersonation", () => {
  const order = validOrder();
  order.payment.payerWallet = OTHER_WALLET;

  assert.throws(
    () => validateOrderForPersistence(session, order),
    (error) =>
      error instanceof MarketplaceOrderError &&
      error.statusCode === 400 &&
      error.code === "INVALID_MARKETPLACE_ORDER",
  );
});

test("valid marketplace order persists under authenticated customer partition", async () => {
  const writes = [];

  const saved = await saveMarketplaceOrder(
    session,
    validOrder(),
    {
      now: () => NOW,
      putItem: async (input) => {
        writes.push(input);
        return {};
      },
    },
  );

  assert.equal(writes.length, 1);
  assert.equal(writes[0].TableName, "TrustVaultPilot");
  assert.equal(writes[0].Item.PK.S, `CUSTOMER#${CUSTOMER_ID}`);
  assert.equal(writes[0].Item.SK.S, `ORDER#${saved.id}`);
  assert.equal(writes[0].Item.entityType.S, "MARKETPLACE_ORDER");
  assert.equal(saved.buyer.userId, CUSTOMER_ID);
  assert.equal(saved.updatedAt, NOW.toISOString());
});

test("authenticated customer can retrieve their persisted order", async () => {
  const order = validOrder();
  order.buyer.userId = CUSTOMER_ID;

  const loaded = await getMarketplaceOrder(
    session,
    order.id,
    {
      getItem: async (input) => {
        assert.equal(input.Key.PK.S, `CUSTOMER#${CUSTOMER_ID}`);
        assert.equal(input.Key.SK.S, `ORDER#${order.id}`);

        return {
          Item: {
            PK: { S: `CUSTOMER#${CUSTOMER_ID}` },
            SK: { S: `ORDER#${order.id}` },
            entityType: { S: "MARKETPLACE_ORDER" },
            customerId: { S: CUSTOMER_ID },
            orderId: { S: order.id },
            orderJson: { S: JSON.stringify(order) },
          },
        };
      },
    },
  );

  assert.equal(loaded.id, order.id);
  assert.equal(loaded.buyer.userId, CUSTOMER_ID);
});

test("customer cannot retrieve an order stored for another customer", async () => {
  const order = validOrder();
  order.buyer.userId = "tvc_22222222222222222222222222222222";

  await assert.rejects(
    () =>
      getMarketplaceOrder(
        session,
        order.id,
        {
          getItem: async () => ({
            Item: {
              entityType: { S: "MARKETPLACE_ORDER" },
              customerId: { S: "tvc_22222222222222222222222222222222" },
              orderJson: { S: JSON.stringify(order) },
            },
          }),
        },
      ),
    (error) =>
      error instanceof MarketplaceOrderError &&
      error.statusCode === 404 &&
      error.code === "MARKETPLACE_ORDER_NOT_FOUND",
  );
});

test("Marketplace order collection queries only the authenticated customer partition", async () => {
  const older = validOrder();
  older.id = "order-1724200000000-older";
  older.buyer.userId = CUSTOMER_ID;
  older.createdAt =
    "2026-08-20T00:00:00.000Z";
  older.updatedAt =
    "2026-08-20T00:00:00.000Z";

  const newer = validOrder();
  newer.id = "order-1724200000000-newer";
  newer.buyer.userId = CUSTOMER_ID;
  newer.createdAt =
    "2026-08-21T00:00:00.000Z";
  newer.updatedAt =
    "2026-08-21T00:00:00.000Z";

  const queries = [];

  const orders =
    await listMarketplaceOrders(
      session,
      {
        query: async (input) => {
          queries.push(input);

          return {
            Items: [
              {
                entityType: {
                  S: "MARKETPLACE_ORDER",
                },
                customerId: {
                  S: CUSTOMER_ID,
                },
                orderJson: {
                  S: JSON.stringify(older),
                },
              },
              {
                entityType: {
                  S: "MARKETPLACE_ORDER",
                },
                customerId: {
                  S: CUSTOMER_ID,
                },
                orderJson: {
                  S: JSON.stringify(newer),
                },
              },
            ],
          };
        },
      },
    );

  assert.equal(
    queries.length,
    1,
  );

  assert.equal(
    queries[0]
      .ExpressionAttributeValues[
        ":customerPk"
      ].S,
    `CUSTOMER#${CUSTOMER_ID}`,
  );

  assert.equal(
    queries[0]
      .ExpressionAttributeValues[
        ":orderPrefix"
      ].S,
    "ORDER#",
  );

  assert.match(
    queries[0].KeyConditionExpression,
    /begins_with\(SK,\s*:orderPrefix\)/,
  );

  assert.deepEqual(
    orders.map((order) => order.id),
    [
      newer.id,
      older.id,
    ],
    "Marketplace collection must return newest orders first",
  );
});

test("Marketplace order collection requires authenticated session", async () => {
  await assert.rejects(
    () =>
      listMarketplaceOrders(
        {},
        {
          query: async () => ({
            Items: [],
          }),
        },
      ),
    (error) =>
      error instanceof MarketplaceOrderError &&
      error.statusCode === 401 &&
      error.code ===
        "ORDER_AUTHENTICATION_REQUIRED",
  );
});

test("Marketplace order collection rejects persisted orders owned by another customer", async () => {
  const order = validOrder();

  order.buyer.userId =
    "tvc_22222222222222222222222222222222";

  await assert.rejects(
    () =>
      listMarketplaceOrders(
        session,
        {
          query: async () => ({
            Items: [
              {
                entityType: {
                  S: "MARKETPLACE_ORDER",
                },
                customerId: {
                  S: "tvc_22222222222222222222222222222222",
                },
                orderJson: {
                  S: JSON.stringify(order),
                },
              },
            ],
          }),
        },
      ),
    (error) =>
      error instanceof MarketplaceOrderError &&
      error.statusCode === 404 &&
      error.code ===
        "MARKETPLACE_ORDER_NOT_FOUND",
  );
});
