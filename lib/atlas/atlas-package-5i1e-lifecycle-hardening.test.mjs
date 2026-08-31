import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmAtlasTransaction,
  expireAtlasTransaction,
  prepareAtlasTransaction,
  reviewAtlasTransaction,
} from "./atlas-transaction-preparation.ts";

import {
  createAtlasExecutionHandoff,
} from "./atlas-transaction-execution-handoff.ts";

function prepare(
  overrides = {},
) {
  return prepareAtlasTransaction({
    id: "atlas-tx-1",
    kind: "marketplace-payment",
    amount: "25.00",
    destinationAddress:
      "0x1111111111111111111111111111111111111111",
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

function confirmedFlow() {
  const prepared = prepare();

  const reviewed = reviewAtlasTransaction(
    prepared,
    1100,
  );

  const confirmed = confirmAtlasTransaction(
    reviewed.transaction,
    reviewed.review,
    {
      transactionId: prepared.id,
      confirmedAt: 1200,
      confirmationToken: "user-confirmed",
    },
  );

  return {
    reviewed,
    confirmed,
  };
}

test("5I.1E explicitly expires a prepared transaction", () => {
  const expired = expireAtlasTransaction(
    prepare(),
    2000,
  );

  assert.equal(expired.status, "expired");
});

test("5I.1E explicitly expires a reviewed transaction", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const expired = expireAtlasTransaction(
    reviewed.transaction,
    2000,
  );

  assert.equal(expired.status, "expired");
});

test("5I.1E refuses premature expiry", () => {
  assert.throws(
    () =>
      expireAtlasTransaction(
        prepare(),
        1999,
      ),
    /before its expiry time/i,
  );
});

test("5I.1E expired transactions cannot be reviewed", () => {
  const expired = expireAtlasTransaction(
    prepare(),
    2000,
  );

  assert.throws(
    () =>
      reviewAtlasTransaction(
        expired,
        2001,
      ),
    /only prepared transactions/i,
  );
});

test("5I.1E confirmed transactions cannot transition to expired", () => {
  const flow = confirmedFlow();

  assert.throws(
    () =>
      expireAtlasTransaction(
        flow.confirmed,
        2000,
      ),
    /cannot transition to expired/i,
  );
});

test("5I.1E rejects amount mutation after confirmation before handoff", () => {
  const flow = confirmedFlow();

  const changed = {
    ...flow.confirmed,
    asset: {
      ...flow.confirmed.asset,
      amount: "250.00",
    },
  };

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: changed,
        review: flow.reviewed.review,
        confirmedAt: 1200,
      }),
    /changed after review/i,
  );
});

test("5I.1E rejects destination mutation after confirmation before handoff", () => {
  const flow = confirmedFlow();

  const changed = {
    ...flow.confirmed,
    destination: {
      ...flow.confirmed.destination,
      address:
        "0x2222222222222222222222222222222222222222",
    },
  };

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: changed,
        review: flow.reviewed.review,
        confirmedAt: 1200,
      }),
    /changed after review/i,
  );
});

test("5I.1E rejects source mutation after confirmation before handoff", () => {
  const flow = confirmedFlow();

  const changed = {
    ...flow.confirmed,
    source: {
      ...flow.confirmed.source,
      id: "TV-9999",
    },
  };

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: changed,
        review: flow.reviewed.review,
        confirmedAt: 1200,
      }),
    /changed after review/i,
  );
});

test("5I.1E rejects chain mutation after confirmation before handoff", () => {
  const flow = confirmedFlow();

  const changed = {
    ...flow.confirmed,
    chainId: 1,
  };

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: changed,
        review: flow.reviewed.review,
        confirmedAt: 1200,
      }),
    /changed after review/i,
  );
});

test("5I.1E unchanged confirmed transaction still creates handoff", () => {
  const flow = confirmedFlow();

  const handoff = createAtlasExecutionHandoff({
    transaction: flow.confirmed,
    review: flow.reviewed.review,
    confirmedAt: 1200,
  });

  assert.equal(
    handoff.transactionId,
    "atlas-tx-1",
  );

  assert.equal(
    handoff.asset.amount,
    "25.00",
  );
});