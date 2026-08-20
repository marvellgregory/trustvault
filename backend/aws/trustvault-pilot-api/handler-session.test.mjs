import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { createAuthHandler } = require("./handler.cjs");
const { SESSION_COOKIE_NAME, createSessionPlan } = require("./session.cjs");

const ORIGIN = "https://app.trustvault.example";
const CUSTOMER_ID = "tvc_11111111111111111111111111111111";
const WALLET = "0x1111111111111111111111111111111111111111";
const NOW = new Date("2026-08-20T03:00:00.000Z");

function setup() {
  const plan = createSessionPlan(
    { customerId: CUSTOMER_ID, normalizedAddress: WALLET, chainId: 5_042_002 },
    { now: () => NOW, randomBytes: () => Buffer.alloc(32, 9) },
  );
  const session = plan.transactItem.Put.Item;
  const getItem = async (input) => {
    const pk = input.Key.PK.S;
    if (pk.startsWith("SESSION#")) return { Item: session };
    if (pk.startsWith("CUSTOMER#")) return { Item: { customerId: { S: CUSTOMER_ID }, status: { S: "ACTIVE" } } };
    if (pk.startsWith("WALLET#")) return { Item: { customerId: { S: CUSTOMER_ID }, normalizedAddress: { S: WALLET }, associationStatus: { S: "VERIFIED" } } };
    return {};
  };
  const updates = [];
  const handler = createAuthHandler({
    allowedOrigin: ORIGIN,
    now: () => new Date(NOW.getTime() + 1_000),
    domain: "app.trustvault.example",
    getItem,
    updateItem: async (input) => { updates.push(input); return {}; },
    putItem: async () => ({}),
    transactWriteItems: async () => ({}),
  });
  const headers = { origin: ORIGIN, cookie: `${SESSION_COOKIE_NAME}=${plan.token}` };
  return { handler, headers, updates };
}

test("GET session restores safe identity and ignores browser-supplied impersonation fields", async () => {
  const state = setup();
  const response = await state.handler({
    rawPath: "/account/session",
    requestContext: { http: { method: "GET" } },
    headers: state.headers,
    body: JSON.stringify({ customerId: "tvc_22222222222222222222222222222222", walletAddress: "0x2222222222222222222222222222222222222222" }),
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["access-control-allow-origin"], ORIGIN);
  assert.equal(response.headers["access-control-allow-credentials"], "true");
  assert.deepEqual(JSON.parse(response.body), { authenticated: true, customerId: CUSTOMER_ID, walletAddress: WALLET, chainId: 5_042_002, expiresAt: "2026-08-27T03:00:00.000Z" });
  assert.ok(!response.body.includes("sessionId"));
});

test("logout revokes the session and clears the cookie", async () => {
  const state = setup();
  const response = await state.handler({ rawPath: "/account/logout", requestContext: { http: { method: "POST" } }, headers: state.headers, body: "{}" });
  assert.equal(response.statusCode, 200);
  assert.equal(state.updates.length, 1);
  assert.match(response.cookies[0], /Max-Age=0/);
});

test("credentialed routes reject unapproved origins without wildcard CORS", async () => {
  const state = setup();
  const response = await state.handler({ rawPath: "/account/session", requestContext: { http: { method: "GET" } }, headers: { ...state.headers, origin: "https://evil.example" } });
  assert.equal(response.statusCode, 403);
  assert.equal(response.headers["access-control-allow-origin"], ORIGIN);
  assert.notEqual(response.headers["access-control-allow-origin"], "*");
});
