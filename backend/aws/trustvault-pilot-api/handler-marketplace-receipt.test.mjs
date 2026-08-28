import assert from "node:assert/strict";
import test from "node:test";

const {
  createAuthHandler,
} = await import("./handler.cjs");

const {
  SESSION_COOKIE_NAME,
  createSessionPlan,
} = await import("./session.cjs");

const customerId =
  "tvc_11111111111111111111111111111111";

const walletAddress =
  "0x1111111111111111111111111111111111111111";

const receiptId =
  "purchase:0xabcdef1234567890";

const allowedOrigin =
  "https://trustvault.example";

function receipt(
  overrides = {},
) {
  return {
    id: receiptId,
    displayId:
      "TV-20260821-000001",
    type: "purchase",
    status: "confirmed",
    title:
      "Marketplace purchase completed",
    description:
      "Test receipt",
    amount: "10",
    asset: "USDC",
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
    timeline: [],
    privacy: {},
    metadata: {
      receiptVersion: "2",
    },
    ...overrides,
  };
}

function authenticatedSession() {
  const plan =
    createSessionPlan(
      {
        customerId,
        normalizedAddress:
          walletAddress,
        chainId:
          5042002,
      },
      {
        now:
          () =>
            new Date(
              "2026-08-21T00:00:00.000Z",
            ),
        randomBytes:
          () =>
            Buffer.alloc(
              32,
              7,
            ),
      },
    );

  return {
    token:
      plan.token,
    item:
      plan.transactItem.Put.Item,
  };
}

function customerProfileItem() {
  return {
    PK: {
      S:
        `CUSTOMER#${customerId}`,
    },
    SK: {
      S: "PROFILE",
    },
    entityType: {
      S: "CUSTOMER_PROFILE",
    },
    customerId: {
      S: customerId,
    },
    status: {
      S: "ACTIVE",
    },
  };
}

function walletAssociationItem() {
  return {
    PK: {
      S:
        `WALLET#${walletAddress}`,
    },
    SK: {
      S: "ASSOCIATION",
    },
    entityType: {
      S: "WALLET_ASSOCIATION",
    },
    customerId: {
      S: customerId,
    },
    normalizedAddress: {
      S: walletAddress,
    },
    associationStatus: {
      S: "VERIFIED",
    },
  };
}
function event(
  method,
  path,
  body,
  sessionToken,
) {
  const effectiveSessionToken =
    sessionToken ??
    authenticatedSession().token;

  return {
    rawPath: path,
    requestContext: {
      http: {
        method,
      },
    },
    headers: {
      origin:
        allowedOrigin,
      cookie:
        `${SESSION_COOKIE_NAME}=${effectiveSessionToken}`,
    },
    ...(body === undefined
      ? {}
      : {
          body:
            JSON.stringify(body),
        }),
  };
}

function fixture(
  overrides = {},
) {
  const calls = {
    put: [],
    get: [],
    query: [],
  };

  const session =
    authenticatedSession();

  const getItem =
    overrides.getItem ??
    (async (input) => {
      calls.get.push(input);

      const pk =
        input?.Key?.PK?.S;

      const sk =
        input?.Key?.SK?.S;

      if (
        pk?.startsWith(
          "SESSION#",
        )
      ) {
        return {
          Item:
            session.item,
        };
      }

      if (
        pk ===
          `CUSTOMER#${customerId}` &&
        sk === "PROFILE"
      ) {
        return {
          Item:
            customerProfileItem(),
        };
      }

      if (
        pk ===
          `WALLET#${walletAddress}` &&
        sk === "ASSOCIATION"
      ) {
        return {
          Item:
            walletAssociationItem(),
        };
      }

      return {};
    });

  const handler =
    createAuthHandler({
      putItem:
        overrides.putItem ??
        (async (input) => {
          calls.put.push(input);
          return {};
        }),

      getItem,

      query:
        overrides.query ??
        (async (input) => {
          calls.query.push(input);
          return {
            Items: [],
          };
        }),

      transactWriteItems:
        async () => ({}),

      updateItem:
        async () => ({}),

      domain:
        "trustvault.example",

      allowedOrigin,

      now:
        () =>
          new Date(
            "2026-08-21T01:00:00.000Z",
          ),
    });

  return {
    handler,
    calls,
    sessionToken:
      session.token,
  };
}

test(
  "Marketplace receipt collection route requires GET",
  async () => {
    const {
      handler,
    } = fixture();

    const response =
      await handler(
        event(
          "POST",
          "/marketplace/receipts",
        ),
      );

    assert.equal(
      response.statusCode,
      405,
    );
  },
);

test(
  "Marketplace receipt collection requires authenticated session",
  async () => {
    const {
      handler,
    } = fixture({
      getItem:
        async () => ({}),
    });

    const response =
      await handler(
        event(
          "GET",
          "/marketplace/receipts",
        ),
      );

    assert.equal(
      response.statusCode,
      401,
    );
  },
);

test(
  "authenticated Marketplace receipt collection returns receipts",
  async () => {
    const source =
      receipt();

    const {
      handler,
    } = fixture({
      query:
        async () => ({
          Items: [
            {
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
          ],
        }),
    });

    const response =
      await handler(
        event(
          "GET",
          "/marketplace/receipts",
        ),
      );

    assert.equal(
      response.statusCode,
      200,
    );

    const body =
      JSON.parse(
        response.body,
      );

    assert.equal(
      body.receipts.length,
      1,
    );

    assert.equal(
      body.receipts[0].id,
      receiptId,
    );
  },
);

test(
  "authenticated customer can persist Marketplace receipt",
  async () => {
    const {
      handler,
      calls,
    } = fixture();

    const response =
      await handler(
        event(
          "PUT",
          `/marketplace/receipts/${encodeURIComponent(
            receiptId,
          )}`,
          receipt(),
        ),
      );

    assert.equal(
      response.statusCode,
      201,
    );

    assert.equal(
      calls.put.length,
      1,
    );

    assert.equal(
      calls.put[0].Item.PK.S,
      `CUSTOMER#${customerId}`,
    );

    assert.equal(
      calls.put[0].Item.SK.S,
      `RECEIPT#${receiptId}`,
    );
  },
);

test(
  "receipt route rejects path and body identifier mismatch",
  async () => {
    const {
      handler,
      calls,
    } = fixture();

    const response =
      await handler(
        event(
          "PUT",
          "/marketplace/receipts/purchase%3Aother",
          receipt(),
        ),
      );

    assert.equal(
      response.statusCode,
      400,
    );

    assert.equal(
      calls.put.length,
      0,
    );
  },
);

test(
  "receipt route rejects buyer wallet impersonation",
  async () => {
    const {
      handler,
    } = fixture();

    const response =
      await handler(
        event(
          "PUT",
          `/marketplace/receipts/${encodeURIComponent(
            receiptId,
          )}`,
          receipt({
            senderAddress:
              "0x2222222222222222222222222222222222222222",
          }),
        ),
      );

    assert.equal(
      response.statusCode,
      403,
    );
  },
);

test(
  "Marketplace receipt routes preserve credentialed CORS protection",
  async () => {
    const {
      handler,
    } = fixture();

    const request =
      event(
        "GET",
        "/marketplace/receipts",
      );

    request.headers.origin =
      "https://evil.example";

    const response =
      await handler(
        request,
      );

    assert.equal(
      response.statusCode,
      403,
    );

    assert.equal(
      response.headers[
        "access-control-allow-origin"
      ],
      allowedOrigin,
    );

    assert.equal(
      response.headers[
        "access-control-allow-credentials"
      ],
      "true",
    );
  },
);

test(
  "authenticated customer can retrieve Marketplace receipt",
  async () => {
    const source =
      receipt();

    const {
      handler,
    } = fixture({
      getItem:
        async (input) => {
          const pk =
            input?.Key?.PK?.S;

          const sk =
            input?.Key?.SK?.S;

          if (
            pk?.startsWith(
              "SESSION#",
            )
          ) {
            return {
              Item:
                authenticatedSession().item,
            };
          }

          if (
            pk ===
              `CUSTOMER#${customerId}` &&
            sk === "PROFILE"
          ) {
            return {
              Item:
                customerProfileItem(),
            };
          }

          if (
            pk ===
              `WALLET#${walletAddress}` &&
            sk === "ASSOCIATION"
          ) {
            return {
              Item:
                walletAssociationItem(),
            };
          }

          if (
            pk ===
              `CUSTOMER#${customerId}` &&
            sk ===
              `RECEIPT#${receiptId}`
          ) {
            return {
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
            };
          }

          return {};
        },
    });

    const response =
      await handler(
        event(
          "GET",
          `/marketplace/receipts/${encodeURIComponent(
            receiptId,
          )}`,
        ),
      );

    assert.equal(
      response.statusCode,
      200,
    );

    const body =
      JSON.parse(
        response.body,
      );

    assert.equal(
      body.receipt.id,
      receiptId,
    );
  },
);

console.log(
  "Package 7F.4 authenticated receipt route tests loaded.",
);



