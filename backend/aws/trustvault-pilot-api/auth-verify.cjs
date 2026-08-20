const { recoverMessageAddress } = require("viem");
const {
  ARC_TESTNET_CHAIN_ID,
  AUTHENTICATE_ACCOUNT,
  createCanonicalMessage,
} = require("./auth-challenge.cjs");

const SIGNATURE_PATTERN = /^0x[a-fA-F0-9]{130}$/;
const CHALLENGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const ALLOWED_VERIFICATION_FIELDS = new Set([
  "challengeId",
  "signature",
]);

class AuthVerificationError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "AuthVerificationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function validateVerificationRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AuthVerificationError(
      400,
      "INVALID_REQUEST",
      "A JSON object is required.",
    );
  }

  const keys = Object.keys(input);

  if (
    keys.length !== ALLOWED_VERIFICATION_FIELDS.size ||
    keys.some((key) => !ALLOWED_VERIFICATION_FIELDS.has(key))
  ) {
    throw new AuthVerificationError(
      400,
      "INVALID_REQUEST",
      "The verification request is invalid.",
    );
  }

  if (
    typeof input.challengeId !== "string" ||
    !CHALLENGE_ID_PATTERN.test(input.challengeId)
  ) {
    throw new AuthVerificationError(
      400,
      "INVALID_CHALLENGE_ID",
      "A valid challenge identifier is required.",
    );
  }

  if (
    typeof input.signature !== "string" ||
    !SIGNATURE_PATTERN.test(input.signature)
  ) {
    throw new AuthVerificationError(
      400,
      "INVALID_SIGNATURE",
      "A valid wallet signature is required.",
    );
  }

  return {
    challengeId: input.challengeId,
    signature: input.signature,
  };
}

function readString(item, key) {
  const value = item?.[key]?.S;

  if (typeof value !== "string" || value.length === 0) {
    throw new AuthVerificationError(
      401,
      "INVALID_CHALLENGE",
      "The authentication challenge is invalid.",
    );
  }

  return value;
}

function readNumber(item, key) {
  const raw = item?.[key]?.N;
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new AuthVerificationError(
      401,
      "INVALID_CHALLENGE",
      "The authentication challenge is invalid.",
    );
  }

  return value;
}

function challengeFromItem(item) {
  const chainId = readNumber(item, "chainId");

  if (
    readString(item, "entityType") !== "AUTH_CHALLENGE" ||
    chainId !== ARC_TESTNET_CHAIN_ID ||
    readString(item, "intendedAction") !== AUTHENTICATE_ACCOUNT
  ) {
    throw new AuthVerificationError(
      401,
      "INVALID_CHALLENGE",
      "The authentication challenge is invalid.",
    );
  }

  return {
    challengeId: readString(item, "challengeId"),
    walletAddress: readString(item, "walletAddress"),
    normalizedAddress: readString(item, "normalizedAddress"),
    chainId,
    intendedAction: AUTHENTICATE_ACCOUNT,
    domain: readString(item, "domain"),
    nonce: readString(item, "nonce"),
    issuedAt: readString(item, "issuedAt"),
    expiresAt: readString(item, "expiresAt"),
    expiresAtEpoch: readNumber(item, "expiresAtEpoch"),
    status: readString(item, "status"),
  };
}

async function verifyAuthChallenge(input, options) {
  const request = validateVerificationRequest(input);
  const now = options.now ? options.now() : new Date();

  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Authentication verification requires valid server time.");
  }

  const loaded = await options.getItem({
    TableName: "TrustVaultPilot",
    Key: {
      PK: { S: `AUTH_CHALLENGE#${request.challengeId}` },
      SK: { S: "CHALLENGE" },
    },
    ConsistentRead: true,
  });

  if (!loaded?.Item) {
    throw new AuthVerificationError(
      401,
      "CHALLENGE_NOT_FOUND",
      "The authentication challenge is invalid or unavailable.",
    );
  }

  const challenge = challengeFromItem(loaded.Item);

  if (challenge.challengeId !== request.challengeId) {
    throw new AuthVerificationError(
      401,
      "INVALID_CHALLENGE",
      "The authentication challenge is invalid.",
    );
  }

  if (challenge.status !== "PENDING") {
    throw new AuthVerificationError(
      409,
      "CHALLENGE_ALREADY_USED",
      "The authentication challenge has already been used.",
    );
  }

  const nowEpoch = Math.floor(now.getTime() / 1000);

  if (
    challenge.expiresAtEpoch < nowEpoch ||
    Date.parse(challenge.expiresAt) <= now.getTime()
  ) {
    throw new AuthVerificationError(
      401,
      "CHALLENGE_EXPIRED",
      "The authentication challenge has expired.",
    );
  }

  const canonicalMessage = createCanonicalMessage(challenge);

  let recoveredAddress;

  try {
    recoveredAddress = await recoverMessageAddress({
      message: canonicalMessage,
      signature: request.signature,
    });
  } catch {
    throw new AuthVerificationError(
      401,
      "SIGNATURE_VERIFICATION_FAILED",
      "The wallet signature could not be verified.",
    );
  }

  if (
    recoveredAddress.toLowerCase() !== challenge.normalizedAddress ||
    challenge.walletAddress.toLowerCase() !== challenge.normalizedAddress
  ) {
    throw new AuthVerificationError(
      401,
      "SIGNER_MISMATCH",
      "The signature does not match the authentication wallet.",
    );
  }

  const verifiedAt = now.toISOString();

  try {
    await options.updateItem({
      TableName: "TrustVaultPilot",
      Key: {
        PK: { S: `AUTH_CHALLENGE#${request.challengeId}` },
        SK: { S: "CHALLENGE" },
      },
      UpdateExpression:
        "SET #status = :verified, verifiedAt = :verifiedAt, consumedAt = :consumedAt",
      ConditionExpression:
        "#status = :pending AND expiresAtEpoch >= :nowEpoch",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":verified": { S: "VERIFIED" },
        ":pending": { S: "PENDING" },
        ":verifiedAt": { S: verifiedAt },
        ":consumedAt": { S: verifiedAt },
        ":nowEpoch": { N: String(nowEpoch) },
      },
    });
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") {
      throw new AuthVerificationError(
        409,
        "CHALLENGE_ALREADY_USED_OR_EXPIRED",
        "The authentication challenge has already been used or expired.",
      );
    }

    throw error;
  }

  return {
    authenticated: true,
    walletAddress: challenge.walletAddress,
    associationStatus: "VERIFIED",
    expiresAt: challenge.expiresAt,
  };
}

module.exports = {
  AuthVerificationError,
  challengeFromItem,
  validateVerificationRequest,
  verifyAuthChallenge,
};
