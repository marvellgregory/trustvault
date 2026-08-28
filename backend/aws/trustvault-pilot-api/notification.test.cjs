"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  NotificationError,
  listNotifications,
  markNotificationRead,
  notificationFromItem,
  notificationKey,
  saveNotification,
  validateNotification,
} = require("./notification.cjs");

const recipient =
  "0x1111111111111111111111111111111111111111";

const baseNotification = {
  id: "gift-received:42",
  recipientAddress: recipient,
  type: "GIFT_RECEIVED",
  resource: "GIFT_VAULT",
  resourceId: "42",
  title: "You received a Gift Vault",
  body: "A Gift Vault has been created for this wallet.",
  actionPath: "/gift-vault/claim/42",
};

test(
  "validates and normalizes a notification",
  () => {
    const result = validateNotification({
      ...baseNotification,
      recipientAddress:
        "0x1111111111111111111111111111111111111111",
    });

    assert.equal(
      result.recipientAddress,
      recipient,
    );

    assert.equal(result.type, "GIFT_RECEIVED");
    assert.equal(result.resource, "GIFT_VAULT");
  },
);

test(
  "rejects unsupported notification fields",
  () => {
    assert.throws(
      () =>
        validateNotification({
          ...baseNotification,
          privateMessage:
            "this must never enter notification storage",
        }),
      (error) =>
        error instanceof NotificationError &&
        error.code === "INVALID_NOTIFICATION",
    );
  },
);

test(
  "rejects external notification action URLs",
  () => {
    assert.throws(
      () =>
        validateNotification({
          ...baseNotification,
          actionPath:
            "https://example.com/gift/42",
        }),
      (error) =>
        error instanceof NotificationError &&
        error.code ===
          "INVALID_NOTIFICATION_ACTION",
    );
  },
);

test(
  "builds notification key under recipient wallet",
  () => {
    assert.deepEqual(
      notificationKey(
        recipient,
        "gift-received:42",
      ),
      {
        PK: {
          S: `WALLET#${recipient}`,
        },
        SK: {
          S: "NOTIFICATION#gift-received:42",
        },
      },
    );
  },
);

test(
  "persists notification without private Gift Vault message",
  async () => {
    let request;

    const saved = await saveNotification(
      baseNotification,
      {
        now: () =>
          new Date(
            "2026-08-22T03:30:00.000Z",
          ),

        putItem: async (input) => {
          request = input;
          return {};
        },
      },
    );

    assert.equal(
      request.TableName,
      "TrustVaultPilot",
    );

    assert.equal(
      request.Item.PK.S,
      `WALLET#${recipient}`,
    );

    assert.equal(
      request.Item.SK.S,
      "NOTIFICATION#gift-received:42",
    );

    assert.equal(
      request.Item.status.S,
      "UNREAD",
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        request.Item,
        "message",
      ),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        request.Item,
        "privateMessage",
      ),
      false,
    );

    assert.equal(saved.status, "UNREAD");
  },
);

test(
  "rejects duplicate notification creation",
  async () => {
    await assert.rejects(
      () =>
        saveNotification(
          baseNotification,
          {
            putItem: async () => {
              const error = new Error(
                "conditional failure",
              );

              error.name =
                "ConditionalCheckFailedException";

              throw error;
            },
          },
        ),
      (error) =>
        error instanceof NotificationError &&
        error.code ===
          "NOTIFICATION_ALREADY_EXISTS",
    );
  },
);

test(
  "lists only the authenticated wallet notification partition",
  async () => {
    let request;

    const notifications =
      await listNotifications(
        {
          authenticated: true,
          customerId:
            "tvc_11111111111111111111111111111111",
          walletAddress: recipient,
        },
        {
          query: async (input) => {
            request = input;

            return {
              Items: [
                {
                  PK: {
                    S: `WALLET#${recipient}`,
                  },
                  SK: {
                    S:
                      "NOTIFICATION#gift-received:42",
                  },
                  entityType: {
                    S: "NOTIFICATION",
                  },
                  schemaVersion: {
                    N: "1",
                  },
                  notificationId: {
                    S: "gift-received:42",
                  },
                  recipientAddress: {
                    S: recipient,
                  },
                  notificationType: {
                    S: "GIFT_RECEIVED",
                  },
                  resource: {
                    S: "GIFT_VAULT",
                  },
                  resourceId: {
                    S: "42",
                  },
                  title: {
                    S:
                      "You received a Gift Vault",
                  },
                  body: {
                    S:
                      "A Gift Vault has been created for this wallet.",
                  },
                  actionPath: {
                    S:
                      "/gift-vault/claim/42",
                  },
                  status: {
                    S: "UNREAD",
                  },
                  createdAt: {
                    S:
                      "2026-08-22T03:30:00.000Z",
                  },
                },
              ],
            };
          },
        },
      );

    assert.equal(
      request.ExpressionAttributeValues[
        ":walletPk"
      ].S,
      `WALLET#${recipient}`,
    );

    assert.equal(
      request.ExpressionAttributeValues[
        ":notificationPrefix"
      ].S,
      "NOTIFICATION#",
    );

    assert.equal(notifications.length, 1);
    assert.equal(
      notifications[0].resourceId,
      "42",
    );
  },
);

test(
  "rejects unauthenticated notification reads",
  async () => {
    await assert.rejects(
      () =>
        listNotifications(
          {
            authenticated: false,
          },
          {
            query: async () => ({
              Items: [],
            }),
          },
        ),
      (error) =>
        error instanceof NotificationError &&
        error.code ===
          "NOTIFICATION_AUTHENTICATION_REQUIRED",
    );
  },
);
test(
  "deserializes persisted READ notification",
  () => {
    const item = {
      PK: {
        S: `WALLET#${recipient}`,
      },
      SK: {
        S: "NOTIFICATION#gift-received:42",
      },
      entityType: {
        S: "NOTIFICATION",
      },
      schemaVersion: {
        N: "1",
      },
      notificationId: {
        S: "gift-received:42",
      },
      recipientAddress: {
        S: recipient,
      },
      notificationType: {
        S: "GIFT_RECEIVED",
      },
      resource: {
        S: "GIFT_VAULT",
      },
      resourceId: {
        S: "42",
      },
      title: {
        S: "You received a Gift Vault",
      },
      body: {
        S: "A Gift Vault has been created for this wallet.",
      },
      actionPath: {
        S: "/gift-vault/claim/42",
      },
      status: {
        S: "READ",
      },
      createdAt: {
        S: "2026-08-22T03:30:00.000Z",
      },
    };

    const notification =
      notificationFromItem(item);

    assert.equal(
      notification.status,
      "READ",
    );
  },
);

test(
  "authenticated wallet marks its notification READ",
  async () => {
    let request;

    const session = {
      authenticated: true,
      customerId:
        "tvc_11111111111111111111111111111111",
      walletAddress:
        recipient,
    };

    const updated =
      await markNotificationRead(
        session,
        "gift-received:42",
        {
          updateItem: async (input) => {
            request = input;

            return {
              Attributes: {
                PK: {
                  S: `WALLET#${recipient}`,
                },
                SK: {
                  S: "NOTIFICATION#gift-received:42",
                },
                entityType: {
                  S: "NOTIFICATION",
                },
                schemaVersion: {
                  N: "1",
                },
                notificationId: {
                  S: "gift-received:42",
                },
                recipientAddress: {
                  S: recipient,
                },
                notificationType: {
                  S: "GIFT_RECEIVED",
                },
                resource: {
                  S: "GIFT_VAULT",
                },
                resourceId: {
                  S: "42",
                },
                title: {
                  S: "You received a Gift Vault",
                },
                body: {
                  S: "A Gift Vault has been created for this wallet.",
                },
                actionPath: {
                  S: "/gift-vault/claim/42",
                },
                status: {
                  S: "READ",
                },
                createdAt: {
                  S: "2026-08-22T03:30:00.000Z",
                },
              },
            };
          },
        },
      );

    assert.equal(
      request.Key.PK.S,
      `WALLET#${recipient}`,
    );

    assert.equal(
      request.Key.SK.S,
      "NOTIFICATION#gift-received:42",
    );

    assert.equal(
      request.ExpressionAttributeValues[
        ":read"
      ].S,
      "READ",
    );

    assert.equal(
      updated.status,
      "READ",
    );
  },
);

test(
  "notification read mutation requires authentication",
  async () => {
    await assert.rejects(
      () =>
        markNotificationRead(
          null,
          "gift-received:42",
          {
            updateItem:
              async () => ({}),
          },
        ),
      (error) =>
        error instanceof NotificationError &&
        error.statusCode === 401,
    );
  },
);

test(
  "notification read mutation rejects invalid notification id",
  async () => {
    await assert.rejects(
      () =>
        markNotificationRead(
          {
            authenticated: true,
            customerId:
              "tvc_11111111111111111111111111111111",
            walletAddress:
              recipient,
          },
          "../wrong",
          {
            updateItem:
              async () => ({}),
          },
        ),
      (error) =>
        error instanceof NotificationError &&
        error.statusCode === 400 &&
        error.code ===
          "NOTIFICATION_ID_INVALID",
    );
  },
);

test(
  "notification read mutation maps missing owned record to 404",
  async () => {
    await assert.rejects(
      () =>
        markNotificationRead(
          {
            authenticated: true,
            customerId:
              "tvc_11111111111111111111111111111111",
            walletAddress:
              recipient,
          },
          "gift-received:42",
          {
            updateItem:
              async () => {
                const error =
                  new Error(
                    "conditional failure",
                  );

                error.name =
                  "ConditionalCheckFailedException";

                throw error;
              },
          },
        ),
      (error) =>
        error instanceof NotificationError &&
        error.statusCode === 404 &&
        error.code ===
          "NOTIFICATION_NOT_FOUND",
    );
  },
);
