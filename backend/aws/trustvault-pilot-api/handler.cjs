const {
  ChallengeRequestError,
  issueAuthChallenge,
} = require("./auth-challenge.cjs");

const {
  AuthVerificationError,
  verifyAuthChallenge,
} = require("./auth-verify.cjs");
const { CustomerIdentityError } = require("./customer-identity.cjs");

const MAX_REQUEST_BYTES = 2_048;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
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
  transactWriteItems,
  domain,
}) {
  return async function authHandler(event) {
    if (eventMethod(event) !== "POST") {
      return jsonResponse(405, {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "POST is required.",
        },
      });
    }

    try {
      const path = eventPath(event);

      if (path.endsWith("/account/auth/verify")) {
        const verified = await verifyAuthChallenge(
          parseBody(event),
          {
            getItem,
            transactWriteItems,
          },
        );

        return jsonResponse(200, verified);
      }

      if (
        path.endsWith("/account/auth/challenge") ||
        path === ""
      ) {
        const issued = issueAuthChallenge(
          parseBody(event),
          { domain },
        );

        await putItem({
          TableName: "TrustVaultPilot",
          Item: toDynamoItem(issued.item),
          ConditionExpression: "attribute_not_exists(PK)",
        });

        return jsonResponse(201, issued.response);
      }

      return jsonResponse(404, {
        error: {
          code: "NOT_FOUND",
          message: "The authentication endpoint was not found.",
        },
      });
    } catch (error) {
      if (
        error instanceof ChallengeRequestError ||
        error instanceof AuthVerificationError ||
        error instanceof CustomerIdentityError
      ) {
        return jsonResponse(error.statusCode, {
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      // Never expose stack traces, signatures, challenge bodies,
      // wallet internals, or DynamoDB implementation details.
      return jsonResponse(500, {
        error: {
          code: "AUTHENTICATION_FAILED",
          message: "The authentication request could not be completed.",
        },
      });
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
  });
}

let liveHandler;

async function handler(event) {
  if (!liveHandler) {
    const {
      DynamoDBClient,
      PutItemCommand,
      GetItemCommand,
      TransactWriteItemsCommand,
    } = require("@aws-sdk/client-dynamodb");

    const client = new DynamoDBClient({});
    const domain = process.env.TRUSTVAULT_AUTH_DOMAIN;

    liveHandler = createAuthHandler({
      domain,

      putItem: (input) =>
        client.send(new PutItemCommand(input)),

      getItem: (input) =>
        client.send(new GetItemCommand(input)),

      transactWriteItems: (input) =>
        client.send(new TransactWriteItemsCommand(input)),
    });
  }

  return liveHandler(event);
}

module.exports = {
  createAuthHandler,
  createChallengeHandler,
  handler,
};
