"use strict";

const TABLE_NAME =
  process.env.TRUSTVAULT_TABLE_NAME ||
  "TrustVaultPilot";

const CUSTOMER_ID_PATTERN =
  /^tvc_[a-zA-Z0-9]{32}$/;

const RECEIPT_ID_PATTERN =
  /^[a-zA-Z0-9:_-]{1,200}$/;

class MarketplaceReceiptError extends Error {
  constructor(
    statusCode,
    code,
    message,
  ) {
    super(message);
    this.name =
      "MarketplaceReceiptError";
    this.statusCode =
      statusCode;
    this.code =
      code;
  }
}

function stringValue(
  item,
  name,
) {
  return item?.[name]?.S;
}

function requireCustomerId(
  session,
) {
  const customerId =
    session?.customerId ?? "";

  if (
    !CUSTOMER_ID_PATTERN.test(
      customerId,
    )
  ) {
    throw new MarketplaceReceiptError(
      401,
      "RECEIPT_AUTHENTICATION_REQUIRED",
      "An authenticated customer session is required.",
    );
  }

  return customerId;
}

function requireSessionWallet(
  session,
) {
  const walletAddress =
    session?.walletAddress;

  if (
    typeof walletAddress !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(
      walletAddress,
    )
  ) {
    throw new MarketplaceReceiptError(
      401,
      "RECEIPT_WALLET_REQUIRED",
      "An authenticated wallet session is required.",
    );
  }

  return walletAddress;
}

function requireReceiptId(
  receiptId,
) {
  if (
    typeof receiptId !== "string" ||
    !RECEIPT_ID_PATTERN.test(
      receiptId,
    )
  ) {
    throw new MarketplaceReceiptError(
      400,
      "INVALID_RECEIPT_ID",
      "The Marketplace receipt identifier is invalid.",
    );
  }

  return receiptId;
}

function requireReceiptObject(
  receipt,
) {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt)
  ) {
    throw new MarketplaceReceiptError(
      400,
      "INVALID_MARKETPLACE_RECEIPT",
      "A Marketplace receipt object is required.",
    );
  }

  return receipt;
}

function validateReceiptForPersistence(
  session,
  receiptId,
  receipt,
) {
  const customerId =
    requireCustomerId(session);

  const walletAddress =
    requireSessionWallet(session);

  const validReceiptId =
    requireReceiptId(receiptId);

  const value =
    requireReceiptObject(receipt);

  if (
    value.id !== validReceiptId
  ) {
    throw new MarketplaceReceiptError(
      400,
      "RECEIPT_ID_MISMATCH",
      "The Marketplace receipt identifier does not match the request path.",
    );
  }

  if (
    value.type !== "purchase"
  ) {
    throw new MarketplaceReceiptError(
      400,
      "INVALID_MARKETPLACE_RECEIPT_TYPE",
      "Only Marketplace purchase receipts can be persisted by this route.",
    );
  }

  if (
    typeof value.orderId !== "string" ||
    value.orderId.length === 0
  ) {
    throw new MarketplaceReceiptError(
      400,
      "INVALID_RECEIPT_ORDER",
      "The Marketplace receipt must reference an order.",
    );
  }

  if (
    typeof value.createdAt !== "string" ||
    !Number.isFinite(
      Date.parse(value.createdAt),
    )
  ) {
    throw new MarketplaceReceiptError(
      400,
      "INVALID_RECEIPT_CREATED_AT",
      "The Marketplace receipt creation time is invalid.",
    );
  }

  if (
    typeof value.senderAddress !==
      "string" ||
    value.senderAddress.toLowerCase() !==
      walletAddress.toLowerCase()
  ) {
    throw new MarketplaceReceiptError(
      403,
      "RECEIPT_BUYER_WALLET_MISMATCH",
      "The Marketplace receipt does not belong to the authenticated wallet.",
    );
  }

  if (
    value.customer?.walletAddress &&
    value.customer.walletAddress
      .toLowerCase() !==
      walletAddress.toLowerCase()
  ) {
    throw new MarketplaceReceiptError(
      403,
      "RECEIPT_CUSTOMER_WALLET_MISMATCH",
      "The Marketplace receipt customer wallet does not match the authenticated wallet.",
    );
  }

  return Object.freeze({
    customerId,
    receiptId:
      validReceiptId,
    receipt:
      value,
  });
}

function receiptFromItem(
  item,
  expectedCustomerId,
) {
  if (!item) {
    return null;
  }

  if (
    stringValue(
      item,
      "entityType",
    ) !==
      "MARKETPLACE_RECEIPT" ||
    stringValue(
      item,
      "customerId",
    ) !==
      expectedCustomerId
  ) {
    throw new MarketplaceReceiptError(
      404,
      "MARKETPLACE_RECEIPT_NOT_FOUND",
      "The Marketplace receipt was not found.",
    );
  }

  const receiptJson =
    stringValue(
      item,
      "receiptJson",
    );

  if (!receiptJson) {
    throw new MarketplaceReceiptError(
      500,
      "MARKETPLACE_RECEIPT_INVALID",
      "The persisted Marketplace receipt is invalid.",
    );
  }

  let receipt;

  try {
    receipt =
      JSON.parse(receiptJson);
  } catch {
    throw new MarketplaceReceiptError(
      500,
      "MARKETPLACE_RECEIPT_INVALID",
      "The persisted Marketplace receipt is invalid.",
    );
  }

  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    receipt.id !==
      stringValue(
        item,
        "receiptId",
      )
  ) {
    throw new MarketplaceReceiptError(
      500,
      "MARKETPLACE_RECEIPT_INVALID",
      "The persisted Marketplace receipt is invalid.",
    );
  }

  return Object.freeze(
    receipt,
  );
}

async function saveMarketplaceReceipt(
  session,
  receiptId,
  receipt,
  options,
) {
  const validated =
    validateReceiptForPersistence(
      session,
      receiptId,
      receipt,
    );

  const now =
    options.now
      ? options.now()
      : new Date();

  if (
    !(now instanceof Date) ||
    !Number.isFinite(
      now.getTime(),
    )
  ) {
    throw new Error(
      "Marketplace receipt persistence requires valid server time.",
    );
  }

  const persistedReceipt = {
    ...validated.receipt,
  };

  await options.putItem({
    TableName:
      TABLE_NAME,

    Item: {
      PK: {
        S:
          `CUSTOMER#${validated.customerId}`,
      },

      SK: {
        S:
          `RECEIPT#${validated.receiptId}`,
      },

      entityType: {
        S:
          "MARKETPLACE_RECEIPT",
      },

      customerId: {
        S:
          validated.customerId,
      },

      receiptId: {
        S:
          validated.receiptId,
      },

      orderId: {
        S:
          persistedReceipt.orderId,
      },

      displayId: {
        S:
          String(
            persistedReceipt.displayId ??
              "",
          ),
      },

      transactionHash: {
        S:
          String(
            persistedReceipt.transactionHash ??
              "",
          ),
      },

      createdAt: {
        S:
          persistedReceipt.createdAt,
      },

      persistedAt: {
        S:
          now.toISOString(),
      },

      schemaVersion: {
        N:
          "1",
      },

      receiptJson: {
        S:
          JSON.stringify(
            persistedReceipt,
          ),
      },
    },
  });

  return Object.freeze(
    persistedReceipt,
  );
}

async function listMarketplaceReceipts(
  session,
  options,
) {
  const customerId =
    requireCustomerId(session);

  requireSessionWallet(
    session,
  );

  const loaded =
    await options.query({
      TableName:
        TABLE_NAME,

      KeyConditionExpression:
        "PK = :customerPk AND begins_with(SK, :receiptPrefix)",

      ExpressionAttributeValues: {
        ":customerPk": {
          S:
            `CUSTOMER#${customerId}`,
        },

        ":receiptPrefix": {
          S:
            "RECEIPT#",
        },
      },

      ConsistentRead:
        true,
    });

  const items =
    Array.isArray(
      loaded?.Items,
    )
      ? loaded.Items
      : [];

  const receipts =
    items
      .map((item) =>
        receiptFromItem(
          item,
          customerId,
        ),
      )
      .filter(Boolean);

  return Object.freeze(
    receipts.sort(
      (left, right) =>
        Date.parse(
          right.createdAt,
        ) -
        Date.parse(
          left.createdAt,
        ),
    ),
  );
}

async function getMarketplaceReceipt(
  session,
  receiptId,
  options,
) {
  const customerId =
    requireCustomerId(session);

  requireSessionWallet(
    session,
  );

  const validReceiptId =
    requireReceiptId(
      receiptId,
    );

  const loaded =
    await options.getItem({
      TableName:
        TABLE_NAME,

      Key: {
        PK: {
          S:
            `CUSTOMER#${customerId}`,
        },

        SK: {
          S:
            `RECEIPT#${validReceiptId}`,
        },
      },

      ConsistentRead:
        true,
    });

  return receiptFromItem(
    loaded?.Item,
    customerId,
  );
}

module.exports = {
  MarketplaceReceiptError,
  getMarketplaceReceipt,
  listMarketplaceReceipts,
  receiptFromItem,
  saveMarketplaceReceipt,
  validateReceiptForPersistence,
};
