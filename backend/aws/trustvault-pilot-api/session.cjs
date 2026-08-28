const { createHash, randomBytes } = require("node:crypto");
const { ARC_TESTNET_CHAIN_ID } = require("./auth-challenge.cjs");

const TABLE_NAME = "TrustVaultPilot";
const SESSION_COOKIE_NAME = "__Host-trustvault_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CUSTOMER_ID_PATTERN = /^tvc_[a-f0-9]{32}$/;
const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/;

class SessionError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "SessionError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function tokenDigest(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createSessionPlan(identity, options = {}) {
  if (!CUSTOMER_ID_PATTERN.test(identity.customerId ?? "") || !ADDRESS_PATTERN.test(identity.normalizedAddress ?? "") || identity.chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new SessionError(401, "INVALID_AUTHENTICATED_IDENTITY", "A verified TrustVault identity is required.");
  }
  const now = options.now ? options.now() : new Date();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Session creation requires valid server time.");
  const token = (options.randomBytes ? options.randomBytes(32) : randomBytes(32)).toString("base64url");
  if (!SESSION_TOKEN_PATTERN.test(token)) throw new Error("Session randomness is invalid.");
  const sessionId = tokenDigest(token);
  const createdAt = now.toISOString();
  const expiresAtDate = new Date(now.getTime() + SESSION_TTL_MS);
  const expiresAt = expiresAtDate.toISOString();
  const expiresAtEpoch = Math.floor(expiresAtDate.getTime() / 1000);
  return {
    token,
    sessionId,
    expiresAt,
    transactItem: {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: { S: `SESSION#${sessionId}` }, SK: { S: "SESSION" }, entityType: { S: "AUTH_SESSION" },
          schemaVersion: { N: "1" }, sessionId: { S: sessionId }, customerId: { S: identity.customerId },
          normalizedAddress: { S: identity.normalizedAddress }, chainId: { N: String(identity.chainId) },
          status: { S: "ACTIVE" }, authenticationMethod: { S: "WALLET_SIGNATURE" },
          createdAt: { S: createdAt }, expiresAt: { S: expiresAt }, expiresAtEpoch: { N: String(expiresAtEpoch) },
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
  };
}

function cookieHeader(token, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)) {
  if (!SESSION_TOKEN_PATTERN.test(token)) throw new Error("A valid session credential is required.");
  return `${SESSION_COOKIE_NAME}=${token}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=None`;
}

function clearCookieHeader() {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None`;
}

function sessionTokenFromHeaders(headers) {
  const cookie = headers?.cookie ?? headers?.Cookie;
  if (typeof cookie !== "string") throw new SessionError(401, "SESSION_MISSING", "An authenticated session is required.");
  const pair = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = pair?.slice(SESSION_COOKIE_NAME.length + 1);
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) throw new SessionError(401, "SESSION_MALFORMED", "The authenticated session is invalid.");
  return token;
}

function stringValue(item, name) {
  return item?.[name]?.S;
}

function numberValue(item, name) {
  return Number(item?.[name]?.N);
}

async function resolveSessionFromToken(token, options) {
  if (!SESSION_TOKEN_PATTERN.test(token ?? "")) throw new SessionError(401, "SESSION_MALFORMED", "The authenticated session is invalid.");
  const sessionId = tokenDigest(token);
  const loaded = await options.getItem({ TableName: TABLE_NAME, Key: { PK: { S: `SESSION#${sessionId}` }, SK: { S: "SESSION" } }, ConsistentRead: true });
  if (!loaded?.Item) throw new SessionError(401, "SESSION_UNKNOWN", "The authenticated session is invalid or unavailable.");
  const item = loaded.Item;
  const customerId = stringValue(item, "customerId");
  const normalizedAddress = stringValue(item, "normalizedAddress");
  const chainId = numberValue(item, "chainId");
  const expiresAt = stringValue(item, "expiresAt");
  const expiresAtEpoch = numberValue(item, "expiresAtEpoch");
  const now = options.now ? options.now() : new Date();
  if (stringValue(item, "sessionId") !== sessionId || !CUSTOMER_ID_PATTERN.test(customerId ?? "") || !ADDRESS_PATTERN.test(normalizedAddress ?? "") || chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new SessionError(401, "SESSION_INVALID", "The authenticated session is invalid.");
  }
  if (stringValue(item, "status") !== "ACTIVE") throw new SessionError(401, "SESSION_REVOKED", "The authenticated session is no longer active.");
  if (!Number.isFinite(Date.parse(expiresAt ?? "")) || expiresAtEpoch < Math.floor(now.getTime() / 1000) || Date.parse(expiresAt) <= now.getTime()) {
    throw new SessionError(401, "SESSION_EXPIRED", "The authenticated session has expired.");
  }
  const [customer, wallet] = await Promise.all([
    options.getItem({ TableName: TABLE_NAME, Key: { PK: { S: `CUSTOMER#${customerId}` }, SK: { S: "PROFILE" } }, ConsistentRead: true }),
    options.getItem({ TableName: TABLE_NAME, Key: { PK: { S: `WALLET#${normalizedAddress}` }, SK: { S: "ASSOCIATION" } }, ConsistentRead: true }),
  ]);
  if (stringValue(customer?.Item, "customerId") !== customerId || stringValue(customer?.Item, "status") !== "ACTIVE") {
    throw new SessionError(401, "SESSION_CUSTOMER_MISMATCH", "The session customer is invalid or unavailable.");
  }
  if (stringValue(wallet?.Item, "customerId") !== customerId || stringValue(wallet?.Item, "normalizedAddress") !== normalizedAddress || stringValue(wallet?.Item, "associationStatus") !== "VERIFIED") {
    throw new SessionError(401, "SESSION_WALLET_MISMATCH", "The session wallet association is invalid.");
  }
  return Object.freeze({ sessionId, customerId, walletAddress: normalizedAddress, chainId, expiresAt, authenticated: true });
}

async function resolveSessionFromHeaders(headers, options) {
  return resolveSessionFromToken(sessionTokenFromHeaders(headers), options);
}

async function revokeSessionFromHeaders(headers, options) {
  const token = sessionTokenFromHeaders(headers);
  const session = await resolveSessionFromToken(token, options);
  try {
    await options.updateItem({
      TableName: TABLE_NAME, Key: { PK: { S: `SESSION#${session.sessionId}` }, SK: { S: "SESSION" } },
      UpdateExpression: "SET #status = :revoked, revokedAt = :at, updatedAt = :at",
      ConditionExpression: "#status = :active AND customerId = :customerId AND normalizedAddress = :address",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":revoked": { S: "REVOKED" }, ":active": { S: "ACTIVE" }, ":at": { S: (options.now ? options.now() : new Date()).toISOString() }, ":customerId": { S: session.customerId }, ":address": { S: session.walletAddress } },
    });
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") {
      throw new SessionError(401, "SESSION_REVOKED", "The authenticated session is no longer active.");
    }
    throw error;
  }
  return session;
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  SessionError,
  clearCookieHeader,
  cookieHeader,
  createSessionPlan,
  resolveSessionFromHeaders,
  resolveSessionFromToken,
  revokeSessionFromHeaders,
  sessionTokenFromHeaders,
  tokenDigest,
};
