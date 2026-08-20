const { randomUUID } = require("node:crypto");

const TABLE_NAME = "TrustVaultPilot";
const CUSTOMER_ID_PATTERN = /^tvc_[a-f0-9]{32}$/;
const EVM_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/;

class CustomerIdentityError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "CustomerIdentityError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function attribute(item, name) {
  return item?.[name]?.S;
}

function customerIdFromUuid(uuid) {
  const compact = uuid.replace(/-/g, "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(compact)) throw new Error("A valid server customer identifier is required.");
  return `tvc_${compact}`;
}

function readAssociation(item, normalizedAddress) {
  if (!item) return null;
  const status = attribute(item, "associationStatus");
  const customerId = attribute(item, "customerId");
  const storedAddress = attribute(item, "normalizedAddress");
  if (storedAddress !== normalizedAddress || !CUSTOMER_ID_PATTERN.test(customerId ?? "")) {
    throw new CustomerIdentityError(409, "INVALID_WALLET_ASSOCIATION", "The verified wallet association is invalid.");
  }
  if (status !== "VERIFIED") {
    throw new CustomerIdentityError(403, "WALLET_ASSOCIATION_NOT_VERIFIED", "The wallet association is not verified.");
  }
  return customerId;
}

function challengeUpdate(challenge, verifiedAt, nowEpoch) {
  return {
    Update: {
      TableName: TABLE_NAME,
      Key: { PK: { S: `AUTH_CHALLENGE#${challenge.challengeId}` }, SK: { S: "CHALLENGE" } },
      UpdateExpression: "SET #status = :verified, verifiedAt = :verifiedAt, consumedAt = :verifiedAt",
      ConditionExpression: "#status = :pending AND expiresAtEpoch >= :nowEpoch AND normalizedAddress = :address",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":verified": { S: "VERIFIED" },
        ":pending": { S: "PENDING" },
        ":verifiedAt": { S: verifiedAt },
        ":nowEpoch": { N: String(nowEpoch) },
        ":address": { S: challenge.normalizedAddress },
      },
    },
  };
}

function existingCustomerTransaction(challenge, customerId, verifiedAt, nowEpoch) {
  return {
    TransactItems: [
      challengeUpdate(challenge, verifiedAt, nowEpoch),
      {
        Update: {
          TableName: TABLE_NAME,
          Key: { PK: { S: `WALLET#${challenge.normalizedAddress}` }, SK: { S: "ASSOCIATION" } },
          UpdateExpression: "SET lastAuthenticatedAt = :at, updatedAt = :at",
          ConditionExpression: "customerId = :customerId AND associationStatus = :verified AND normalizedAddress = :address",
          ExpressionAttributeValues: {
            ":at": { S: verifiedAt }, ":customerId": { S: customerId }, ":verified": { S: "VERIFIED" }, ":address": { S: challenge.normalizedAddress },
          },
        },
      },
    ],
  };
}

function newCustomerTransaction(challenge, customerId, verifiedAt, nowEpoch) {
  const customerKey = `CUSTOMER#${customerId}`;
  const walletKey = `WALLET#${challenge.normalizedAddress}`;
  const commonAssociation = {
    entityType: { S: "WALLET_ASSOCIATION" }, customerId: { S: customerId }, address: { S: challenge.walletAddress },
    normalizedAddress: { S: challenge.normalizedAddress }, associationStatus: { S: "VERIFIED" }, role: { S: "PRIMARY" },
    verificationMethod: { S: "WALLET_SIGNATURE" }, verifiedAt: { S: verifiedAt }, linkedAt: { S: verifiedAt },
    updatedAt: { S: verifiedAt }, lastAuthenticatedAt: { S: verifiedAt }, schemaVersion: { N: "1" },
  };
  return {
    TransactItems: [
      challengeUpdate(challenge, verifiedAt, nowEpoch),
      { Put: { TableName: TABLE_NAME, Item: {
        PK: { S: walletKey }, SK: { S: "ASSOCIATION" }, ...commonAssociation, entityType: { S: "WALLET_LOOKUP" },
      }, ConditionExpression: "attribute_not_exists(PK)" } },
      { Put: { TableName: TABLE_NAME, Item: {
        PK: { S: customerKey }, SK: { S: "PROFILE" }, entityType: { S: "CUSTOMER" }, customerId: { S: customerId },
        schemaVersion: { N: "1" }, status: { S: "ACTIVE" }, preferredCurrency: { S: "USDC" }, createdAt: { S: verifiedAt }, updatedAt: { S: verifiedAt },
      }, ConditionExpression: "attribute_not_exists(PK)" } },
      { Put: { TableName: TABLE_NAME, Item: {
        PK: { S: customerKey }, SK: { S: walletKey }, ...commonAssociation,
      }, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" } },
    ],
  };
}

function isTransactionConflict(error) {
  return error?.name === "TransactionCanceledException" || error?.name === "ConditionalCheckFailedException";
}

async function loadWalletAssociation(normalizedAddress, getItem) {
  const loaded = await getItem({
    TableName: TABLE_NAME,
    Key: { PK: { S: `WALLET#${normalizedAddress}` }, SK: { S: "ASSOCIATION" } },
    ConsistentRead: true,
  });
  return readAssociation(loaded?.Item, normalizedAddress);
}

async function resolveOrCreateVerifiedCustomer(challenge, options) {
  if (!challenge || !EVM_ADDRESS_PATTERN.test(challenge.normalizedAddress ?? "") || challenge.walletAddress?.toLowerCase() !== challenge.normalizedAddress) {
    throw new CustomerIdentityError(401, "INVALID_VERIFIED_CHALLENGE", "A valid verified wallet challenge is required.");
  }
  const verifiedAt = options.verifiedAt;
  const nowEpoch = options.nowEpoch;
  let customerId = await loadWalletAssociation(challenge.normalizedAddress, options.getItem);

  if (customerId) {
    try {
      await options.transactWriteItems(existingCustomerTransaction(challenge, customerId, verifiedAt, nowEpoch));
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new CustomerIdentityError(409, "AUTHENTICATION_STATE_CONFLICT", "The authentication challenge has already been used or expired.");
      }
      throw error;
    }
    return { customerId, created: false };
  }

  customerId = customerIdFromUuid(options.randomUUID ? options.randomUUID() : randomUUID());
  try {
    await options.transactWriteItems(newCustomerTransaction(challenge, customerId, verifiedAt, nowEpoch));
    return { customerId, created: true };
  } catch (error) {
    if (!isTransactionConflict(error)) throw error;
  }

  const concurrentCustomerId = await loadWalletAssociation(challenge.normalizedAddress, options.getItem);
  if (!concurrentCustomerId) {
    throw new CustomerIdentityError(409, "CUSTOMER_CREATION_CONFLICT", "The customer identity could not be resolved safely.");
  }
  try {
    await options.transactWriteItems(existingCustomerTransaction(challenge, concurrentCustomerId, verifiedAt, nowEpoch));
  } catch (error) {
    if (isTransactionConflict(error)) {
      throw new CustomerIdentityError(409, "AUTHENTICATION_STATE_CONFLICT", "The authentication challenge has already been used or expired.");
    }
    throw error;
  }
  return { customerId: concurrentCustomerId, created: false };
}

module.exports = {
  CustomerIdentityError,
  customerIdFromUuid,
  resolveOrCreateVerifiedCustomer,
};
