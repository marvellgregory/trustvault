import assert from "node:assert/strict";
import test from "node:test";

const {
  getMarketplaceReceipt,
  listMarketplaceReceipts,
  saveMarketplaceReceipt,
  validateReceiptForPersistence,
} = await import(
  "./marketplace-receipt.cjs"
);

const customerId =
  "tvc_11111111111111111111111111111111";

const walletAddress =
  "0x1111111111111111111111111111111111111111";

const receiptId =
  "purchase:0xabcdef1234567890";

function session(
  overrides = {},
) {
  return {
    customerId,
    walletAddress,
    ...overrides,
  };
}

function receipt(
  overrides = {},
) {
  return {
    id:
      receiptId,

    displayId:
      "TV-20260821-000001",

    type:
      "purchase",

    status:
      "confirmed",

    title:
      "Marketplace purchase completed",

    description:
      "Test receipt",

    amount:
      "10",

    asset:
      "USDC",

    senderAddress:
      walletAddress,

    recipientName:
      "Test Seller",

    recipientAddress:
      "0x2222222222222222222222222222222222222222",

    network:
      "Arc Testnet",

    environment:
      "testnet",

    transactionHash:
      "0xabcdef1234567890",

    explorerUrl:
      "https://example.test/tx/0xabcdef1234567890",

    createdAt:
      "2026-08-21T00:00:00.000Z",

    confirmedAt:
      "2026-08-21T00:00:00.000Z",

    orderId:
      "order_test_1",

    customer: {
      walletAddress,
    },

    seller: {
      displayName:
        "Test Seller",
    },

    timeline:
      [],

    privacy:
      {},

    metadata:
      {
        receiptVersion:
          "2",
      },

    ...overrides,
  };
}

test(
  "validates receipt ownership from authenticated session",
  () => {
    const result =
      validateReceiptForPersistence(
        session(),
        receiptId,
        receipt(),
      );

    assert.equal(
      result.customerId,
      customerId,
    );

    assert.equal(
      result.receiptId,
      receiptId,
    );
  },
);

test(
  "rejects unauthenticated receipt persistence",
  () => {
    assert.throws(
      () =>
        validateReceiptForPersistence(
          {},
          receiptId,
          receipt(),
        ),
      /authenticated customer session/i,
    );
  },
);

test(
  "rejects path and receipt identifier mismatch",
  () => {
    assert.throws(
      () =>
        validateReceiptForPersistence(
          session(),
          "purchase:other",
          receipt(),
        ),
      /does not match/i,
    );
  },
);

test(
  "rejects receipt wallet impersonation",
  () => {
    assert.throws(
      () =>
        validateReceiptForPersistence(
          session(),
          receiptId,
          receipt({
            senderAddress:
              "0x2222222222222222222222222222222222222222",
          }),
        ),
      /authenticated wallet/i,
    );
  },
);

test(
  "persists receipt under authenticated customer partition",
  async () => {
    let request;

    const saved =
      await saveMarketplaceReceipt(
        session(),
        receiptId,
        receipt(),
        {
          putItem:
            async (input) => {
              request =
                input;
            },

          now:
            () =>
              new Date(
                "2026-08-21T01:00:00.000Z",
              ),
        },
      );

    assert.equal(
      saved.id,
      receiptId,
    );

    assert.equal(
      request.Item.PK.S,
      `CUSTOMER#${customerId}`,
    );

    assert.equal(
      request.Item.SK.S,
      `RECEIPT#${receiptId}`,
    );

    assert.equal(
      request.Item.entityType.S,
      "MARKETPLACE_RECEIPT",
    );
  },
);

test(
  "authenticated customer can retrieve persisted receipt",
  async () => {
    const source =
      receipt();

    const result =
      await getMarketplaceReceipt(
        session(),
        receiptId,
        {
          getItem:
            async () => ({
              Item: {
                PK: {
                  S:
                    `CUSTOMER#${customerId}`,
                },

                SK: {
                  S:
                    `RECEIPT#${receiptId}`,
                },

                entityType: {
                  S:
                    "MARKETPLACE_RECEIPT",
                },

                customerId: {
                  S:
                    customerId,
                },

                receiptId: {
                  S:
                    receiptId,
                },

                receiptJson: {
                  S:
                    JSON.stringify(
                      source,
                    ),
                },
              },
            }),
        },
      );

    assert.equal(
      result.id,
      receiptId,
    );
  },
);

test(
  "customer cannot retrieve another customer receipt",
  async () => {
    const otherCustomer =
      "tvc_22222222222222222222222222222222";

    await assert.rejects(
      getMarketplaceReceipt(
        session(),
        receiptId,
        {
          getItem:
            async () => ({
              Item: {
                entityType: {
                  S:
                    "MARKETPLACE_RECEIPT",
                },

                customerId: {
                  S:
                    otherCustomer,
                },

                receiptId: {
                  S:
                    receiptId,
                },

                receiptJson: {
                  S:
                    JSON.stringify(
                      receipt(),
                    ),
                },
              },
            }),
        },
      ),
      /not found/i,
    );
  },
);

test(
  "lists authenticated customer receipts newest first",
  async () => {
    const older =
      receipt({
        id:
          "purchase:older",
        createdAt:
          "2026-08-20T00:00:00.000Z",
      });

    const newer =
      receipt({
        id:
          "purchase:newer",
        createdAt:
          "2026-08-21T00:00:00.000Z",
      });

    const item =
      (value) => ({
        entityType: {
          S:
            "MARKETPLACE_RECEIPT",
        },

        customerId: {
          S:
            customerId,
        },

        receiptId: {
          S:
            value.id,
        },

        receiptJson: {
          S:
            JSON.stringify(
              value,
            ),
        },
      });

    const result =
      await listMarketplaceReceipts(
        session(),
        {
          query:
            async () => ({
              Items: [
                item(older),
                item(newer),
              ],
            }),
        },
      );

    assert.deepEqual(
      result.map(
        (value) =>
          value.id,
      ),
      [
        "purchase:newer",
        "purchase:older",
      ],
    );
  },
);

test(
  "missing receipt returns null",
  async () => {
    const result =
      await getMarketplaceReceipt(
        session(),
        receiptId,
        {
          getItem:
            async () => ({}),
        },
      );

    assert.equal(
      result,
      null,
    );
  },
);
