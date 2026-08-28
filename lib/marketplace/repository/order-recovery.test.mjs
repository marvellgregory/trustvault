import assert from "node:assert/strict";
import test from "node:test";

const {
  findMarketplaceOrderWithRecovery,
} = await import("./order-recovery.ts");

function order(overrides = {}) {
  return {
    id: "order-recovery-test",
    orderNumber: "TV-260821-000001",
    status: "pending-payment",
    buyer: {
      walletAddress:
        "0x1111111111111111111111111111111111111111",
    },
    seller: {
      id: "seller-1",
      displayName: "Seller",
      verified: true,
    },
    items: [],
    totals: {},
    payment: {},
    escrow: {},
    fulfillment: {},
    deliveryConfirmation: {},
    refund: {},
    timeline: [],
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
    ...overrides,
  };
}

test("local order hit returns immediately without cloud recovery", async () => {
  const localOrder = order();

  let cloudGets = 0;
  let hydrations = 0;

  const result =
    await findMarketplaceOrderWithRecovery(
      localOrder.id,
      {
        readLocal: () => localOrder,

        loadCloud: async () => {
          cloudGets += 1;

          return {
            state: "persisted",
            order: localOrder,
          };
        },

        hydrateLocal: (cloudOrder) => {
          hydrations += 1;
          return cloudOrder;
        },
      },
    );

  assert.equal(
    result,
    localOrder,
  );

  assert.equal(
    cloudGets,
    0,
    "local hit must not make an AWS GET",
  );

  assert.equal(
    hydrations,
    0,
    "local hit must not rehydrate the cache",
  );
});

test("local miss recovers once from cloud and hydrates local cache", async () => {
  const cloudOrder =
    order();

  let cloudGets = 0;
  let hydrations = 0;
  let hydratedOrder = null;

  const result =
    await findMarketplaceOrderWithRecovery(
      cloudOrder.id,
      {
        readLocal: () => undefined,

        loadCloud: async () => {
          cloudGets += 1;

          return {
            state: "persisted",
            order: cloudOrder,
          };
        },

        hydrateLocal: (recovered) => {
          hydrations += 1;
          hydratedOrder = recovered;
          return recovered;
        },
      },
    );

  assert.equal(
    cloudGets,
    1,
    "local miss must perform exactly one AWS recovery GET",
  );

  assert.equal(
    hydrations,
    1,
    "recovered order must hydrate the local cache exactly once",
  );

  assert.equal(
    hydratedOrder,
    cloudOrder,
  );

  assert.equal(
    result,
    cloudOrder,
  );
});

test("failed cloud recovery returns null and does not hydrate", async () => {
  let hydrations = 0;

  const result =
    await findMarketplaceOrderWithRecovery(
      "order-missing",
      {
        readLocal: () => undefined,

        loadCloud: async () => ({
          state: "failed",
        }),

        hydrateLocal: (recovered) => {
          hydrations += 1;
          return recovered;
        },
      },
    );

  assert.equal(
    result,
    null,
  );

  assert.equal(
    hydrations,
    0,
  );
});
