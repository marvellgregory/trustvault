import assert from "node:assert/strict";
import test from "node:test";

import {
  createSessionPlan,
  SESSION_COOKIE_NAME,
} from "./session.cjs";

process.env.TRUSTVAULT_ALLOWED_ORIGIN =
  "http://localhost:3000";

const {
  createAuthHandler,
} = await import("./handler.cjs");

const CUSTOMER_ID =
  "tvc_11111111111111111111111111111111";

const WALLET =
  "0x1111111111111111111111111111111111111111";

const OTHER_WALLET =
  "0x2222222222222222222222222222222222222222";

const NOW =
  new Date(
    "2026-08-22T00:00:00.000Z",
  );

function stringValue(value) {
  return {
    S: String(value),
  };
}

function notificationItem({
  id,
  wallet = WALLET,
  createdAt,
}) {
  return {
    PK:
      stringValue(
        `WALLET#${wallet.toLowerCase()}`,
      ),
    SK:
      stringValue(
        `NOTIFICATION#${id}`,
      ),
    entityType:
      stringValue("NOTIFICATION"),
    schemaVersion: {
      N: "1",
    },
    notificationId:
      stringValue(id),
    recipientAddress:
      stringValue(
        wallet.toLowerCase(),
      ),
    notificationType:
      stringValue("GIFT_RECEIVED"),
    resource:
      stringValue("GIFT_VAULT"),
    resourceId:
      stringValue("42"),
    title:
      stringValue(
        "You received a Gift Vault",
      ),
    body:
      stringValue(
        "A Gift Vault was created for this wallet.",
      ),
    actionPath:
      stringValue(
        "/gift-vault/claim/42",
      ),
    status:
      stringValue("UNREAD"),
    createdAt:
      stringValue(createdAt),
  };
}

function createDependencies({
  authenticated = true,
  queryItems = [],
} = {}) {
  const queryCalls = [];

  const plan =
    createSessionPlan(
      {
        customerId:
          CUSTOMER_ID,
        normalizedAddress:
          WALLET.toLowerCase(),
        chainId:
          5_042_002,
      },
      {
        now: () =>
          NOW,
        randomBytes: () =>
          Buffer.alloc(32, 7),
      },
    );

  const session =
    structuredClone(
      plan.transactItem.Put.Item,
    );

  const customer = {
    customerId:
      stringValue(CUSTOMER_ID),
    status:
      stringValue("ACTIVE"),
  };

  const wallet = {
    customerId:
      stringValue(CUSTOMER_ID),
    normalizedAddress:
      stringValue(
        WALLET.toLowerCase(),
      ),
    associationStatus:
      stringValue("VERIFIED"),
  };

  async function getItem(input) {
    if (!authenticated) {
      return {};
    }

    const pk =
      input?.Key?.PK?.S ?? "";

    const sk =
      input?.Key?.SK?.S ?? "";

    if (
      pk ===
        `SESSION#${plan.sessionId}` &&
      sk === "SESSION"
    ) {
      return {
        Item: session,
      };
    }

    if (
      pk ===
        `CUSTOMER#${CUSTOMER_ID}` &&
      sk === "PROFILE"
    ) {
      return {
        Item: customer,
      };
    }

    if (
      pk ===
        `WALLET#${WALLET.toLowerCase()}` &&
      sk === "ASSOCIATION"
    ) {
      return {
        Item: wallet,
      };
    }

    return {};
  }

  async function query(input) {
    queryCalls.push(input);

    return {
      Items:
        queryItems,
    };
  }

  return {
    dependencies: {
      putItem:
        async () => {},
      getItem,
      query,
      transactWriteItems:
        async () => {},
      updateItem:
        async () => {},
      domain:
        "localhost",
      allowedOrigin:
        "http://localhost:3000",
      now: () =>
        new Date(
          NOW.getTime() + 1_000,
        ),
    },
    queryCalls,
    sessionCookie:
      `${SESSION_COOKIE_NAME}=${plan.token}`,
  };
}

function event({
  method = "GET",
  cookie,
  origin =
    "http://localhost:3000",
} = {}) {
  return {
    rawPath:
      "/notifications",
    requestContext: {
      http: {
        method,
        path:
          "/notifications",
      },
    },
    headers: {
      origin,
      ...(cookie
        ? { cookie }
        : {}),
    },
  };
}

test(
  "authenticated wallet can list only its notification partition newest first",
  async () => {
    const {
      dependencies,
      queryCalls,
      sessionCookie,
    } = createDependencies({
      queryItems: [
        notificationItem({
          id:
            "gift-received:41",
          createdAt:
            "2026-08-21T10:00:00.000Z",
        }),
        notificationItem({
          id:
            "gift-received:42",
          createdAt:
            "2026-08-22T10:00:00.000Z",
        }),
      ],
    });

    const handler =
      createAuthHandler(
        dependencies,
      );

    const response =
      await handler(
        event({
          cookie:
            sessionCookie,
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
      body.notifications.length,
      2,
    );

    assert.equal(
      body.notifications[0].id,
      "gift-received:42",
    );

    assert.equal(
      body.notifications[1].id,
      "gift-received:41",
    );

    assert.equal(
      queryCalls.length,
      1,
    );

    const query =
      queryCalls[0];

    assert.equal(
      query.ExpressionAttributeValues[
        ":walletPk"
      ].S,
      `WALLET#${WALLET.toLowerCase()}`,
    );

    assert.equal(
      query.ExpressionAttributeValues[
        ":notificationPrefix"
      ].S,
      "NOTIFICATION#",
    );
  },
);

test(
  "notification collection requires authenticated session",
  async () => {
    const {
      dependencies,
      queryCalls,
    } = createDependencies({
      authenticated:
        false,
    });

    const handler =
      createAuthHandler(
        dependencies,
      );

    const response =
      await handler(
        event(),
      );

    assert.equal(
      response.statusCode,
      401,
    );

    assert.equal(
      queryCalls.length,
      0,
    );
  },
);

test(
  "notification collection rejects unsupported HTTP methods",
  async () => {
    const {
      dependencies,
      queryCalls,
      sessionCookie,
    } = createDependencies();

    const handler =
      createAuthHandler(
        dependencies,
      );

    const response =
      await handler(
        event({
          method:
            "POST",
          cookie:
            sessionCookie,
        }),
      );

    assert.equal(
      response.statusCode,
      405,
    );

    assert.equal(
      queryCalls.length,
      0,
    );
  },
);

test(
  "notification collection preserves credentialed CORS protection",
  async () => {
    const {
      dependencies,
      queryCalls,
      sessionCookie,
    } = createDependencies();

    const handler =
      createAuthHandler(
        dependencies,
      );

    const response =
      await handler(
        event({
          cookie:
            sessionCookie,
          origin:
            "https://attacker.example",
        }),
      );

    assert.equal(
      response.statusCode,
      403,
    );

    assert.equal(
      queryCalls.length,
      0,
    );
  },
);

test(
  "notification response contains no private Gift Vault message",
  async () => {
    const {
      dependencies,
      sessionCookie,
    } = createDependencies({
      queryItems: [
        notificationItem({
          id:
            "gift-received:42",
          createdAt:
            "2026-08-22T10:00:00.000Z",
        }),
      ],
    });

    const handler =
      createAuthHandler(
        dependencies,
      );

    const response =
      await handler(
        event({
          cookie:
            sessionCookie,
        }),
      );

    assert.equal(
      response.statusCode,
      200,
    );

    assert.equal(
      response.body.includes(
        "privateMessage",
      ),
      false,
    );

    assert.equal(
      response.body.includes(
        '"message"',
      ),
      false,
    );
  },
);

test(
  "notification retrieval ignores unrelated wallet notification data",
  async () => {
    const {
      dependencies,
      queryCalls,
      sessionCookie,
    } = createDependencies({
      queryItems: [],
    });

    const handler =
      createAuthHandler(
        dependencies,
      );

    const response =
      await handler(
        event({
          cookie:
            sessionCookie,
        }),
      );

    assert.equal(
      response.statusCode,
      200,
    );

    assert.equal(
      queryCalls.length,
      1,
    );

    assert.equal(
      queryCalls[0]
        .ExpressionAttributeValues[
          ":walletPk"
        ].S,
      `WALLET#${WALLET.toLowerCase()}`,
    );

    assert.notEqual(
      queryCalls[0]
        .ExpressionAttributeValues[
          ":walletPk"
        ].S,
      `WALLET#${OTHER_WALLET.toLowerCase()}`,
    );
  },
);

console.log(
  "Package 7B.7A authenticated notification route tests loaded.",
);
