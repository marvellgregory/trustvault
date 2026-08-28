import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  ARC_TESTNET_CHAIN_ID,
  AUTH_CHALLENGE_TTL_MS,
  AUTHENTICATE_ACCOUNT,
  ChallengeRequestError,
  issueAuthChallenge,
} = require("./auth-challenge.cjs");

const WALLET = "0x1111111111111111111111111111111111111111";
const DOMAIN = "app.trustvault.example";
const NOW = new Date("2026-08-18T12:00:00.000Z");

function valid(overrides = {}) {
  return {
    walletAddress: WALLET,
    chainId: ARC_TESTNET_CHAIN_ID,
    intendedAction: AUTHENTICATE_ACCOUNT,
    ...overrides,
  };
}

function issue(input = valid()) {
  return issueAuthChallenge(input, {
    domain: DOMAIN,
    now: () => NOW,
  });
}

test("accepts the configured Arc Testnet challenge request", () => {
  const result = issue();

  assert.equal(result.response.walletAddress, WALLET);
  assert.equal(result.response.chainId, 5_042_002);
  assert.equal(result.response.domain, DOMAIN);
  assert.equal(result.item.status, "PENDING");
  assert.equal(result.item.normalizedAddress, WALLET.toLowerCase());
});

test("rejects invalid wallets, chains, actions, and extra fields", () => {
  for (const input of [
    valid({ walletAddress: "0x1234" }),
    valid({ chainId: 1 }),
    valid({ intendedAction: "TRANSFER_USDC" }),
    valid({ customerId: "cus_untrusted" }),
  ]) {
    assert.throws(() => issue(input), ChallengeRequestError);
  }
});

test("expires exactly five minutes after issuance", () => {
  const result = issue();

  assert.equal(
    Date.parse(result.response.expiresAt) - Date.parse(result.response.issuedAt),
    AUTH_CHALLENGE_TTL_MS,
  );
  assert.equal(result.item.expiresAtEpoch, Math.floor((NOW.getTime() + 300_000) / 1000));
});

test("canonical message binds all required challenge fields and warnings", () => {
  const result = issue();
  const message = result.response.message;

  for (const binding of [
    "TrustVault Wallet Authentication",
    DOMAIN,
    WALLET,
    String(ARC_TESTNET_CHAIN_ID),
    AUTHENTICATE_ACCOUNT,
    result.response.challengeId,
    result.item.nonce,
    result.response.issuedAt,
    result.response.expiresAt,
    "does not initiate a blockchain transaction",
    "transfer USDC",
    "approve token spending",
  ]) {
    assert.ok(message.includes(binding));
  }
});

test("challenge identifiers and nonces are unpredictable per issuance", () => {
  const first = issue();
  const second = issue();

  assert.notEqual(first.response.challengeId, second.response.challengeId);
  assert.notEqual(first.item.nonce, second.item.nonce);
  assert.match(first.item.nonce, /^[a-f0-9]{64}$/);
});

test("issuance produces no customer, session, signature, or verified status", () => {
  const serialized = JSON.stringify(issue());

  assert.ok(!serialized.includes("customerId"));
  assert.ok(!serialized.includes("signature"));
  assert.ok(!serialized.includes("session"));
  assert.ok(!serialized.includes("VERIFIED"));
});
