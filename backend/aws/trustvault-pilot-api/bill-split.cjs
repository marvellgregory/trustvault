"use strict";

const TABLE_NAME =
  process.env.TABLE_NAME ||
  "TrustVaultPilot";

const BILL_PREFIX =
  "BILL_SPLIT#";

const ENTITY_TYPE =
  "BILL_SPLIT";

class BillSplitError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "BillSplitError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireAuthenticatedSession(session) {
  const customerId =
    typeof session?.customerId === "string"
      ? session.customerId.trim()
      : "";

  const walletAddress =
    typeof session?.walletAddress === "string"
      ? session.walletAddress.trim().toLowerCase()
      : "";

  if (!customerId || !walletAddress) {
    throw new BillSplitError(
      401,
      "BILL_SPLIT_AUTHENTICATION_REQUIRED",
      "Authentication is required.",
    );
  }

  return {
    customerId,
    walletAddress,
  };
}

function requireString(value, field) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      `${field} is required.`,
    );
  }

  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Optional string field is invalid.",
    );
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function normalizeAddress(value, field) {
  const address =
    requireString(value, field).toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      `${field} must be a valid EVM address.`,
    );
  }

  return address;
}

function requireBaseUnits(value, field) {
  const normalized =
    requireString(value, field);

  if (!/^\d+$/.test(normalized)) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      `${field} must contain integer base units.`,
    );
  }

  if (BigInt(normalized) <= 0n) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      `${field} must be greater than zero.`,
    );
  }

  return normalized;
}

function requireIsoDate(value, field) {
  const normalized =
    requireString(value, field);

  if (Number.isNaN(Date.parse(normalized))) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      `${field} must be an ISO date.`,
    );
  }

  return normalized;
}

function validateParticipant(participant) {
  if (
    !participant ||
    typeof participant !== "object" ||
    Array.isArray(participant)
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split participant is invalid.",
    );
  }

  const status =
    participant.status;

  if (
    status !== "pending" &&
    status !== "paid"
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Participant status is invalid.",
    );
  }

  const settlementType =
    participant.settlementType;

  if (
    settlementType !== undefined &&
    settlementType !== "onchain-usdc" &&
    settlementType !== "organizer-self-share"
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Participant settlement type is invalid.",
    );
  }

  const transactionHash =
    optionalString(
      participant.transactionHash,
    );

  if (
    transactionHash !== undefined &&
    !/^0x[a-fA-F0-9]{64}$/.test(
      transactionHash,
    )
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Participant transaction hash is invalid.",
    );
  }

  return {
    id: requireString(
      participant.id,
      "participant.id",
    ),

    name: requireString(
      participant.name,
      "participant.name",
    ),

    walletAddress: normalizeAddress(
      participant.walletAddress,
      "participant.walletAddress",
    ),

    amountBaseUnits: requireBaseUnits(
      participant.amountBaseUnits,
      "participant.amountBaseUnits",
    ),

    amount: requireString(
      participant.amount,
      "participant.amount",
    ),

    status,

    ...(transactionHash
      ? {
          transactionHash,
        }
      : {}),

    ...(optionalString(
      participant.explorerUrl,
    )
      ? {
          explorerUrl:
            optionalString(
              participant.explorerUrl,
            ),
        }
      : {}),

    ...(participant.paidAt
      ? {
          paidAt: requireIsoDate(
            participant.paidAt,
            "participant.paidAt",
          ),
        }
      : {}),

    ...(settlementType
      ? {
          settlementType,
        }
      : {}),
  };
}

function validateBillSplitForPersistence(
  session,
  bill,
) {
  const identity =
    requireAuthenticatedSession(session);

  if (
    !bill ||
    typeof bill !== "object" ||
    Array.isArray(bill)
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split payload is invalid.",
    );
  }

  const organizerAddress =
    normalizeAddress(
      bill.organizerAddress,
      "organizerAddress",
    );

  if (
    organizerAddress !==
    identity.walletAddress
  ) {
    throw new BillSplitError(
      403,
      "BILL_SPLIT_OWNERSHIP_MISMATCH",
      "Bill Split organizer does not match the authenticated wallet.",
    );
  }

  if (bill.asset !== "USDC") {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split asset must be USDC.",
    );
  }

  if (bill.network !== "Arc Testnet") {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split network must be Arc Testnet.",
    );
  }

  if (
    bill.splitMethod !== "equal" &&
    bill.splitMethod !== "custom"
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split method is invalid.",
    );
  }

  if (
    bill.status !== "active" &&
    bill.status !== "settled"
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split status is invalid.",
    );
  }

  if (
    !Array.isArray(bill.participants) ||
    bill.participants.length === 0
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split requires participants.",
    );
  }

  const participants =
    bill.participants.map(
      validateParticipant,
    );

  const totalBaseUnits =
    requireBaseUnits(
      bill.totalBaseUnits,
      "totalBaseUnits",
    );

  const participantTotal =
    participants.reduce(
      (total, participant) =>
        total +
        BigInt(
          participant.amountBaseUnits,
        ),
      0n,
    );

  if (
    participantTotal !==
    BigInt(totalBaseUnits)
  ) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Participant base-unit total must equal Bill Split total.",
    );
  }

  const allPaid =
    participants.every(
      (participant) =>
        participant.status === "paid",
    );

  const expectedStatus =
    allPaid
      ? "settled"
      : "active";

  if (bill.status !== expectedStatus) {
    throw new BillSplitError(
      400,
      "INVALID_BILL_SPLIT",
      "Bill Split status does not match participant settlement state.",
    );
  }

  return {
    customerId:
      identity.customerId,

    walletAddress:
      identity.walletAddress,

    bill: {
      id: requireString(
        bill.id,
        "id",
      ),

      title: requireString(
        bill.title,
        "title",
      ),

      ...(optionalString(bill.note)
        ? {
            note:
              optionalString(
                bill.note,
              ),
          }
        : {}),

      totalAmount:
        requireString(
          bill.totalAmount,
          "totalAmount",
        ),

      totalBaseUnits,

      asset: "USDC",

      network: "Arc Testnet",

      organizerAddress,

      splitMethod:
        bill.splitMethod,

      participants,

      createdAt:
        requireIsoDate(
          bill.createdAt,
          "createdAt",
        ),

      updatedAt:
        requireIsoDate(
          bill.updatedAt,
          "updatedAt",
        ),

      status:
        expectedStatus,
    },
  };
}

function billKey(customerId, billId) {
  return {
    PK: {
      S: `CUSTOMER#${customerId}`,
    },

    SK: {
      S: `${BILL_PREFIX}${billId}`,
    },
  };
}

function itemToBill(
  item,
  customerId,
) {
  if (
    !item ||
    item.entityType?.S !== ENTITY_TYPE ||
    item.customerId?.S !== customerId ||
    typeof item.billJson?.S !== "string"
  ) {
    throw new BillSplitError(
      404,
      "BILL_SPLIT_NOT_FOUND",
      "Bill Split could not be found.",
    );
  }

  try {
    return JSON.parse(
      item.billJson.S,
    );
  } catch {
    throw new BillSplitError(
      500,
      "BILL_SPLIT_STORAGE_INVALID",
      "Stored Bill Split data is invalid.",
    );
  }
}

async function saveBillSplit(
  session,
  bill,
  dependencies = {},
) {
  const {
    customerId,
    walletAddress,
    bill: validatedBill,
  } =
    validateBillSplitForPersistence(
      session,
      bill,
    );

  const putItem =
    dependencies.putItem;

  if (typeof putItem !== "function") {
    throw new Error(
      "Bill Split putItem dependency is required.",
    );
  }

  const now =
    dependencies.now?.() ??
    new Date();

  const updatedBill = {
    ...validatedBill,
    updatedAt:
      now.toISOString(),
  };

  await putItem({
    TableName: TABLE_NAME,

    Item: {
      ...billKey(
        customerId,
        updatedBill.id,
      ),

      entityType: {
        S: ENTITY_TYPE,
      },

      customerId: {
        S: customerId,
      },

      organizerAddress: {
        S: walletAddress,
      },

      billId: {
        S: updatedBill.id,
      },

      status: {
        S: updatedBill.status,
      },

      createdAt: {
        S: updatedBill.createdAt,
      },

      updatedAt: {
        S: updatedBill.updatedAt,
      },

      billJson: {
        S: JSON.stringify(
          updatedBill,
        ),
      },
    },
  });

  return updatedBill;
}

async function getBillSplit(
  session,
  billId,
  dependencies = {},
) {
  const identity =
    requireAuthenticatedSession(
      session,
    );

  const getItem =
    dependencies.getItem;

  if (typeof getItem !== "function") {
    throw new Error(
      "Bill Split getItem dependency is required.",
    );
  }

  const id =
    requireString(
      billId,
      "billId",
    );

  const result =
    await getItem({
      TableName: TABLE_NAME,

      Key: billKey(
        identity.customerId,
        id,
      ),

      ConsistentRead: true,
    });

  return itemToBill(
    result?.Item,
    identity.customerId,
  );
}

async function listBillSplits(
  session,
  dependencies = {},
) {
  const identity =
    requireAuthenticatedSession(
      session,
    );

  const query =
    dependencies.query;

  if (typeof query !== "function") {
    throw new Error(
      "Bill Split query dependency is required.",
    );
  }

  const result =
    await query({
      TableName: TABLE_NAME,

      KeyConditionExpression:
        "PK = :customerPk AND begins_with(SK, :billPrefix)",

      ExpressionAttributeValues: {
        ":customerPk": {
          S: `CUSTOMER#${identity.customerId}`,
        },

        ":billPrefix": {
          S: BILL_PREFIX,
        },
      },

      ConsistentRead: true,
    });

  return (result?.Items ?? [])
    .map((item) =>
      itemToBill(
        item,
        identity.customerId,
      ),
    )
    .sort(
      (left, right) =>
        new Date(
          right.updatedAt,
        ).getTime() -
        new Date(
          left.updatedAt,
        ).getTime(),
    );
}

module.exports = {
  BillSplitError,
  getBillSplit,
  listBillSplits,
  saveBillSplit,
  validateBillSplitForPersistence,
};
