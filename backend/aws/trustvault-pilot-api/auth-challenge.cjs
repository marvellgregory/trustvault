const { randomBytes, randomUUID } = require("node:crypto");

const ARC_TESTNET_CHAIN_ID = 5_042_002;
const AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const AUTHENTICATE_ACCOUNT = "AUTHENTICATE_ACCOUNT";
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const ALLOWED_REQUEST_FIELDS = new Set([
  "walletAddress",
  "chainId",
  "intendedAction",
]);

class ChallengeRequestError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "ChallengeRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireTrustedDomain(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 253 ||
    /[\r\n\s]/.test(value)
  ) {
    throw new Error("TRUSTVAULT_AUTH_DOMAIN must be explicitly configured.");
  }

  return value;
}

function validateRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ChallengeRequestError(400, "INVALID_REQUEST", "A JSON object is required.");
  }

  if (Object.keys(input).some((key) => !ALLOWED_REQUEST_FIELDS.has(key))) {
    throw new ChallengeRequestError(400, "UNEXPECTED_FIELD", "The request contains an unsupported field.");
  }

  if (
    Object.keys(input).length !== ALLOWED_REQUEST_FIELDS.size ||
    typeof input.walletAddress !== "string" ||
    !EVM_ADDRESS_PATTERN.test(input.walletAddress)
  ) {
    throw new ChallengeRequestError(400, "INVALID_WALLET", "A valid EVM wallet address is required.");
  }

  if (input.chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new ChallengeRequestError(400, "UNSUPPORTED_CHAIN", "Arc Testnet is required.");
  }

  if (input.intendedAction !== AUTHENTICATE_ACCOUNT) {
    throw new ChallengeRequestError(400, "UNSUPPORTED_ACTION", "The intended action is not supported.");
  }

  return {
    walletAddress: input.walletAddress,
    normalizedAddress: input.walletAddress.toLowerCase(),
    chainId: ARC_TESTNET_CHAIN_ID,
    intendedAction: AUTHENTICATE_ACCOUNT,
  };
}

function createCanonicalMessage(challenge) {
  return [
    "TrustVault Wallet Authentication",
    "",
    "Signing this message proves control of this wallet for TrustVault account authentication.",
    "This does not initiate a blockchain transaction, transfer USDC, or approve token spending.",
    "",
    `Domain: ${challenge.domain}`,
    `Wallet: ${challenge.walletAddress}`,
    `Arc Chain ID: ${challenge.chainId}`,
    `Intended Action: ${challenge.intendedAction}`,
    `Challenge ID: ${challenge.challengeId}`,
    `Nonce: ${challenge.nonce}`,
    `Issued At: ${challenge.issuedAt}`,
    `Expires At: ${challenge.expiresAt}`,
  ].join("\n");
}

function issueAuthChallenge(input, options) {
  const request = validateRequest(input);
  const domain = requireTrustedDomain(options.domain);
  const now = options.now ? options.now() : new Date();

  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error("Challenge issuance requires a valid server time.");
  }

  const challengeId = options.randomUUID ? options.randomUUID() : randomUUID();
  const nonce = (options.randomBytes ? options.randomBytes(32) : randomBytes(32)).toString("hex");
  const issuedAt = now.toISOString();
  const expiresAtDate = new Date(now.getTime() + AUTH_CHALLENGE_TTL_MS);
  const expiresAt = expiresAtDate.toISOString();
  const expiresAtEpoch = Math.floor(expiresAtDate.getTime() / 1000);

  const challenge = {
    ...request,
    domain,
    challengeId,
    nonce,
    issuedAt,
    expiresAt,
  };

  return {
    item: {
      PK: `AUTH_CHALLENGE#${challengeId}`,
      SK: "CHALLENGE",
      entityType: "AUTH_CHALLENGE",
      schemaVersion: 1,
      challengeId,
      walletAddress: request.walletAddress,
      normalizedAddress: request.normalizedAddress,
      chainId: request.chainId,
      intendedAction: request.intendedAction,
      domain,
      nonce,
      issuedAt,
      expiresAt,
      expiresAtEpoch,
      status: "PENDING",
      createdAt: issuedAt,
    },
    response: {
      challengeId,
      message: createCanonicalMessage(challenge),
      walletAddress: request.walletAddress,
      chainId: request.chainId,
      domain,
      issuedAt,
      expiresAt,
    },
  };
}

module.exports = {
  ARC_TESTNET_CHAIN_ID,
  AUTH_CHALLENGE_TTL_MS,
  AUTHENTICATE_ACCOUNT,
  ChallengeRequestError,
  createCanonicalMessage,
  issueAuthChallenge,
  validateRequest,
};
