"use strict";

const TABLE_NAME = "TrustVaultPilot";

const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/;
const NOTIFICATION_ID_PATTERN = /^[a-zA-Z0-9:_-]{1,160}$/;

const ALLOWED_TYPES = new Set([
  "GIFT_RECEIVED",
  "GIFT_UNLOCKED",
  "GIFT_CLAIMED",
  "BILL_SPLIT_REQUEST",
  "BILL_SPLIT_PAID",
  "ORDER_UPDATE",
  "RECEIPT_READY",
]);

const ALLOWED_RESOURCES = new Set([
  "GIFT_VAULT",
  "BILL_SPLIT",
  "MARKETPLACE_ORDER",
  "MARKETPLACE_RECEIPT",
]);

class NotificationError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "NotificationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeAddress(value) {
  if (
    typeof value !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(value)
  ) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION_RECIPIENT",
      "Notification recipient wallet is invalid.",
    );
  }

  return value.toLowerCase();
}

function requireAuthenticatedWallet(session) {
  if (
    session?.authenticated !== true ||
    typeof session.walletAddress !== "string" ||
    !ADDRESS_PATTERN.test(session.walletAddress)
  ) {
    throw new NotificationError(
      401,
      "NOTIFICATION_AUTHENTICATION_REQUIRED",
      "An authenticated wallet session is required.",
    );
  }

  return session.walletAddress;
}

function requireString(value, field, maxLength = 240) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION",
      `Notification ${field} is invalid.`,
    );
  }

  return value;
}

function notificationKey(recipientAddress, notificationId) {
  return {
    PK: {
      S: `WALLET#${normalizeAddress(recipientAddress)}`,
    },
    SK: {
      S: `NOTIFICATION#${requireString(
        notificationId,
        "id",
        160,
      )}`,
    },
  };
}

function validateNotification(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION",
      "A notification object is required.",
    );
  }

  const allowedFields = new Set([
    "id",
    "recipientAddress",
    "type",
    "resource",
    "resourceId",
    "title",
    "body",
    "actionPath",
  ]);

  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      throw new NotificationError(
        400,
        "INVALID_NOTIFICATION",
        `Unknown notification field: ${field}.`,
      );
    }
  }

  const id = requireString(input.id, "id", 160);

  if (!NOTIFICATION_ID_PATTERN.test(id)) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION",
      "Notification ID is invalid.",
    );
  }

  const recipientAddress =
    normalizeAddress(input.recipientAddress);

  const type = requireString(input.type, "type", 80);

  if (!ALLOWED_TYPES.has(type)) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION_TYPE",
      "Notification type is not supported.",
    );
  }

  const resource =
    requireString(input.resource, "resource", 80);

  if (!ALLOWED_RESOURCES.has(resource)) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION_RESOURCE",
      "Notification resource is not supported.",
    );
  }

  const resourceId =
    requireString(input.resourceId, "resourceId", 160);

  const title =
    requireString(input.title, "title", 160);

  const body =
    requireString(input.body, "body", 500);

  const actionPath =
    requireString(input.actionPath, "actionPath", 500);

  if (
    !actionPath.startsWith("/") ||
    actionPath.startsWith("//") ||
    actionPath.includes("://")
  ) {
    throw new NotificationError(
      400,
      "INVALID_NOTIFICATION_ACTION",
      "Notification action must be a TrustVault path.",
    );
  }

  return Object.freeze({
    id,
    recipientAddress,
    type,
    resource,
    resourceId,
    title,
    body,
    actionPath,
  });
}

function notificationFromItem(item) {
  if (!item) return null;

  const value = (name) => item?.[name]?.S;

  const notification = {
    id: value("notificationId"),
    recipientAddress: value("recipientAddress"),
    type: value("notificationType"),
    resource: value("resource"),
    resourceId: value("resourceId"),
    title: value("title"),
    body: value("body"),
    actionPath: value("actionPath"),
    status: value("status"),
    createdAt: value("createdAt"),
  };

  if (
    !NOTIFICATION_ID_PATTERN.test(notification.id ?? "") ||
    !ADDRESS_PATTERN.test(notification.recipientAddress ?? "") ||
    !ALLOWED_TYPES.has(notification.type) ||
    !ALLOWED_RESOURCES.has(notification.resource) ||
    notification.status !== "UNREAD" ||
    !Number.isFinite(
      Date.parse(notification.createdAt ?? ""),
    )
  ) {
    throw new NotificationError(
      500,
      "NOTIFICATION_INVALID",
      "Stored notification data is invalid.",
    );
  }

  return Object.freeze(notification);
}

async function saveNotification(input, dependencies) {
  if (typeof dependencies?.putItem !== "function") {
    throw new Error(
      "Notification putItem dependency is required.",
    );
  }

  const notification = validateNotification(input);

  const now =
    dependencies.now?.() ?? new Date();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    throw new Error(
      "Notification persistence requires valid server time.",
    );
  }

  const createdAt = now.toISOString();

  try {
    await dependencies.putItem({
      TableName: TABLE_NAME,

      Item: {
        ...notificationKey(
          notification.recipientAddress,
          notification.id,
        ),

        entityType: {
          S: "NOTIFICATION",
        },

        schemaVersion: {
          N: "1",
        },

        notificationId: {
          S: notification.id,
        },

        recipientAddress: {
          S: notification.recipientAddress,
        },

        notificationType: {
          S: notification.type,
        },

        resource: {
          S: notification.resource,
        },

        resourceId: {
          S: notification.resourceId,
        },

        title: {
          S: notification.title,
        },

        body: {
          S: notification.body,
        },

        actionPath: {
          S: notification.actionPath,
        },

        status: {
          S: "UNREAD",
        },

        createdAt: {
          S: createdAt,
        },
      },

      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    });
  } catch (error) {
    if (
      error?.name ===
      "ConditionalCheckFailedException"
    ) {
      throw new NotificationError(
        409,
        "NOTIFICATION_ALREADY_EXISTS",
        "The notification already exists.",
      );
    }

    throw error;
  }

  return Object.freeze({
    ...notification,
    status: "UNREAD",
    createdAt,
  });
}

async function listNotifications(session, dependencies) {
  const wallet =
    requireAuthenticatedWallet(session);

  if (typeof dependencies?.query !== "function") {
    throw new Error(
      "Notification query dependency is required.",
    );
  }

  const result = await dependencies.query({
    TableName: TABLE_NAME,

    KeyConditionExpression:
      "PK = :walletPk AND begins_with(SK, :notificationPrefix)",

    ExpressionAttributeValues: {
      ":walletPk": {
        S: `WALLET#${wallet}`,
      },

      ":notificationPrefix": {
        S: "NOTIFICATION#",
      },
    },

    ConsistentRead: true,
  });

  return Object.freeze(
    (result?.Items ?? [])
      .map(notificationFromItem)
      .filter(Boolean)
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) -
          Date.parse(left.createdAt),
      ),
  );
}

module.exports = {
  ALLOWED_RESOURCES,
  ALLOWED_TYPES,
  NotificationError,
  listNotifications,
  notificationFromItem,
  notificationKey,
  saveNotification,
  validateNotification,
};
