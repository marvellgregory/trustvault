import assert from "node:assert/strict";
import test from "node:test";

const {
  createAuthHandler,
} = await import("./handler.cjs");

const {
  SESSION_COOKIE_NAME,
  createSessionPlan,
} = await import("./session.cjs");

const CUSTOMER_ID =
  "tvc_11111111111111111111111111111111";

const OTHER_CUSTOMER_ID =
  "tvc_22222222222222222222222222222222";

const WALLET =
  "0x1111111111111111111111111111111111111111";

const OTHER_WALLET =
  "0x2222222222222222222222222222222222222222";

const PARTICIPANT_WALLET =
  "0x3333333333333333333333333333333333333333";

const ORIGIN =
  "https://trustvault.example";

const NOW =
  new Date(
    "2026-08-21T03:30:00.000Z",
  );

function validBill(
  overrides = {},
) {
  return {
    id:
      "bill-1724210000000-handler-test",
    title:
      "Dinner",
    note:
      "Friday dinner",
    totalAmount:
      "20",
    totalBaseUnits:
      "20000000",
    asset:
      "USDC",
    network:
      "Arc Testnet",
    organizerAddress:
      WALLET,
    splitMethod:
      "equal",
    participants: [
      {
        id:
          "participant-organizer",
        name:
          "Organizer",
        walletAddress:
          WALLET,
        amountBaseUnits:
          "10000000",
        amount:
          "10",
        status:
          "paid",
        paidAt:
          "2026-08-21T03:00:00.000Z",
        settlementType:
          "organizer-self-share",
      },
      {
        id:
          "participant-friend",
        name:
          "Friend",
        walletAddress:
          PARTICIPANT_WALLET,
        amountBaseUnits:
          "10000000",
        amount:
          "10",
        status:
          "pending",
      },
    ],
    createdAt:
      "2026-08-21T03:00:00.000Z",
    updatedAt:
      "2026-08-21T03:00:00.000Z",
    status:
      "active",
    ...overrides,
  };
}

function createSession() {
  return createSessionPlan(
    {
      customerId:
        CUSTOMER_ID,
      normalizedAddress:
        WALLET,
      chainId:
        5_042_002,
    },
    {
      now:
        () =>
          new Date(
            "2026-08-21T03:29:00.000Z",
          ),
      randomBytes:
        () =>
          Buffer.alloc(
            32,
            9,
          ),
    },
  );
}

function profileItem() {
  return {
    PK: {
      S:
        `CUSTOMER#${CUSTOMER_ID}`,
    },
    SK: {
      S: "PROFILE",
    },
    entityType: {
      S: "CUSTOMER_PROFILE",
    },
    customerId: {
      S: CUSTOMER_ID,
    },
    status: {
      S: "ACTIVE",
    },
  };
}

function walletItem() {
  return {
    PK: {
      S:
        `WALLET#${WALLET}`,
    },
    SK: {
      S: "ASSOCIATION",
    },
    entityType: {
      S: "WALLET_ASSOCIATION",
    },
    customerId: {
      S: CUSTOMER_ID,
    },
    normalizedAddress: {
      S: WALLET,
    },
    associationStatus: {
      S: "VERIFIED",
    },
  };
}

function storedBillItem(
  bill,
  customerId = CUSTOMER_ID,
) {
  return {
    PK: {
      S:
        `CUSTOMER#${customerId}`,
    },
    SK: {
      S:
        `BILL_SPLIT#${bill.id}`,
    },
    entityType: {
      S: "BILL_SPLIT",
    },
    customerId: {
      S: customerId,
    },
    billId: {
      S: bill.id,
    },
    billJson: {
      S:
        JSON.stringify(bill),
    },
  };
}

function setup() {
  const plan =
    createSession();

  const bills =
    new Map();

  const notifications =
    new Map();

  const sessionItem =
    plan.transactItem.Put.Item;

  const getItem =
    async (input) => {
      const pk =
        input?.Key?.PK?.S;

      const sk =
        input?.Key?.SK?.S;

      if (
        pk === sessionItem.PK.S &&
        sk === sessionItem.SK.S
      ) {
        return {
          Item:
            sessionItem,
        };
      }

      if (
        pk ===
          `CUSTOMER#${CUSTOMER_ID}` &&
        sk === "PROFILE"
      ) {
        return {
          Item:
            profileItem(),
        };
      }

      if (
        pk ===
          `WALLET#${WALLET}` &&
        sk === "ASSOCIATION"
      ) {
        return {
          Item:
            walletItem(),
        };
      }

      const key =
        `${pk}|${sk}`;

      return {
        Item:
          bills.get(key),
      };
    };

  const putItem =
    async (input) => {
      const item =
        input.Item;

      const key =
        `${item.PK.S}|${item.SK.S}`;

      if (
        item.entityType?.S ===
        "NOTIFICATION"
      ) {
        if (
          notifications.has(key)
        ) {
          const error =
            new Error(
              "Conditional request failed",
            );

          error.name =
            "ConditionalCheckFailedException";

          throw error;
        }

        notifications.set(
          key,
          item,
        );

        return {};
      }

      bills.set(
        key,
        item,
      );

      return {};
    };

  const query =
    async (input) => {
      const customerPk =
        input
          ?.ExpressionAttributeValues
          ?. [":customerPk"]
          ?.S;

      const billPrefix =
        input
          ?.ExpressionAttributeValues
          ?. [":billPrefix"]
          ?.S;

      if (
        customerPk !==
          `CUSTOMER#${CUSTOMER_ID}` ||
        billPrefix !==
          "BILL_SPLIT#"
      ) {
        return {
          Items: [],
        };
      }

      return {
        Items:
          Array.from(
            bills.values(),
          ).filter(
            (item) =>
              item.PK?.S ===
                customerPk &&
              item.SK?.S?.startsWith(
                billPrefix,
              ),
          ),
      };
    };

  const handler =
    createAuthHandler({
      allowedOrigin:
        ORIGIN,
      domain:
        "app.trustvault.example",
      now:
        () =>
          new Date(
            NOW.getTime(),
          ),
      getItem,
      putItem,
      query,
      updateItem:
        async () => ({}),
      transactWriteItems:
        async () => ({}),
    });

  return {
    handler,
    bills,
    notifications,
    headers: {
      origin:
        ORIGIN,
      cookie:
        `${SESSION_COOKIE_NAME}=${plan.token}`,
    },
  };
}

test(
  "authenticated customer can persist and retrieve a Bill Split",
  async () => {
    const state =
      setup();

    const bill =
      validBill();

    const created =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "PUT",
          },
        },
        headers:
          state.headers,
        body:
          JSON.stringify(
            bill,
          ),
      });

    assert.equal(
      created.statusCode,
      201,
    );

    const createdBody =
      JSON.parse(
        created.body,
      );

    assert.equal(
      createdBody.billSplit.id,
      bill.id,
    );

    assert.equal(
      createdBody.billSplit
        .organizerAddress,
      WALLET,
    );

    assert.equal(
      state.bills.size,
      1,
    );

    assert.equal(
      state.notifications.size,
      1,
    );

    const notification =
      [...state.notifications.values()][0];

    assert.equal(
      notification.entityType.S,
      "NOTIFICATION",
    );

    assert.equal(
      notification.notificationType.S,
      "BILL_SPLIT_REQUEST",
    );

    assert.equal(
      notification.resource.S,
      "BILL_SPLIT",
    );

    assert.equal(
      notification.resourceId.S,
      bill.id,
    );

    assert.equal(
      notification.recipientAddress.S,
      PARTICIPANT_WALLET,
    );

    assert.equal(
      notification.actionPath.S,
      `/bill-split/pay/${encodeURIComponent(
        bill.id,
      )}/participant-friend`,
    );

    assert.match(
      notification.SK.S,
      /bill-split-request:/i,
    );

    const read =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "GET",
          },
        },
        headers:
          state.headers,
      });

    assert.equal(
      read.statusCode,
      200,
    );

    const readBody =
      JSON.parse(
        read.body,
      );

    assert.equal(
      readBody.billSplit.id,
      bill.id,
    );
  },
);

test(
  "Bill Split routes require authenticated session",
  async () => {
    const state =
      setup();

    const bill =
      validBill();

    const response =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "GET",
          },
        },
        headers: {
          origin:
            ORIGIN,
        },
      });

    assert.equal(
      response.statusCode,
      401,
    );
  },
);

test(
  "Bill Split route rejects path and body identifier mismatch without writing",
  async () => {
    const state =
      setup();

    const bill =
      validBill();

    const response =
      await state.handler({
        rawPath:
          "/bill-splits/bill-different",
        requestContext: {
          http: {
            method: "PUT",
          },
        },
        headers:
          state.headers,
        body:
          JSON.stringify(
            bill,
          ),
      });

    assert.equal(
      response.statusCode,
      400,
    );

    assert.equal(
      JSON.parse(
        response.body,
      ).error.code,
      "BILL_SPLIT_ID_MISMATCH",
    );

    assert.equal(
      state.bills.size,
      0,
    );
  },
);

test(
  "Bill Split route rejects organizer wallet impersonation",
  async () => {
    const state =
      setup();

    const bill =
      validBill({
        organizerAddress:
          OTHER_WALLET,
      });

    const response =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "PUT",
          },
        },
        headers:
          state.headers,
        body:
          JSON.stringify(
            bill,
          ),
      });

    assert.equal(
      response.statusCode,
      403,
    );

    assert.equal(
      JSON.parse(
        response.body,
      ).error.code,
      "BILL_SPLIT_OWNERSHIP_MISMATCH",
    );

    assert.equal(
      state.bills.size,
      0,
    );
  },
);

test(
  "Bill Split routes preserve credentialed CORS protection",
  async () => {
    const state =
      setup();

    const bill =
      validBill();

    const response =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "GET",
          },
        },
        headers: {
          ...state.headers,
          origin:
            "https://evil.example",
        },
      });

    assert.equal(
      response.statusCode,
      403,
    );

    assert.equal(
      response.headers[
        "access-control-allow-origin"
      ],
      ORIGIN,
    );

    assert.notEqual(
      response.headers[
        "access-control-allow-origin"
      ],
      "*",
    );
  },
);

test(
  "authenticated Bill Split collection returns only session customer bills",
  async () => {
    const state =
      setup();

    const older =
      validBill({
        id:
          "bill-1724210000000-old",
        createdAt:
          "2026-08-20T03:00:00.000Z",
        updatedAt:
          "2026-08-20T03:00:00.000Z",
      });

    const newer =
      validBill({
        id:
          "bill-1724210000000-new",
        createdAt:
          "2026-08-21T03:00:00.000Z",
        updatedAt:
          "2026-08-21T03:00:00.000Z",
      });

    state.bills.set(
      `CUSTOMER#${CUSTOMER_ID}|BILL_SPLIT#${older.id}`,
      storedBillItem(
        older,
      ),
    );

    state.bills.set(
      `CUSTOMER#${CUSTOMER_ID}|BILL_SPLIT#${newer.id}`,
      storedBillItem(
        newer,
      ),
    );

    const foreign =
      validBill({
        id:
          "bill-foreign",
      });

    state.bills.set(
      `CUSTOMER#${OTHER_CUSTOMER_ID}|BILL_SPLIT#${foreign.id}`,
      storedBillItem(
        foreign,
        OTHER_CUSTOMER_ID,
      ),
    );

    const response =
      await state.handler({
        rawPath:
          "/bill-splits",
        requestContext: {
          http: {
            method: "GET",
          },
        },
        headers:
          state.headers,
      });

    assert.equal(
      response.statusCode,
      200,
    );

    const body =
      JSON.parse(
        response.body,
      );

    assert.equal(
      body.billSplits.length,
      2,
    );

    assert.deepEqual(
      body.billSplits.map(
        (bill) =>
          bill.id,
      ),
      [
        newer.id,
        older.id,
      ],
    );

    assert.ok(
      body.billSplits.every(
        (bill) =>
          bill.id !==
          foreign.id,
      ),
    );
  },
);

test(
  "Bill Split collection requires authenticated session",
  async () => {
    const state =
      setup();

    const response =
      await state.handler({
        rawPath:
          "/bill-splits",
        requestContext: {
          http: {
            method: "GET",
          },
        },
        headers: {
          origin:
            ORIGIN,
        },
      });

    assert.equal(
      response.statusCode,
      401,
    );
  },
);

test(
  "Bill Split endpoints reject unsupported HTTP methods",
  async () => {
    const state =
      setup();

    const collection =
      await state.handler({
        rawPath:
          "/bill-splits",
        requestContext: {
          http: {
            method: "POST",
          },
        },
        headers:
          state.headers,
      });

    assert.equal(
      collection.statusCode,
      405,
    );

    const item =
      await state.handler({
        rawPath:
          "/bill-splits/bill-test",
        requestContext: {
          http: {
            method: "DELETE",
          },
        },
        headers:
          state.headers,
      });

    assert.equal(
      item.statusCode,
      405,
    );
  },
);

test(
  "repeated Bill Split persistence does not duplicate request notifications",
  async () => {
    const state =
      setup();

    const bill =
      validBill();

    const event = {
      rawPath:
        `/bill-splits/${bill.id}`,
      requestContext: {
        http: {
          method: "PUT",
        },
      },
      headers:
        state.headers,
      body:
        JSON.stringify(
          bill,
        ),
    };

    const first =
      await state.handler(
        event,
      );

    const second =
      await state.handler(
        event,
      );

    assert.equal(
      first.statusCode,
      201,
    );

    assert.equal(
      second.statusCode,
      201,
    );

    assert.equal(
      state.bills.size,
      1,
    );

    assert.equal(
      state.notifications.size,
      1,
    );

    const notification =
      [...state.notifications.values()][0];

    assert.equal(
      notification.notificationType.S,
      "BILL_SPLIT_REQUEST",
    );

    assert.equal(
      notification.recipientAddress.S,
      PARTICIPANT_WALLET,
    );
  },
);

test(
  "settled Bill Split creates no request notifications",
  async () => {
    const state =
      setup();

    const bill =
      validBill();

    bill.participants =
      bill.participants.map(
        (participant) =>
          participant.id ===
          "participant-friend"
            ? {
                ...participant,
                status:
                  "paid",
                paidAt:
                  "2026-08-21T03:15:00.000Z",
              }
            : participant,
      );

    bill.status =
      "settled";

    bill.updatedAt =
      "2026-08-21T03:15:00.000Z";

    const response =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "PUT",
          },
        },
        headers:
          state.headers,
        body:
          JSON.stringify(
            bill,
          ),
      });

    assert.equal(
      response.statusCode,
      201,
    );

    assert.equal(
      state.bills.size,
      1,
    );

    assert.equal(
      state.notifications.size,
      0,
    );
  },
);

test(
  "multiple pending participants receive one request notification each",
  async () => {
    const state =
      setup();

    const bill =
      validBill({
        totalAmount:
          "30",
        totalBaseUnits:
          "30000000",
      });

    bill.participants.push({
      id:
        "participant-second-friend",
      name:
        "Second Friend",
      walletAddress:
        "0x4444444444444444444444444444444444444444",
      amountBaseUnits:
        "10000000",
      amount:
        "10",
      status:
        "pending",
    });

    const response =
      await state.handler({
        rawPath:
          `/bill-splits/${bill.id}`,
        requestContext: {
          http: {
            method: "PUT",
          },
        },
        headers:
          state.headers,
        body:
          JSON.stringify(
            bill,
          ),
      });

    assert.equal(
      response.statusCode,
      201,
    );

    assert.equal(
      state.bills.size,
      1,
    );

    assert.equal(
      state.notifications.size,
      2,
    );

    const notifications =
      [...state.notifications.values()];

    const recipients =
      notifications
        .map(
          (notification) =>
            notification
              .recipientAddress
              .S,
        )
        .sort();

    assert.deepEqual(
      recipients,
      [
        PARTICIPANT_WALLET,
        "0x4444444444444444444444444444444444444444",
      ].sort(),
    );

    for (
      const notification
      of notifications
    ) {
      assert.equal(
        notification.notificationType.S,
        "BILL_SPLIT_REQUEST",
      );

      assert.equal(
        notification.resource.S,
        "BILL_SPLIT",
      );

      assert.match(
        notification.actionPath.S,
        /^\/bill-split\/pay\//,
      );
    }

    const actionPaths =
      notifications.map(
        (notification) =>
          notification.actionPath.S,
      );

    assert.ok(
      actionPaths.includes(
        `/bill-split/pay/${encodeURIComponent(
          bill.id,
        )}/participant-friend`,
      ),
    );

    assert.ok(
      actionPaths.includes(
        `/bill-split/pay/${encodeURIComponent(
          bill.id,
        )}/participant-second-friend`,
      ),
    );
  },
);
console.log(
  "Package 7H.2E Bill Split handler security tests loaded.",
);