import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { CustomerProfileError, getCustomerProfile, updateCustomerProfile, validatePatch } = require("./customer-profile.cjs");

const CUSTOMER_ID = "tvc_11111111111111111111111111111111";
const OTHER_ID = "tvc_22222222222222222222222222222222";
const NOW = new Date("2026-08-20T04:00:00.000Z");

function profileItem(overrides = {}) {
  return {
    PK: { S: `CUSTOMER#${CUSTOMER_ID}` }, SK: { S: "PROFILE" }, entityType: { S: "CUSTOMER" },
    customerId: { S: CUSTOMER_ID }, schemaVersion: { N: "1" }, status: { S: "ACTIVE" },
    preferredCurrency: { S: "USDC" }, createdAt: { S: "2026-08-20T03:00:00.000Z" }, updatedAt: { S: "2026-08-20T03:00:00.000Z" },
    displayName: { S: "Alice" }, email: { S: "alice@example.com" }, internalRiskFlag: { S: "NEVER_RETURN" },
    ...overrides,
  };
}

function store(item = profileItem()) {
  const calls = [];
  return {
    calls,
    getItem: async (input) => { calls.push({ get: input }); return { Item: item }; },
    updateItem: async (input) => {
      calls.push({ update: input });
      const next = structuredClone(item);
      for (const [token, value] of Object.entries(input.ExpressionAttributeValues)) {
        if (![":active", ":customerId"].includes(token)) {
          const field = input.ExpressionAttributeNames[`#${token.slice(1)}`];
          if (field) next[field] = value;
        }
      }
      return { Attributes: next };
    },
  };
}

test("authenticated read uses the session customer key and filters unsafe attributes", async () => {
  const db = store();
  const profile = await getCustomerProfile({ customerId: CUSTOMER_ID }, db);
  assert.equal(db.calls[0].get.Key.PK.S, `CUSTOMER#${CUSTOMER_ID}`);
  assert.equal(profile.customerId, CUSTOMER_ID);
  assert.equal(profile.displayName, "Alice");
  assert.equal("PK" in profile, false);
  assert.equal("internalRiskFlag" in profile, false);
  assert.equal("sessionId" in profile, false);
});

test("authenticated partial update uses UpdateItem and preserves unrelated attributes", async () => {
  const db = store();
  const profile = await updateCustomerProfile(
    { customerId: CUSTOMER_ID },
    { displayName: "Alice Smith", notificationPreferences: { email: true } },
    { ...db, now: () => NOW },
  );
  const update = db.calls.find((call) => call.update).update;
  assert.equal(update.Key.PK.S, `CUSTOMER#${CUSTOMER_ID}`);
  assert.match(update.UpdateExpression, /^SET /);
  assert.ok(!update.UpdateExpression.includes("internalRiskFlag"));
  assert.equal(update.ExpressionAttributeValues[":updatedAt"].S, NOW.toISOString());
  assert.equal(profile.displayName, "Alice Smith");
  assert.equal("internalRiskFlag" in profile, false);
});

test("rejects unauthenticated access and missing or inactive profiles", async () => {
  await assert.rejects(getCustomerProfile({}, store()), CustomerProfileError);
  await assert.rejects(getCustomerProfile({ customerId: CUSTOMER_ID }, { getItem: async () => ({}) }), (error) => error.code === "CUSTOMER_PROFILE_NOT_FOUND");
  await assert.rejects(getCustomerProfile({ customerId: CUSTOMER_ID }, store(profileItem({ status: { S: "SUSPENDED" } }))), (error) => error.code === "CUSTOMER_PROFILE_INACTIVE");
});

test("rejects impersonation, wallet reassignment, immutable and unknown fields", () => {
  for (const patch of [
    { customerId: OTHER_ID }, { walletAddress: "0x2222222222222222222222222222222222222222" },
    { status: "ACTIVE" }, { createdAt: NOW.toISOString() }, { PK: "CUSTOMER#evil" }, { sessionId: "evil" }, { unknown: true },
  ]) {
    assert.throws(() => validatePatch(patch), (error) => error.code === "PROFILE_FIELD_NOT_EDITABLE");
  }
});

test("validates editable field values and unknown notification preferences", () => {
  for (const patch of [
    { displayName: "x".repeat(101) }, { email: "not-email" }, { phone: "abc" },
    { country: "<script>" }, { timezone: "bad timezone" }, { notificationPreferences: { admin: true } },
  ]) assert.throws(() => validatePatch(patch), CustomerProfileError);
});
