const {
  ChallengeRequestError,
  issueAuthChallenge,
} = require("./auth-challenge.cjs");

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

function parseBody(event) {
  const encoded = typeof event?.body === "string" ? event.body : "";
  const raw = event?.isBase64Encoded
    ? Buffer.from(encoded, "base64").toString("utf8")
    : encoded;

  if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
    throw new ChallengeRequestError(413, "REQUEST_TOO_LARGE", "The request is too large.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ChallengeRequestError(400, "MALFORMED_JSON", "A valid JSON request body is required.");
  }
}

function toAttributeValue(value) {
  if (typeof value === "number") return { N: String(value) };
  return { S: value };
}

function toDynamoItem(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, toAttributeValue(value)]),
  );
}

function createChallengeHandler({ putItem, domain }) {
  return async function challengeHandler(event) {
    if (eventMethod(event) !== "POST") {
      return jsonResponse(405, {
        error: { code: "METHOD_NOT_ALLOWED", message: "POST is required." },
      });
    }

    try {
      const issued = issueAuthChallenge(parseBody(event), { domain });

      await putItem({
        TableName: "TrustVaultPilot",
        Item: toDynamoItem(issued.item),
        ConditionExpression: "attribute_not_exists(PK)",
      });

      return jsonResponse(201, issued.response);
    } catch (error) {
      if (error instanceof ChallengeRequestError) {
        return jsonResponse(error.statusCode, {
          error: { code: error.code, message: error.message },
        });
      }

      // Do not return stack traces, request bodies, challenge messages, or wallet data.
      return jsonResponse(500, {
        error: { code: "CHALLENGE_ISSUANCE_FAILED", message: "The challenge could not be issued." },
      });
    }
  };
}

let liveHandler;

async function handler(event) {
  if (!liveHandler) {
    const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
    const client = new DynamoDBClient({});
    const domain = process.env.TRUSTVAULT_AUTH_DOMAIN;

    liveHandler = createChallengeHandler({
      domain,
      putItem: (input) => client.send(new PutItemCommand(input)),
    });
  }

  return liveHandler(event);
}

module.exports = {
  createChallengeHandler,
  handler,
};
