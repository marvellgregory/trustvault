const {
  ChallengeRequestError,
  issueAuthChallenge,
} = require("./auth-challenge.cjs");

const {
  AuthVerificationError,
  verifyAuthChallenge,
} = require("./auth-verify.cjs");
const { CustomerIdentityError } = require("./customer-identity.cjs");
const { CustomerProfileError, getCustomerProfile, updateCustomerProfile } = require("./customer-profile.cjs");
const {
  MarketplaceOrderError,
  getMarketplaceOrder,
  listMarketplaceOrders,
  saveMarketplaceOrder,
} = require("./marketplace-order.cjs");
const {
  MarketplaceReceiptError,
  getMarketplaceReceipt,
  listMarketplaceReceipts,
  saveMarketplaceReceipt,
} = require("./marketplace-receipt.cjs");
const {
  SessionError,
  clearCookieHeader,
  cookieHeader,
  resolveSessionFromHeaders,
  revokeSessionFromHeaders,
} = require("./session.cjs");

const MAX_REQUEST_BYTES = 200_000;

function jsonResponse(statusCode, body, options = {}) {
  const response = {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(options.allowedOrigin ? {
        "access-control-allow-origin": options.allowedOrigin,
        "access-control-allow-credentials": "true",
        vary: "Origin",
      } : {}),
    },
    body: JSON.stringify(body),
  };
  if (options.cookie) response.cookies = [options.cookie];
  return response;
}

function eventMethod(event) {
  return event?.requestContext?.http?.method ?? event?.httpMethod;
}

function eventPath(event) {
  return (
    event?.rawPath ??
    event?.requestContext?.http?.path ??
    event?.path ??
    ""
  );
}

function parseBody(event) {
  const encoded = typeof event?.body === "string" ? event.body : "";

  const raw = event?.isBase64Encoded
    ? Buffer.from(encoded, "base64").toString("utf8")
    : encoded;

  if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
    throw new ChallengeRequestError(
      413,
      "REQUEST_TOO_LARGE",
      "The request is too large.",
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ChallengeRequestError(
      400,
      "MALFORMED_JSON",
      "A valid JSON request body is required.",
    );
  }
}

function toAttributeValue(value) {
  if (typeof value === "number") {
    return { N: String(value) };
  }

  return { S: value };
}

function toDynamoItem(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key,
      toAttributeValue(value),
    ]),
  );
}

function createAuthHandler({
  putItem,
  getItem,
  query,
  transactWriteItems,
  updateItem,
  domain,
  allowedOrigin,
  now,
}) {
  return async function authHandler(event) {
    try {
      const path = eventPath(event);
      const method = eventMethod(event);
      const origin = event?.headers?.origin ?? event?.headers?.Origin;
      if (allowedOrigin && origin !== allowedOrigin) {
        throw new SessionError(403, "ORIGIN_NOT_ALLOWED", "The request origin is not allowed.");
      }

      if (path.endsWith("/account/session")) {
        if (method !== "GET") return jsonResponse(405, { error: { code: "METHOD_NOT_ALLOWED", message: "GET is required." } }, { allowedOrigin });
        const session = await resolveSessionFromHeaders(event?.headers, { getItem, now });
        return jsonResponse(200, {
          authenticated: true,
          customerId: session.customerId,
          walletAddress: session.walletAddress,
          chainId: session.chainId,
          expiresAt: session.expiresAt,
        }, { allowedOrigin });
      }

      if (path.endsWith("/account/profile")) {
        if (method !== "GET" && method !== "PATCH") return jsonResponse(405, { error: { code: "METHOD_NOT_ALLOWED", message: "GET or PATCH is required." } }, { allowedOrigin });
        const session = await resolveSessionFromHeaders(event?.headers, { getItem, now });
        const profile = method === "GET"
          ? await getCustomerProfile(session, { getItem })
          : await updateCustomerProfile(session, parseBody(event), { getItem, updateItem, now });
        return jsonResponse(200, { profile }, { allowedOrigin });
      }

      if (path.endsWith("/marketplace/orders")) {
        if (method !== "GET") {
          return jsonResponse(
            405,
            {
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: "GET is required.",
              },
            },
            { allowedOrigin },
          );
        }

        const session =
          await resolveSessionFromHeaders(
            event?.headers,
            { getItem, now },
          );

        const orders =
          await listMarketplaceOrders(
            session,
            { query },
          );

        return jsonResponse(
          200,
          { orders },
          { allowedOrigin },
        );
      }

      if (path.includes("/marketplace/orders/")) {
        if (method !== "GET" && method !== "PUT") {
          return jsonResponse(
            405,
            {
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: "GET or PUT is required.",
              },
            },
            { allowedOrigin },
          );
        }

        const orderId = decodeURIComponent(
          path.slice(path.lastIndexOf("/") + 1),
        );

        const session = await resolveSessionFromHeaders(
          event?.headers,
          { getItem, now },
        );

        let order;

        if (method === "GET") {
          order = await getMarketplaceOrder(
            session,
            orderId,
            { getItem },
          );
        } else {
          const input = parseBody(event);

          if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input) ||
            input.id !== orderId
          ) {
            throw new MarketplaceOrderError(
              400,
              "ORDER_ID_MISMATCH",
              "The marketplace order identifier does not match the request path.",
            );
          }

          order = await saveMarketplaceOrder(
            session,
            input,
            { putItem, now },
          );
        }

        return jsonResponse(
          method === "GET" ? 200 : 201,
          { order },
          { allowedOrigin },
        );
      }
      if (path.endsWith("/marketplace/receipts")) {
        if (method !== "GET") {
          return jsonResponse(
            405,
            {
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: "GET is required.",
              },
            },
            { allowedOrigin },
          );
        }

        const session =
          await resolveSessionFromHeaders(
            event?.headers,
            { getItem, now },
          );

        const receipts =
          await listMarketplaceReceipts(
            session,
            { query },
          );

        return jsonResponse(
          200,
          { receipts },
          { allowedOrigin },
        );
      }

      if (path.includes("/marketplace/receipts/")) {
        if (
          method !== "GET" &&
          method !== "PUT"
        ) {
          return jsonResponse(
            405,
            {
              error: {
                code: "METHOD_NOT_ALLOWED",
                message: "GET or PUT is required.",
              },
            },
            { allowedOrigin },
          );
        }

        const receiptId =
          decodeURIComponent(
            path.slice(
              path.lastIndexOf("/") + 1,
            ),
          );

        const session =
          await resolveSessionFromHeaders(
            event?.headers,
            { getItem, now },
          );

        let receipt;

        if (method === "GET") {
          receipt =
            await getMarketplaceReceipt(
              session,
              receiptId,
              { getItem },
            );
        } else {
          const input =
            parseBody(event);

          if (
            !input ||
            typeof input !== "object" ||
            Array.isArray(input) ||
            input.id !== receiptId
          ) {
            throw new MarketplaceReceiptError(
              400,
              "RECEIPT_ID_MISMATCH",
              "The Marketplace receipt identifier does not match the request path.",
            );
          }

          receipt =
            await saveMarketplaceReceipt(
              session,
              receiptId,
              input,
              { putItem, now },
            );
        }

        return jsonResponse(
          method === "GET" ? 200 : 201,
          { receipt },
          { allowedOrigin },
        );
      }
      if (path.endsWith("/account/logout")) {
        if (method !== "POST") return jsonResponse(405, { error: { code: "METHOD_NOT_ALLOWED", message: "POST is required." } }, { allowedOrigin });
        await revokeSessionFromHeaders(event?.headers, { getItem, updateItem, now });
        return jsonResponse(200, { authenticated: false }, { allowedOrigin, cookie: clearCookieHeader() });
      }

      if (path.endsWith("/account/auth/verify")) {
        if (method !== "POST") return jsonResponse(405, { error: { code: "METHOD_NOT_ALLOWED", message: "POST is required." } }, { allowedOrigin });
        const verified = await verifyAuthChallenge(
          parseBody(event),
          {
            getItem,
            transactWriteItems,
          },
        );

        return jsonResponse(200, verified.response, { allowedOrigin, cookie: cookieHeader(verified.sessionToken) });
      }

      if (
        path.endsWith("/account/auth/challenge") ||
        path === ""
      ) {
        if (method !== "POST") return jsonResponse(405, { error: { code: "METHOD_NOT_ALLOWED", message: "POST is required." } }, { allowedOrigin });
        const issued = issueAuthChallenge(
          parseBody(event),
          { domain },
        );

        await putItem({
          TableName: "TrustVaultPilot",
          Item: toDynamoItem(issued.item),
          ConditionExpression: "attribute_not_exists(PK)",
        });

        return jsonResponse(201, issued.response, { allowedOrigin });
      }

      return jsonResponse(404, {
        error: {
          code: "NOT_FOUND",
          message: "The authentication endpoint was not found.",
        },
      }, { allowedOrigin });
    } catch (error) {
      if (
        error instanceof ChallengeRequestError ||
        error instanceof AuthVerificationError ||
        error instanceof CustomerIdentityError ||
        error instanceof CustomerProfileError ||
        error instanceof MarketplaceOrderError ||
        error instanceof MarketplaceReceiptError ||
        error instanceof SessionError
      ) {
        return jsonResponse(error.statusCode, {
          error: {
            code: error.code,
            message: error.message,
          },
        }, { allowedOrigin, ...(error instanceof SessionError && error.statusCode === 401 ? { cookie: clearCookieHeader() } : {}) });
      }

      // Never expose stack traces, signatures, challenge bodies,
      // wallet internals, or DynamoDB implementation details.
      return jsonResponse(500, {
        error: {
          code: "AUTHENTICATION_FAILED",
          message: "The authentication request could not be completed.",
        },
      }, { allowedOrigin });
    }
  };
}

function createChallengeHandler({ putItem, domain }) {
  return createAuthHandler({
    putItem,
    domain,

    getItem: async () => {
      throw new Error("Verification is unavailable.");
    },

    transactWriteItems: async () => {
      throw new Error("Verification is unavailable.");
    },

    updateItem: async () => {
      throw new Error("Session revocation is unavailable.");
    },
  });
}

let liveHandler;

async function handler(event) {
  if (!liveHandler) {
    const {
      DynamoDBClient,
      PutItemCommand,
      GetItemCommand,
      QueryCommand,
      TransactWriteItemsCommand,
      UpdateItemCommand,
    } = require("@aws-sdk/client-dynamodb");

    const client = new DynamoDBClient({});
    const domain = process.env.TRUSTVAULT_AUTH_DOMAIN;
    const allowedOrigin = process.env.TRUSTVAULT_WEB_ORIGIN;

    if (!allowedOrigin || !/^https:\/\//.test(allowedOrigin)) {
      throw new Error("TRUSTVAULT_WEB_ORIGIN must be an explicit HTTPS origin.");
    }

    liveHandler = createAuthHandler({
      domain,
      allowedOrigin,

      putItem: (input) =>
        client.send(new PutItemCommand(input)),

      getItem: (input) =>
        client.send(new GetItemCommand(input)),

      query: (input) =>
        client.send(new QueryCommand(input)),

      transactWriteItems: (input) =>
        client.send(new TransactWriteItemsCommand(input)),

      updateItem: (input) =>
        client.send(new UpdateItemCommand(input)),
    });
  }

  return liveHandler(event);
}

module.exports = {
  createAuthHandler,
  createChallengeHandler,
  handler,
};




