import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";

const require = createRequire(import.meta.url);

const {
  issueAuthChallenge,
  ARC_TESTNET_CHAIN_ID,
  AUTHENTICATE_ACCOUNT,
} = require("./auth-challenge.cjs");

const {
  AuthVerificationError,
  verifyAuthChallenge,
} = require("./auth-verify.cjs");

const PRIVATE_KEY =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const OTHER_PRIVATE_KEY =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const account = privateKeyToAccount(PRIVATE_KEY);
const otherAccount = privateKeyToAccount(OTHER_PRIVATE_KEY);

const DOMAIN = "app.trustvault.example";
const NOW = new Date("2026-08-20T01:30:00.000Z");

function dynamoValue(value) {
  if (typeof value === "number") {
    return { N: String(value) };
  }

  return { S: value };
}

function toDynamoItem(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key,
      dynamoValue(value),
    ]),
  );
}

function makeChallenge() {
  return issueAuthChallenge(
    {
      walletAddress: account.address,
      chainId: ARC_TESTNET_CHAIN_ID,
      intendedAction: AUTHENTICATE_ACCOUNT,
    },
    {
      domain: DOMAIN,
      now: () => NOW,
      randomUUID: () => "challenge_test_001",
      randomBytes: () => Buffer.alloc(32, 7),
    },
  );
}

function verifierFor(item) {
  let consumed = false;

  return {
    wasConsumed: () => consumed,

    options: {
      now: () => new Date(NOW.getTime() + 30_000),

      getItem: async () => ({
        Item: item,
      }),

      updateItem: async () => {
        if (consumed) {
          const error = new Error("Conditional request failed.");
          error.name = "ConditionalCheckFailedException";
          throw error;
        }

        consumed = true;
        item.status = { S: "VERIFIED" };

        return {};
      },

      resolveCustomerIdentity: async (_challenge, options) => {
        await fakeConsume(options);
        return { customerId: "tvc_11111111111111111111111111111111", created: false };
      },
    },
  };

  async function fakeConsume() {
    if (consumed) {
      const error = new Error("Conditional request failed.");
      error.name = "ConditionalCheckFailedException";
      throw error;
    }
    consumed = true;
    item.status = { S: "VERIFIED" };
  }
}

test("verifies the wallet that signed the canonical challenge", async () => {
  const issued = makeChallenge();
  const signature = await account.signMessage({
    message: issued.response.message,
  });

  const fake = verifierFor(toDynamoItem(issued.item));

  const result = await verifyAuthChallenge(
    {
      challengeId: issued.response.challengeId,
      signature,
    },
    fake.options,
  );

  assert.equal(result.authenticated, true);
  assert.equal(result.walletAddress, account.address);
  assert.equal(result.associationStatus, "VERIFIED");
  assert.equal(result.customerId, "tvc_11111111111111111111111111111111");
  assert.equal(fake.wasConsumed(), true);
});

test("rejects a signature from another wallet", async () => {
  const issued = makeChallenge();

  const signature = await otherAccount.signMessage({
    message: issued.response.message,
  });

  const fake = verifierFor(toDynamoItem(issued.item));

  await assert.rejects(
    () =>
      verifyAuthChallenge(
        {
          challengeId: issued.response.challengeId,
          signature,
        },
        fake.options,
      ),
    (error) =>
      error instanceof AuthVerificationError &&
      error.code === "SIGNER_MISMATCH",
  );

  assert.equal(fake.wasConsumed(), false);
});

test("rejects an expired challenge", async () => {
  const issued = makeChallenge();

  const signature = await account.signMessage({
    message: issued.response.message,
  });

  const item = toDynamoItem(issued.item);

  const fake = verifierFor(item);
  fake.options.now = () =>
    new Date(Date.parse(issued.response.expiresAt) + 1_000);

  await assert.rejects(
    () =>
      verifyAuthChallenge(
        {
          challengeId: issued.response.challengeId,
          signature,
        },
        fake.options,
      ),
    (error) =>
      error instanceof AuthVerificationError &&
      error.code === "CHALLENGE_EXPIRED",
  );

  assert.equal(fake.wasConsumed(), false);
});

test("rejects an already consumed challenge", async () => {
  const issued = makeChallenge();

  const signature = await account.signMessage({
    message: issued.response.message,
  });

  const item = toDynamoItem({
    ...issued.item,
    status: "VERIFIED",
  });

  const fake = verifierFor(item);

  await assert.rejects(
    () =>
      verifyAuthChallenge(
        {
          challengeId: issued.response.challengeId,
          signature,
        },
        fake.options,
      ),
    (error) =>
      error instanceof AuthVerificationError &&
      error.code === "CHALLENGE_ALREADY_USED",
  );
});

test("rejects malformed verification input", async () => {
  const fake = verifierFor({});

  await assert.rejects(
    () =>
      verifyAuthChallenge(
        {
          challengeId: "",
          signature: "0x1234",
        },
        fake.options,
      ),
    AuthVerificationError,
  );
});

test("rejects a missing challenge before customer resolution", async () => {
  await assert.rejects(
    () => verifyAuthChallenge(
      { challengeId: "missing_challenge", signature: `0x${"11".repeat(65)}` },
      { getItem: async () => ({}) },
    ),
    (error) => error instanceof AuthVerificationError && error.code === "CHALLENGE_NOT_FOUND",
  );
});
