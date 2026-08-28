"use strict";

const ARC_TESTNET_CHAIN_ID = 5_042_002;

class GiftVaultError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "GiftVaultError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireAuthenticatedSession(session) {
  if (
    !session ||
    typeof session.customerId !== "string" ||
    !session.customerId ||
    typeof session.walletAddress !== "string" ||
    !isAddress(session.walletAddress)
  ) {
    throw new GiftVaultError(
      401,
      "GIFT_VAULT_AUTHENTICATION_REQUIRED",
      "An authenticated TrustVault session is required.",
    );
  }

  if (session.chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new GiftVaultError(
      400,
      "GIFT_VAULT_WRONG_NETWORK",
      "Gift Vault metadata must use the authenticated Arc Testnet session.",
    );
  }

  return {
    customerId: session.customerId,
    walletAddress: normalizeAddress(session.walletAddress),
    chainId: session.chainId,
  };
}

function isAddress(value) {
  return (
    typeof value === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(value)
  );
}

function normalizeAddress(value) {
  return value.toLowerCase();
}

function isTransactionHash(value) {
  return (
    typeof value === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(value)
  );
}

function normalizePositiveIntegerString(value) {
  if (
    (typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "bigint") ||
    !/^[0-9]+$/.test(String(value))
  ) {
    return null;
  }

  try {
    const normalized = BigInt(String(value));

    if (normalized <= 0n) {
      return null;
    }

    return normalized.toString();
  } catch {
    return null;
  }
}

function countWords(value) {
  const trimmed = value.trim();

  if (!trimmed) return 0;

  return trimmed
    .split(/\s+/u)
    .filter(Boolean)
    .length;
}

function normalizeMessage(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault message must be text.",
    );
  }

  const message = value.trim();

  if (countWords(message) > 500) {
    throw new GiftVaultError(
      400,
      "GIFT_VAULT_MESSAGE_TOO_LONG",
      "Gift Vault message cannot exceed 500 words.",
    );
  }

  return message;
}

function validateGiftVaultForPersistence(
  session,
  input,
) {
  const authenticated =
    requireAuthenticatedSession(session);

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault metadata is invalid.",
    );
  }

  const allowedFields = new Set([
    "id",
    "recipientAddress",
    "amountBaseUnits",
    "unlockTimestamp",
    "transactionHash",
    "message",
  ]);

  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field)) {
      throw new GiftVaultError(
        400,
        "INVALID_GIFT_VAULT",
        `Unknown Gift Vault field: ${field}.`,
      );
    }
  }

  const id =
    normalizePositiveIntegerString(
      input.id,
    );

  if (!id) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault ID must be a positive onchain identifier.",
    );
  }

  if (!isAddress(input.recipientAddress)) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault recipient address is invalid.",
    );
  }

  const amountBaseUnits =
    normalizePositiveIntegerString(
      input.amountBaseUnits,
    );

  if (!amountBaseUnits) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault amount must be positive USDC base units.",
    );
  }

  const unlockTimestamp =
    normalizePositiveIntegerString(
      input.unlockTimestamp,
    );

  if (!unlockTimestamp) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault unlock timestamp is invalid.",
    );
  }

  if (
    !isTransactionHash(
      input.transactionHash,
    )
  ) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT",
      "Gift Vault transaction hash is invalid.",
    );
  }

  const message =
    normalizeMessage(input.message);

  return {
    customerId:
      authenticated.customerId,

    walletAddress:
      authenticated.walletAddress,

    gift: {
      id,
      senderAddress:
        authenticated.walletAddress,

      recipientAddress:
        normalizeAddress(
          input.recipientAddress,
        ),

      amountBaseUnits,
      unlockTimestamp,

      transactionHash:
        input.transactionHash.toLowerCase(),

      message,
    },
  };
}

function giftKey(giftId) {
  return {
    PK: {
      S: `GIFT_VAULT#${giftId}`,
    },

    SK: {
      S: "METADATA",
    },
  };
}

function deserializeGift(item) {
  if (
    !item ||
    item.entityType?.S !==
      "GIFT_VAULT" ||
    typeof item.giftJson?.S !==
      "string"
  ) {
    return null;
  }

  try {
    const gift =
      JSON.parse(item.giftJson.S);

    if (
      !gift ||
      typeof gift !== "object" ||
      Array.isArray(gift)
    ) {
      return null;
    }

    return gift;
  } catch {
    return null;
  }
}

function sameGift(left, right) {
  return (
    left.id === right.id &&
    normalizeAddress(
      left.senderAddress,
    ) ===
      normalizeAddress(
        right.senderAddress,
      ) &&
    normalizeAddress(
      left.recipientAddress,
    ) ===
      normalizeAddress(
        right.recipientAddress,
      ) &&
    left.amountBaseUnits ===
      right.amountBaseUnits &&
    left.unlockTimestamp ===
      right.unlockTimestamp &&
    left.transactionHash.toLowerCase() ===
      right.transactionHash.toLowerCase() &&
    left.message === right.message
  );
}

async function saveGiftVault(
  session,
  input,
  dependencies,
) {
  const {
    customerId,
    gift,
  } =
    validateGiftVaultForPersistence(
      session,
      input,
    );

  if (
    typeof dependencies?.getItem !==
      "function" ||
    typeof dependencies?.putItem !==
      "function"
  ) {
    throw new Error(
      "Gift Vault persistence dependencies are unavailable.",
    );
  }

  const key =
    giftKey(gift.id);

  const existing =
    await dependencies.getItem({
      TableName: "TrustVaultPilot",
      Key: key,
      ConsistentRead: true,
    });

  if (existing?.Item) {
    const persisted =
      deserializeGift(
        existing.Item,
      );

    if (
      persisted &&
      sameGift(
        persisted,
        gift,
      )
    ) {
      return persisted;
    }

    throw new GiftVaultError(
      409,
      "GIFT_VAULT_ALREADY_EXISTS",
      "Gift Vault metadata already exists for this onchain gift.",
    );
  }

  const now =
    (
      dependencies.now?.() ??
      new Date()
    ).toISOString();

  const storedGift = {
    ...gift,
    createdAt: now,
    updatedAt: now,
  };

  await dependencies.putItem({
    TableName: "TrustVaultPilot",

    Item: {
      ...key,

      entityType: {
        S: "GIFT_VAULT",
      },

      giftId: {
        S: storedGift.id,
      },

      customerId: {
        S: customerId,
      },

      senderAddress: {
        S:
          storedGift.senderAddress,
      },

      recipientAddress: {
        S:
          storedGift.recipientAddress,
      },

      transactionHash: {
        S:
          storedGift.transactionHash,
      },

      createdAt: {
        S: now,
      },

      giftJson: {
        S:
          JSON.stringify(
            storedGift,
          ),
      },
    },

    ConditionExpression:
      "attribute_not_exists(PK)",
  });

  return storedGift;
}

async function getGiftVault(
  session,
  giftId,
  dependencies,
) {
  const authenticated =
    requireAuthenticatedSession(
      session,
    );

  const normalizedGiftId =
    normalizePositiveIntegerString(
      giftId,
    );

  if (!normalizedGiftId) {
    throw new GiftVaultError(
      400,
      "INVALID_GIFT_VAULT_ID",
      "Gift Vault ID is invalid.",
    );
  }

  if (
    typeof dependencies?.getItem !==
    "function"
  ) {
    throw new Error(
      "Gift Vault read dependency is unavailable.",
    );
  }

  const result =
    await dependencies.getItem({
      TableName:
        "TrustVaultPilot",

      Key:
        giftKey(
          normalizedGiftId,
        ),

      ConsistentRead: true,
    });

  const gift =
    deserializeGift(
      result?.Item,
    );

  if (!gift) {
    throw new GiftVaultError(
      404,
      "GIFT_VAULT_NOT_FOUND",
      "Gift Vault metadata could not be found.",
    );
  }

  const wallet =
    authenticated.walletAddress;

  const isSender =
    normalizeAddress(
      gift.senderAddress,
    ) === wallet;

  const isRecipient =
    normalizeAddress(
      gift.recipientAddress,
    ) === wallet;

  if (
    !isSender &&
    !isRecipient
  ) {
    // Deliberately return 404 rather than
    // revealing that private metadata exists.
    throw new GiftVaultError(
      404,
      "GIFT_VAULT_NOT_FOUND",
      "Gift Vault metadata could not be found.",
    );
  }

  return gift;
}

module.exports = {
  ARC_TESTNET_CHAIN_ID,
  GiftVaultError,
  countWords,
  getGiftVault,
  saveGiftVault,
  validateGiftVaultForPersistence,
};
