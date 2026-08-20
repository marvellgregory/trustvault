import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  SESSION_COOKIE_NAME,
  clearCookieHeader,
  cookieHeader,
  createSessionPlan,
  resolveSessionFromHeaders,
  resolveSessionFromToken,
  revokeSessionFromHeaders,
} = require("./session.cjs");

const CUSTOMER_ID = "tvc_11111111111111111111111111111111";
const WALLET = "0x1111111111111111111111111111111111111111";
const NOW = new Date("2026-08-20T03:00:00.000Z");

function fixture() {
  const plan = createSessionPlan(
    { customerId: CUSTOMER_ID, normalizedAddress: WALLET, chainId: 5_042_002 },
    { now: () => NOW, randomBytes: () => Buffer.alloc(32, 7) },
  );
  const session = structuredClone(plan.transactItem.Put.Item);
  const customer = { customerId: { S: CUSTOMER_ID }, status: { S: "ACTIVE" } };
  const wallet = { customerId: { S: CUSTOMER_ID }, normalizedAddress: { S: WALLET }, associationStatus: { S: "VERIFIED" } };
  const updates = [];
  const getItem = async (input) => {
    const pk = input.Key.PK.S;
    if (pk.startsWith("SESSION#")) return { Item: session };
    if (pk.startsWith("CUSTOMER#")) return { Item: customer };
    if (pk.startsWith("WALLET#")) return { Item: wallet };
    return {};
  };
  return { plan, session, customer, wallet, updates, getItem, updateItem: async (input) => { updates.push(input); session.status = { S: "REVOKED" }; return {}; } };
}

test("creates a random cookie credential but persists only its digest", () => {
  const { plan } = fixture();
  assert.match(plan.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(plan.sessionId.length, 64);
  const persisted = JSON.stringify(plan.transactItem);
  assert.ok(!persisted.includes(plan.token));
  for (const forbidden of ["\"signature\":", "\"privateKey\":", "\"seedPhrase\":", "\"recoveryPhrase\":", "\"challengeMessage\":" ]) assert.ok(!persisted.includes(forbidden));
  assert.match(cookieHeader(plan.token), new RegExp(`^${SESSION_COOKIE_NAME}=.*HttpOnly; Secure; SameSite=None$`));
  assert.match(clearCookieHeader(), /Max-Age=0/);
});

test("resolves a valid session and supports refresh restoration without browser identity input", async () => {
  const state = fixture();
  const result = await resolveSessionFromHeaders(
    { cookie: `${SESSION_COOKIE_NAME}=${state.plan.token}` },
    { getItem: state.getItem, now: () => new Date(NOW.getTime() + 1_000) },
  );
  assert.deepEqual(result, {
    authenticated: true,
    sessionId: state.plan.sessionId,
    customerId: CUSTOMER_ID,
    walletAddress: WALLET,
    chainId: 5_042_002,
    expiresAt: state.plan.expiresAt,
  });
});

test("rejects missing, malformed, unknown, expired, and revoked sessions", async () => {
  const state = fixture();
  await assert.rejects(resolveSessionFromHeaders({}, { getItem: state.getItem }), (error) => error.code === "SESSION_MISSING");
  await assert.rejects(resolveSessionFromHeaders({ cookie: `${SESSION_COOKIE_NAME}=bad` }, { getItem: state.getItem }), (error) => error.code === "SESSION_MALFORMED");
  await assert.rejects(resolveSessionFromToken(state.plan.token, { getItem: async () => ({}), now: () => NOW }), (error) => error.code === "SESSION_UNKNOWN");
  await assert.rejects(resolveSessionFromToken(state.plan.token, { getItem: state.getItem, now: () => new Date(Date.parse(state.plan.expiresAt) + 1) }), (error) => error.code === "SESSION_EXPIRED");
  state.session.status = { S: "REVOKED" };
  await assert.rejects(resolveSessionFromToken(state.plan.token, { getItem: state.getItem, now: () => NOW }), (error) => error.code === "SESSION_REVOKED");
});

test("rejects customer and wallet association mismatches", async () => {
  const customerMismatch = fixture();
  customerMismatch.customer.customerId = { S: "tvc_22222222222222222222222222222222" };
  await assert.rejects(resolveSessionFromToken(customerMismatch.plan.token, { getItem: customerMismatch.getItem, now: () => NOW }), (error) => error.code === "SESSION_CUSTOMER_MISMATCH");
  const walletMismatch = fixture();
  walletMismatch.wallet.normalizedAddress = { S: "0x2222222222222222222222222222222222222222" };
  await assert.rejects(resolveSessionFromToken(walletMismatch.plan.token, { getItem: walletMismatch.getItem, now: () => NOW }), (error) => error.code === "SESSION_WALLET_MISMATCH");
});

test("logout revokes the server session", async () => {
  const state = fixture();
  await revokeSessionFromHeaders(
    { Cookie: `${SESSION_COOKIE_NAME}=${state.plan.token}` },
    { getItem: state.getItem, updateItem: state.updateItem, now: () => new Date(NOW.getTime() + 1_000) },
  );
  assert.equal(state.updates.length, 1);
  assert.equal(state.session.status.S, "REVOKED");
});

test("a supplied customerId cannot alter resolved authorization identity", async () => {
  const state = fixture();
  const untrustedBody = { customerId: "tvc_22222222222222222222222222222222", walletAddress: "0x2222222222222222222222222222222222222222" };
  const result = await resolveSessionFromHeaders(
    { cookie: `${SESSION_COOKIE_NAME}=${state.plan.token}` },
    { getItem: state.getItem, now: () => NOW, body: untrustedBody },
  );
  assert.equal(result.customerId, CUSTOMER_ID);
  assert.equal(result.walletAddress, WALLET);
});
