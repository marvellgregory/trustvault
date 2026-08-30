import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelAtlasTransaction,
  confirmAtlasTransaction,
  isAtlasPreparedTransactionExpired,
  prepareAtlasTransaction,
  reviewAtlasTransaction,
} from "./atlas-transaction-preparation.ts";

function prepare(overrides = {}) {
  return prepareAtlasTransaction({
    id: "atlas-tx-1",
    kind: "marketplace-payment",
    amount: "25.00",
    destinationAddress: "0x1111111111111111111111111111111111111111",
    destinationLabel: "Marketplace escrow",
    source: {
      type: "marketplace-order",
      id: "TV-1001",
    },
    chainId: 5042002,
    preparedAt: 1000,
    expiresAt: 2000,
    ...overrides,
  });
}

test("5I.1A prepares a reviewable USDC transaction without execution authority", () => {
  const transaction = prepare();

  assert.equal(transaction.status, "prepared");
  assert.equal(transaction.asset.symbol, "USDC");
  assert.equal(transaction.asset.amount, "25.00");
  assert.equal(transaction.source.id, "TV-1001");

  const serialized = JSON.stringify(transaction).toLowerCase();

  for (const forbidden of [
    "privatekey",
    "seedphrase",
    "signature",
    "signingauthority",
    "walletclient",
    "execute",
    "sendtransaction",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("5I.1A requires review before confirmation", () => {
  const transaction = prepare();

  assert.throws(
    () =>
      confirmAtlasTransaction(transaction, {
        transactionId: transaction.id,
        confirmedAt: 1200,
        confirmationToken: "confirm",
      }),
    /reviewed before confirmation/i,
  );
});

test("5I.1A moves prepared transactions into review state", () => {
  const transaction = prepare();

  const reviewed = reviewAtlasTransaction(transaction, 1100);

  assert.equal(reviewed.transaction.status, "reviewed");
  assert.equal(reviewed.review.transactionId, transaction.id);
  assert.equal(reviewed.review.reviewedAt, 1100);
});

test("5I.1A requires explicit confirmation after review", () => {
  const transaction = prepare();
  const reviewed = reviewAtlasTransaction(transaction, 1100);

  assert.throws(
    () =>
      confirmAtlasTransaction(reviewed.transaction, {
        transactionId: transaction.id,
        confirmedAt: 1200,
        confirmationToken: "   ",
      }),
    /explicit confirmation/i,
  );

  const confirmed = confirmAtlasTransaction(
    reviewed.transaction,
    {
      transactionId: transaction.id,
      confirmedAt: 1200,
      confirmationToken: "user-confirmed",
    },
  );

  assert.equal(confirmed.status, "confirmed");
});

test("5I.1A rejects confirmation for another prepared transaction", () => {
  const transaction = prepare();
  const reviewed = reviewAtlasTransaction(transaction, 1100);

  assert.throws(
    () =>
      confirmAtlasTransaction(reviewed.transaction, {
        transactionId: "atlas-tx-other",
        confirmedAt: 1200,
        confirmationToken: "user-confirmed",
      }),
    /does not match/i,
  );
});

test("5I.1A prevents expired transactions from entering review", () => {
  const transaction = prepare();

  assert.equal(
    isAtlasPreparedTransactionExpired(transaction, 2000),
    true,
  );

  assert.throws(
    () => reviewAtlasTransaction(transaction, 2000),
    /expired/i,
  );
});

test("5I.1A prevents expired reviewed transactions from confirmation", () => {
  const transaction = prepare();
  const reviewed = reviewAtlasTransaction(transaction, 1100);

  assert.throws(
    () =>
      confirmAtlasTransaction(reviewed.transaction, {
        transactionId: transaction.id,
        confirmedAt: 2000,
        confirmationToken: "user-confirmed",
      }),
    /expired/i,
  );
});

test("5I.1A cancellation prevents later review", () => {
  const transaction = prepare();
  const cancelled = cancelAtlasTransaction(transaction);

  assert.equal(cancelled.status, "cancelled");

  assert.throws(
    () => reviewAtlasTransaction(cancelled, 1100),
    /only prepared transactions/i,
  );
});

test("5I.1A validates required transaction fields", () => {
  assert.throws(
    () => prepare({ amount: " " }),
    /amount is required/i,
  );

  assert.throws(
    () => prepare({ destinationAddress: "" }),
    /destinationAddress is required/i,
  );

  assert.throws(
    () =>
      prepare({
        source: {
          type: "marketplace-order",
          id: "",
        },
      }),
    /source.id is required/i,
  );
});

test("5I.1A requires expiry after preparation", () => {
  assert.throws(
    () =>
      prepare({
        preparedAt: 1000,
        expiresAt: 1000,
      }),
    /later than preparedAt/i,
  );
});