import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { CustomerIdentityError, resolveOrCreateVerifiedCustomer } = require("./customer-identity.cjs");

const ADDRESS = "0x1111111111111111111111111111111111111111";
const CUSTOMER_ID = "tvc_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function challenge(overrides = {}) {
  return { challengeId: "challenge_1", walletAddress: ADDRESS, normalizedAddress: ADDRESS, ...overrides };
}

function fakeDynamo(initialItem) {
  let walletItem = initialItem;
  let customerCreates = 0;
  const transactions = [];
  return {
    customerCreates: () => customerCreates,
    transactions,
    getItem: async () => ({ ...(walletItem ? { Item: walletItem } : {}) }),
    transactWriteItems: async (input) => {
      transactions.push(input);
      const walletPut = input.TransactItems.find((entry) => entry.Put?.Item?.entityType?.S === "WALLET_LOOKUP");
      if (!walletPut) return {};
      if (walletItem) {
        const error = new Error("transaction conflict");
        error.name = "TransactionCanceledException";
        throw error;
      }
      walletItem = walletPut.Put.Item;
      customerCreates += 1;
      return {};
    },
  };
}

function options(store, uuid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") {
  return {
    getItem: store.getItem,
    transactWriteItems: store.transactWriteItems,
    randomUUID: () => uuid,
    verifiedAt: "2026-08-20T02:00:00.000Z",
    nowEpoch: 1_776_304_800,
  };
}

test("creates a first-time customer and both wallet association indexes atomically", async () => {
  const store = fakeDynamo();
  const result = await resolveOrCreateVerifiedCustomer(challenge(), options(store));
  assert.deepEqual(result, { customerId: CUSTOMER_ID, created: true });
  const items = store.transactions[0].TransactItems;
  assert.equal(items.length, 4);
  assert.ok(items.some((entry) => entry.Put?.Item?.PK?.S === `CUSTOMER#${CUSTOMER_ID}` && entry.Put.Item.SK.S === "PROFILE"));
  assert.ok(items.some((entry) => entry.Put?.Item?.PK?.S === `CUSTOMER#${CUSTOMER_ID}` && entry.Put.Item.SK.S === `WALLET#${ADDRESS}`));
});

test("repeat authentication returns the same customer without creating another", async () => {
  const existing = { customerId: { S: CUSTOMER_ID }, normalizedAddress: { S: ADDRESS }, associationStatus: { S: "VERIFIED" } };
  const store = fakeDynamo(existing);
  const result = await resolveOrCreateVerifiedCustomer(challenge(), options(store, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));
  assert.deepEqual(result, { customerId: CUSTOMER_ID, created: false });
  assert.equal(store.customerCreates(), 0);
});

test("concurrent creation attempts converge on one customer", async () => {
  const store = fakeDynamo();
  const [first, second] = await Promise.all([
    resolveOrCreateVerifiedCustomer(challenge({ challengeId: "challenge_a" }), options(store)),
    resolveOrCreateVerifiedCustomer(challenge({ challengeId: "challenge_b" }), options(store, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")),
  ]);
  assert.equal(first.customerId, CUSTOMER_ID);
  assert.equal(second.customerId, CUSTOMER_ID);
  assert.equal(store.customerCreates(), 1);
});

test("rejects mismatched, unauthenticated, and revoked wallet resolution", async () => {
  const empty = fakeDynamo();
  await assert.rejects(resolveOrCreateVerifiedCustomer(challenge({ walletAddress: "0x2222222222222222222222222222222222222222" }), options(empty)), CustomerIdentityError);
  await assert.rejects(resolveOrCreateVerifiedCustomer({}, options(empty)), CustomerIdentityError);
  for (const status of ["REVOKED", "UNVERIFIED"]) {
    const unavailable = fakeDynamo({ customerId: { S: CUSTOMER_ID }, normalizedAddress: { S: ADDRESS }, associationStatus: { S: status } });
    await assert.rejects(resolveOrCreateVerifiedCustomer(challenge(), options(unavailable)), (error) => error.code === "WALLET_ASSOCIATION_NOT_VERIFIED");
  }
});

test("customer persistence contains no signature or signing authority", async () => {
  const store = fakeDynamo();
  await resolveOrCreateVerifiedCustomer(challenge(), options(store));
  const persisted = JSON.stringify(store.transactions);
  for (const forbiddenKey of ["\"signature\":", "\"privateKey\":", "\"seedPhrase\":", "\"recoveryPhrase\":", "\"signingAuthority\":" ]) {
    assert.ok(!persisted.includes(forbiddenKey));
  }
  assert.ok(persisted.includes("WALLET_SIGNATURE"));
});
