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

const RECIPIENT_CUSTOMER_ID =
  "tvc_22222222222222222222222222222222";

const STRANGER_CUSTOMER_ID =
  "tvc_33333333333333333333333333333333";

const SENDER =
  "0x1111111111111111111111111111111111111111";

const RECIPIENT =
  "0x2222222222222222222222222222222222222222";

const STRANGER =
  "0x3333333333333333333333333333333333333333";

const ORIGIN =
  "https://trustvault.example";

const NOW =
  new Date(
    "2026-08-22T02:15:00.000Z",
  );

const TX_HASH =
  `0x${"a".repeat(64)}`;

function validGift(
  overrides = {},
) {
  return {
    id: "123",
    recipientAddress:
      RECIPIENT,
    amountBaseUnits:
      "12500000",
    unlockTimestamp:
      "1787625000",
    transactionHash:
      TX_HASH,
    message:
      "Happy birthday from TrustVault.",
    ...overrides,
  };
}

function makeSessionPlan(
  customerId,
  walletAddress,
  byte,
) {
  return createSessionPlan(
    {
      customerId,
      normalizedAddress:
        walletAddress,
      chainId:
        5_042_002,
    },
    {
      now: () =>
        new Date(
          "2026-08-22T02:14:00.000Z",
        ),

      randomBytes: () =>
        Buffer.alloc(
          32,
          byte,
        ),
    },
  );
}

function profileItem(
  customerId,
) {
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

function walletItem(
  customerId,
  walletAddress,
) {
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

function storedGiftItem(
  gift,
) {
  return {
    PK: {
      S:
        `GIFT_VAULT#${gift.id}`,
    },
    SK: {
      S: "METADATA",
    },
    entityType: {
      S: "GIFT_VAULT",
    },
    customerId: {
      S: CUSTOMER_ID,
    },
    giftId: {
      S: gift.id,
    },
    senderAddress: {
      S:
        gift.senderAddress,
    },
    recipientAddress: {
      S:
        gift.recipientAddress,
    },
    transactionHash: {
      S:
        gift.transactionHash,
    },
    createdAt: {
      S:
        gift.createdAt,
    },
    giftJson: {
      S:
        JSON.stringify(gift),
    },
  };
}

function setup() {
  const senderPlan =
    makeSessionPlan(
      CUSTOMER_ID,
      SENDER,
      9,
    );

  const recipientPlan =
    makeSessionPlan(
      RECIPIENT_CUSTOMER_ID,
      RECIPIENT,
      10,
    );

  const strangerPlan =
    makeSessionPlan(
      STRANGER_CUSTOMER_ID,
      STRANGER,
      11,
    );

  const sessions =
    new Map([
      [
        senderPlan.sessionId,
        senderPlan.transactItem.Put.Item,
      ],
      [
        recipientPlan.sessionId,
        recipientPlan.transactItem.Put.Item,
      ],
      [
        strangerPlan.sessionId,
        strangerPlan.transactItem.Put.Item,
      ],
    ]);

  const gifts =
    new Map();

  const notifications =
    new Map();

  async function getItem(
    input,
  ) {
    const pk =
      input?.Key?.PK?.S;

    const sk =
      input?.Key?.SK?.S;

    if (
      pk?.startsWith("SESSION#") &&
      sk === "SESSION"
    ) {
      return {
        Item:
          sessions.get(
            pk.slice(
              "SESSION#".length,
            ),
          ),
      };
    }

    if (
      pk ===
        `CUSTOMER#${CUSTOMER_ID}` &&
      sk === "PROFILE"
    ) {
      return {
        Item:
          profileItem(
            CUSTOMER_ID,
          ),
      };
    }

    if (
      pk ===
        `CUSTOMER#${RECIPIENT_CUSTOMER_ID}` &&
      sk === "PROFILE"
    ) {
      return {
        Item:
          profileItem(
            RECIPIENT_CUSTOMER_ID,
          ),
      };
    }

    if (
      pk ===
        `CUSTOMER#${STRANGER_CUSTOMER_ID}` &&
      sk === "PROFILE"
    ) {
      return {
        Item:
          profileItem(
            STRANGER_CUSTOMER_ID,
          ),
      };
    }

    if (
      pk ===
        `WALLET#${SENDER}` &&
      sk === "ASSOCIATION"
    ) {
      return {
        Item:
          walletItem(
            CUSTOMER_ID,
            SENDER,
          ),
      };
    }

    if (
      pk ===
        `WALLET#${RECIPIENT}` &&
      sk === "ASSOCIATION"
    ) {
      return {
        Item:
          walletItem(
            RECIPIENT_CUSTOMER_ID,
            RECIPIENT,
          ),
      };
    }

    if (
      pk ===
        `WALLET#${STRANGER}` &&
      sk === "ASSOCIATION"
    ) {
      return {
        Item:
          walletItem(
            STRANGER_CUSTOMER_ID,
            STRANGER,
          ),
      };
    }

    if (
      pk?.startsWith(
        "GIFT_VAULT#",
      ) &&
      sk === "METADATA"
    ) {
      const id =
        pk.slice(
          "GIFT_VAULT#".length,
        );

      return {
        Item:
          gifts.get(id),
      };
    }

    return {};
  }

  async function putItem(
    input,
  ) {
    const pk =
      input?.Item?.PK?.S;

    const sk =
      input?.Item?.SK?.S;

    if (
      pk?.startsWith(
        "GIFT_VAULT#",
      ) &&
      sk === "METADATA"
    ) {
      const id =
        pk.slice(
          "GIFT_VAULT#".length,
        );

      gifts.set(
        id,
        input.Item,
      );
    }

    if (
      pk?.startsWith(
        "WALLET#",
      ) &&
      sk?.startsWith(
        "NOTIFICATION#",
      )
    ) {
      const key =
        `${pk}|${sk}`;

      if (
        notifications.has(key)
      ) {
        const error =
          new Error(
            "notification already exists",
          );

        error.name =
          "ConditionalCheckFailedException";

        throw error;
      }

      notifications.set(
        key,
        input.Item,
      );
    }

    return {};
  }

  const handler =
    createAuthHandler({
      domain:
        "trustvault.example",

      allowedOrigin:
        ORIGIN,

      getItem,
      putItem,

      query:
        async () => ({
          Items: [],
        }),

      transactWriteItems:
        async () => ({}),

      updateItem:
        async () => ({}),

      now: () =>
        NOW,
    });

  function headersFor(
    plan,
  ) {
    return {
      origin:
        ORIGIN,

      cookie:
        `${SESSION_COOKIE_NAME}=${plan.token}`,
    };
  }

  return {
    handler,
    gifts,
    notifications,
    senderHeaders:
      headersFor(
        senderPlan,
      ),
    recipientHeaders:
      headersFor(
        recipientPlan,
      ),
    strangerHeaders:
      headersFor(
        strangerPlan,
      ),
  };
}

function event({
  method,
  path,
  headers,
  body,
}) {
  return {
    rawPath: path,
    requestContext: {
      http: {
        method,
      },
    },
    headers,
    ...(body === undefined
      ? {}
      : {
          body:
            JSON.stringify(
              body,
            ),
        }),
  };
}

test(
  "authenticated sender can persist and retrieve private Gift Vault metadata",
  async () => {
    const state =
      setup();

    const putResponse =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift(),
        }),
      );

    assert.equal(
      putResponse.statusCode,
      201,
    );

    const putBody =
      JSON.parse(
        putResponse.body,
      );

    assert.equal(
      putBody.giftVault.id,
      "123",
    );

    assert.equal(
      putBody.giftVault.senderAddress,
      SENDER,
    );

    assert.equal(
      putBody.giftVault.message,
      validGift().message,
    );

    const getResponse =
      await state.handler(
        event({
          method: "GET",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
        }),
      );

    assert.equal(
      getResponse.statusCode,
      200,
    );

    const getBody =
      JSON.parse(
        getResponse.body,
      );

    assert.equal(
      getBody.giftVault.message,
      validGift().message,
    );
  },
);

test(
  "authenticated recipient can read private Gift Vault metadata",
  async () => {
    const state =
      setup();

    await state.handler(
      event({
        method: "PUT",
        path:
          "/gift-vault/gifts/123",
        headers:
          state.senderHeaders,
        body:
          validGift(),
      }),
    );

    const response =
      await state.handler(
        event({
          method: "GET",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.recipientHeaders,
        }),
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
      body.giftVault.recipientAddress,
      RECIPIENT,
    );

    assert.equal(
      body.giftVault.message,
      validGift().message,
    );
  },
);

test(
  "unrelated authenticated wallet receives privacy preserving not found",
  async () => {
    const state =
      setup();

    await state.handler(
      event({
        method: "PUT",
        path:
          "/gift-vault/gifts/123",
        headers:
          state.senderHeaders,
        body:
          validGift(),
      }),
    );

    const response =
      await state.handler(
        event({
          method: "GET",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.strangerHeaders,
        }),
      );

    assert.equal(
      response.statusCode,
      404,
    );

    const body =
      JSON.parse(
        response.body,
      );

    assert.equal(
      body.error.code,
      "GIFT_VAULT_NOT_FOUND",
    );
  },
);

test(
  "Gift Vault route requires authenticated session",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "GET",
          path:
            "/gift-vault/gifts/123",
          headers: {
            origin:
              ORIGIN,
          },
        }),
      );

    assert.equal(
      response.statusCode,
      401,
    );
  },
);

test(
  "Gift Vault route rejects path and body identifier mismatch without writing",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift({
              id: "456",
            }),
        }),
      );

    assert.equal(
      response.statusCode,
      400,
    );

    assert.equal(
      state.gifts.size,
      0,
    );

    const body =
      JSON.parse(
        response.body,
      );

    assert.equal(
      body.error.code,
      "GIFT_VAULT_ID_MISMATCH",
    );
  },
);

test(
  "Gift Vault route rejects browser supplied ownership identity",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body: {
            ...validGift(),

            customerId:
              STRANGER_CUSTOMER_ID,

            senderAddress:
              STRANGER,
          },
        }),
      );

    assert.equal(
      response.statusCode,
      400,
    );

    assert.equal(
      state.gifts.size,
      0,
    );
  },
);

test(
  "Gift Vault route preserves 500 word message boundary",
  async () => {
    const state =
      setup();

    const accepted =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift({
              message:
                Array(500)
                  .fill("gift")
                  .join(" "),
            }),
        }),
      );

    assert.equal(
      accepted.statusCode,
      201,
    );

    const second =
      setup();

    const rejected =
      await second.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/124",
          headers:
            second.senderHeaders,
          body:
            validGift({
              id: "124",

              message:
                Array(501)
                  .fill("gift")
                  .join(" "),
            }),
        }),
      );

    assert.equal(
      rejected.statusCode,
      400,
    );

    const body =
      JSON.parse(
        rejected.body,
      );

    assert.equal(
      body.error.code,
      "GIFT_VAULT_MESSAGE_TOO_LONG",
    );
  },
);

test(
  "Gift Vault endpoints reject unsupported HTTP methods",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "DELETE",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
        }),
      );

    assert.equal(
      response.statusCode,
      405,
    );
  },
);

test(
  "Gift Vault routes preserve credentialed CORS protection",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "GET",
          path:
            "/gift-vault/gifts/999",
          headers:
            state.senderHeaders,
        }),
      );

    assert.equal(
      response.headers[
        "access-control-allow-origin"
      ],
      ORIGIN,
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
  "creates a private-safe recipient notification after Gift Vault persistence",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift(),
        }),
      );

    assert.equal(
      response.statusCode,
      201,
    );

    assert.equal(
      state.notifications.size,
      1,
    );

    const key =
      `WALLET#${RECIPIENT.toLowerCase()}|NOTIFICATION#gift-received:123`;

    const notification =
      state.notifications.get(key);

    assert.ok(notification);

    assert.equal(
      notification.notificationType.S,
      "GIFT_RECEIVED",
    );

    assert.equal(
      notification.resource.S,
      "GIFT_VAULT",
    );

    assert.equal(
      notification.resourceId.S,
      "123",
    );

    assert.equal(
      notification.actionPath.S,
      "/gift-vault/claim/123",
    );

    assert.equal(
      notification.status.S,
      "UNREAD",
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        notification,
        "message",
      ),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        notification,
        "privateMessage",
      ),
      false,
    );

    assert.equal(
      notification.body.S.includes(
        validGift().message,
      ),
      false,
    );
  },
);

test(
  "repeated Gift Vault persistence does not duplicate recipient notification",
  async () => {
    const state =
      setup();

    const first =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift(),
        }),
      );

    assert.equal(
      first.statusCode,
      201,
    );

    const second =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift(),
        }),
      );

    assert.equal(
      second.statusCode,
      201,
    );

    assert.equal(
      state.notifications.size,
      1,
    );
  },
);

test(
  "invalid Gift Vault persistence creates no recipient notification",
  async () => {
    const state =
      setup();

    const response =
      await state.handler(
        event({
          method: "PUT",
          path:
            "/gift-vault/gifts/123",
          headers:
            state.senderHeaders,
          body:
            validGift({
              id: "456",
            }),
        }),
      );

    assert.equal(
      response.statusCode,
      400,
    );

    assert.equal(
      state.notifications.size,
      0,
    );
  },
);

console.log(
  "Package 7A.3 Gift Vault handler security tests loaded.",
);
