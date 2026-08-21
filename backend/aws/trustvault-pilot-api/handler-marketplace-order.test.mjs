import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  createAuthHandler,
} = require("./handler.cjs");

const {
  SESSION_COOKIE_NAME,
  createSessionPlan,
} = require("./session.cjs");

const ORIGIN = "https://app.trustvault.example";
const CUSTOMER_ID = "tvc_11111111111111111111111111111111";
const WALLET = "0x1111111111111111111111111111111111111111";
const OTHER_WALLET = "0x2222222222222222222222222222222222222222";
const NOW = new Date("2026-08-21T01:00:00.000Z");

function validOrder() {
  return {
    id: "order-1724200000000-route",
    orderNumber: "TV-20260821-000002",
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
        orderId: "order-1724200000000-route",
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
      amount: {
        amount: "10",
        currency: "USDC",
      },
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

function setup() {
  const plan = createSessionPlan(
    {
      customerId: CUSTOMER_ID,
      normalizedAddress: WALLET,
      chainId: 5_042_002,
    },
    {
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    },
  );

  const sessionItem = plan.transactItem.Put.Item;
  const orders = new Map();

  const getItem = async (input) => {
    const pk = input.Key.PK.S;
    const sk = input.Key.SK?.S;

    if (pk.startsWith("SESSION#")) {
      return { Item: sessionItem };
    }

    if (pk.startsWith("WALLET#")) {
      return {
        Item: {
          customerId: { S: CUSTOMER_ID },
          normalizedAddress: { S: WALLET },
          associationStatus: { S: "VERIFIED" },
        },
      };
    }

    if (
      pk === `CUSTOMER#${CUSTOMER_ID}` &&
      sk === "PROFILE"
    ) {
      return {
        Item: {
          PK: { S: `CUSTOMER#${CUSTOMER_ID}` },
          SK: { S: "PROFILE" },
          entityType: { S: "CUSTOMER" },
          customerId: { S: CUSTOMER_ID },
          status: { S: "ACTIVE" },
          schemaVersion: { N: "1" },
          preferredCurrency: { S: "USDC" },
          createdAt: { S: "2026-08-21T00:00:00.000Z" },
          updatedAt: { S: "2026-08-21T00:00:00.000Z" },
        },
      };
    }

    if (
      pk === `CUSTOMER#${CUSTOMER_ID}` &&
      sk?.startsWith("ORDER#")
    ) {
      return {
        Item: orders.get(`${pk}|${sk}`),
      };
    }

    return {};
  };

  const putItem = async (input) => {
    const pk = input.Item?.PK?.S;
    const sk = input.Item?.SK?.S;

    if (
      pk === `CUSTOMER#${CUSTOMER_ID}` &&
      sk?.startsWith("ORDER#")
    ) {
      orders.set(`${pk}|${sk}`, input.Item);
    }

    return {};
  };

  const query = async (input) => {
    const customerPk =
      input
        .ExpressionAttributeValues?.[
          ":customerPk"
        ]?.S;

    const orderPrefix =
      input
        .ExpressionAttributeValues?.[
          ":orderPrefix"
        ]?.S;

    if (
      customerPk !==
        `CUSTOMER#${CUSTOMER_ID}` ||
      orderPrefix !== "ORDER#"
    ) {
      return {
        Items: [],
      };
    }

    return {
      Items: Array.from(
        orders.values(),
      ).filter(
        (item) =>
          item.PK?.S === customerPk &&
          item.SK?.S?.startsWith(
            orderPrefix,
          ),
      ),
    };
  };

  const handler = createAuthHandler({
    allowedOrigin: ORIGIN,
    domain: "app.trustvault.example",
    now: () => new Date(NOW.getTime() + 1_000),
    getItem,
    putItem,
    query,
    updateItem: async () => ({}),
    transactWriteItems: async () => ({}),
  });

  return {
    handler,
    orders,
    headers: {
      origin: ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${plan.token}`,
    },
  };
}

test("authenticated customer can persist and retrieve a Marketplace order", async () => {
  const state = setup();
  const order = validOrder();

  const created = await state.handler({
    rawPath: `/marketplace/orders/${order.id}`,
    requestContext: {
      http: { method: "PUT" },
    },
    headers: state.headers,
    body: JSON.stringify(order),
  });

  assert.equal(created.statusCode, 201);

  const createdBody = JSON.parse(created.body);

  assert.equal(createdBody.order.id, order.id);
  assert.equal(
    createdBody.order.buyer.userId,
    CUSTOMER_ID,
  );

  assert.equal(state.orders.size, 1);

  const read = await state.handler({
    rawPath: `/marketplace/orders/${order.id}`,
    requestContext: {
      http: { method: "GET" },
    },
    headers: state.headers,
  });

  assert.equal(read.statusCode, 200);

  const readBody = JSON.parse(read.body);

  assert.equal(readBody.order.id, order.id);
  assert.equal(
    readBody.order.buyer.userId,
    CUSTOMER_ID,
  );
});

test("Marketplace order routes require authenticated session", async () => {
  const state = setup();
  const order = validOrder();

  const response = await state.handler({
    rawPath: `/marketplace/orders/${order.id}`,
    requestContext: {
      http: { method: "GET" },
    },
    headers: {
      origin: ORIGIN,
    },
  });

  assert.equal(response.statusCode, 401);
});

test("Marketplace order route rejects path/body identifier mismatch without writing", async () => {
  const state = setup();
  const order = validOrder();

  const response = await state.handler({
    rawPath: "/marketplace/orders/order-1724200000000-different",
    requestContext: {
      http: { method: "PUT" },
    },
    headers: state.headers,
    body: JSON.stringify(order),
  });

  assert.equal(response.statusCode, 400);

  assert.equal(
    JSON.parse(response.body).error.code,
    "ORDER_ID_MISMATCH",
  );

  assert.equal(
    state.orders.size,
    0,
    "ID mismatch must not persist any Marketplace order",
  );
});

test("Marketplace order route rejects buyer wallet impersonation", async () => {
  const state = setup();
  const order = validOrder();

  order.buyer.walletAddress = OTHER_WALLET;

  const response = await state.handler({
    rawPath: `/marketplace/orders/${order.id}`,
    requestContext: {
      http: { method: "PUT" },
    },
    headers: state.headers,
    body: JSON.stringify(order),
  });

  assert.equal(response.statusCode, 403);

  assert.equal(
    JSON.parse(response.body).error.code,
    "ORDER_OWNERSHIP_MISMATCH",
  );
});

test("Marketplace order routes preserve credentialed CORS protection", async () => {
  const state = setup();
  const order = validOrder();

  const response = await state.handler({
    rawPath: `/marketplace/orders/${order.id}`,
    requestContext: {
      http: { method: "GET" },
    },
    headers: {
      ...state.headers,
      origin: "https://evil.example",
    },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(
    response.headers["access-control-allow-origin"],
    ORIGIN,
  );
  assert.notEqual(
    response.headers["access-control-allow-origin"],
    "*",
  );
});




test("authenticated Marketplace collection returns only session customer orders", async () => {
  const state = setup();

  const older = validOrder();
  older.id =
    "order-1724200000000-collection-old";
  older.items[0].orderId =
    older.id;
  older.createdAt =
    "2026-08-20T00:00:00.000Z";
  older.updatedAt =
    "2026-08-20T00:00:00.000Z";

  const newer = validOrder();
  newer.id =
    "order-1724200000000-collection-new";
  newer.items[0].orderId =
    newer.id;
  newer.createdAt =
    "2026-08-21T00:00:00.000Z";
  newer.updatedAt =
    "2026-08-21T00:00:00.000Z";

  for (const order of [
    older,
    newer,
  ]) {
    const response =
      await state.handler({
        rawPath:
          `/marketplace/orders/${order.id}`,
        requestContext: {
          http: {
            method: "PUT",
          },
        },
        headers: state.headers,
        body: JSON.stringify(order),
      });

    assert.equal(
      response.statusCode,
      201,
    );
  }

  const response =
    await state.handler({
      rawPath:
        "/marketplace/orders",
      requestContext: {
        http: {
          method: "GET",
        },
      },
      headers: state.headers,
    });

  assert.equal(
    response.statusCode,
    200,
  );

  const body =
    JSON.parse(response.body);

  assert.equal(
    body.orders.length,
    2,
  );

  assert.deepEqual(
    body.orders.map(
      (order) => order.id,
    ),
    [
      newer.id,
      older.id,
    ],
  );

  assert.ok(
    body.orders.every(
      (order) =>
        order.buyer.userId ===
        CUSTOMER_ID,
    ),
  );
});

test("Marketplace collection route requires authenticated session", async () => {
  const state = setup();

  const response =
    await state.handler({
      rawPath:
        "/marketplace/orders",
      requestContext: {
        http: {
          method: "GET",
        },
      },
      headers: {
        origin: ORIGIN,
      },
    });

  assert.equal(
    response.statusCode,
    401,
  );
});
