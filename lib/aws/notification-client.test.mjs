import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL =
  "https://api.example.test/";

const {
  fetchNotifications,
  markNotificationRead,
} = await import("./notification-client.ts");

function response(
  status,
  body,
) {
  return new Response(
    body === undefined
      ? null
      : JSON.stringify(body),
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

function notification(
  overrides = {},
) {
  return {
    id: "gift-received:42",
    type: "GIFT_RECEIVED",
    resource: "GIFT_VAULT",
    resourceId: "42",
    title: "A Gift Vault is waiting for you",
    body:
      "A private Gift Vault has been created for this wallet.",
    actionPath:
      "/gift-vault/claim/42",
    status: "UNREAD",
    createdAt:
      "2026-08-22T04:00:00.000Z",
    ...overrides,
  };
}

test(
  "loads notifications using only the authenticated session",
  async () => {
    let requestUrl;
    let requestInit;

    globalThis.fetch =
      async (
        url,
        init,
      ) => {
        requestUrl =
          String(url);
        requestInit =
          init;

        return response(
          200,
          {
            notifications: [
              notification(),
            ],
          },
        );
      };

    const result =
      await fetchNotifications();

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      requestUrl,
      "https://api.example.test/notifications",
    );

    assert.equal(
      requestInit.method,
      "GET",
    );

    assert.equal(
      requestInit.credentials,
      "include",
    );

    assert.equal(
      requestInit.body,
      undefined,
    );

    assert.equal(
      result.notifications.length,
      1,
    );

    assert.equal(
      result.notifications[0].type,
      "GIFT_RECEIVED",
    );

    assert.equal(
      result.notifications[0].resource,
      "GIFT_VAULT",
    );

    assert.equal(
      result.notifications[0].resourceId,
      "42",
    );

    assert.equal(
      result.notifications[0].status,
      "UNREAD",
    );

    assert.equal(
      "readAt" in
        result.notifications[0],
      false,
    );
  },
);

test(
  "does not send browser supplied customer or wallet identity",
  async () => {
    globalThis.fetch =
      async (
        url,
        init,
      ) => {
        const serialized =
          JSON.stringify({
            url: String(url),
            init,
          });

        assert.equal(
          serialized.includes(
            "walletAddress",
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            "customerId",
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            "recipientAddress",
          ),
          false,
        );

        return response(
          200,
          {
            notifications: [],
          },
        );
      };

    const result =
      await fetchNotifications();

    assert.equal(
      result.ok,
      true,
    );
  },
);

test(
  "accepts an empty authenticated notification collection",
  async () => {
    globalThis.fetch =
      async () =>
        response(
          200,
          {
            notifications: [],
          },
        );

    const result =
      await fetchNotifications();

    assert.deepEqual(
      result,
      {
        ok: true,
        notifications: [],
      },
    );
  },
);

test(
  "preserves authenticated session failures",
  async () => {
    globalThis.fetch =
      async () =>
        response(
          401,
          {
            error: {
              code:
                "SESSION_MISSING",
              message:
                "Authentication is required.",
            },
          },
        );

    const result =
      await fetchNotifications();

    assert.deepEqual(
      result,
      {
        ok: false,
        status: 401,
        code:
          "SESSION_MISSING",
        message:
          "Authentication is required.",
      },
    );
  },
);

test(
  "rejects malformed notification collections",
  async () => {
    globalThis.fetch =
      async () =>
        response(
          200,
          {
            notifications: [
              notification({
                actionPath: 123,
              }),
            ],
          },
        );

    const result =
      await fetchNotifications();

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.code,
      "INVALID_NOTIFICATION_RESPONSE",
    );
  },
);

test(
  "rejects responses without a notification collection",
  async () => {
    globalThis.fetch =
      async () =>
        response(
          200,
          {
            notification:
              notification(),
          },
        );

    const result =
      await fetchNotifications();

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.code,
      "INVALID_NOTIFICATION_RESPONSE",
    );
  },
);

test(
  "returns a safe failure when the notification service is unreachable",
  async () => {
    globalThis.fetch =
      async () => {
        throw new Error(
          "network unavailable",
        );
      };

    const result =
      await fetchNotifications();

    assert.deepEqual(
      result,
      {
        ok: false,
        status: null,
        code:
          "NOTIFICATION_NETWORK_ERROR",
        message:
          "TrustVault could not reach the notification service.",
      },
    );
  },
);
test(
  "marks a notification read using only the authenticated session",
  async () => {
    let requestUrl;
    let requestInit;

    globalThis.fetch =
      async (
        url,
        init,
      ) => {
        requestUrl =
          String(url);

        requestInit =
          init;

        return response(
          200,
          {
            notification:
              notification({
                status: "READ",
                readAt:
                  "2026-08-23T01:00:00.000Z",
              }),
          },
        );
      };

    const result =
      await markNotificationRead(
        "gift:42",
      );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      requestUrl,
      "https://api.example.test/notifications/gift%3A42/read",
    );

    assert.equal(
      requestInit.method,
      "PATCH",
    );

    assert.equal(
      requestInit.credentials,
      "include",
    );

    assert.equal(
      requestInit.body,
      undefined,
    );

    assert.equal(
      result.notification.status,
      "READ",
    );

    assert.equal(
      result.notification.readAt,
      "2026-08-23T01:00:00.000Z",
    );
  },
);

test(
  "mark read does not send browser supplied identity",
  async () => {
    globalThis.fetch =
      async (
        url,
        init,
      ) => {
        const serialized =
          JSON.stringify({
            url: String(url),
            init,
          });

        assert.equal(
          serialized.includes(
            "walletAddress",
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            "customerId",
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            "recipientAddress",
          ),
          false,
        );

        return response(
          200,
          {
            notification:
              notification({
                status: "READ",
                readAt:
                  "2026-08-23T01:00:00.000Z",
              }),
          },
        );
      };

    const result =
      await markNotificationRead(
        "notification-1",
      );

    assert.equal(
      result.ok,
      true,
    );
  },
);

test(
  "mark read preserves authenticated session failures",
  async () => {
    globalThis.fetch =
      async () =>
        response(
          401,
          {
            error: {
              code:
                "SESSION_MISSING",
              message:
                "Authentication is required.",
            },
          },
        );

    const result =
      await markNotificationRead(
        "notification-1",
      );

    assert.deepEqual(
      result,
      {
        ok: false,
        status: 401,
        code:
          "SESSION_MISSING",
        message:
          "Authentication is required.",
      },
    );
  },
);

test(
  "mark read rejects malformed successful responses",
  async () => {
    globalThis.fetch =
      async () =>
        response(
          200,
          {
            notification:
              notification(),
          },
        );

    const result =
      await markNotificationRead(
        "notification-1",
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.code,
      "INVALID_NOTIFICATION_RESPONSE",
    );
  },
);

test(
  "mark read returns a safe network failure",
  async () => {
    globalThis.fetch =
      async () => {
        throw new Error(
          "network unavailable",
        );
      };

    const result =
      await markNotificationRead(
        "notification-1",
      );

    assert.equal(
      result.ok,
      false,
    );

    assert.equal(
      result.code,
      "NOTIFICATION_NETWORK_ERROR",
    );
  },
);
