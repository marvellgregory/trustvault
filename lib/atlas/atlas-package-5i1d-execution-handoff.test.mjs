import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmAtlasTransaction,
  prepareAtlasTransaction,
  reviewAtlasTransaction,
} from "./atlas-transaction-preparation.ts";

import {
  createAtlasExecutionHandoff,
} from "./atlas-transaction-execution-handoff.ts";

function prepare() {
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
  });
}

function getConfirmedFlow() {
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
    prepared,
    reviewed,
    confirmed,
  };
}

test("5I.1D creates an execution handoff only from confirmed intent", () => {
  const flow = getConfirmedFlow();

  const handoff = createAtlasExecutionHandoff({
    transaction: flow.confirmed,
    review: flow.reviewed.review,
    confirmedAt: 1200,
  });

  assert.equal(
    handoff.transactionId,
    flow.confirmed.id,
  );

  assert.equal(
    handoff.asset.amount,
    "25.00",
  );

  assert.equal(
    handoff.chainId,
    5042002,
  );
});

test("5I.1D rejects a prepared transaction", () => {
  const prepared = prepare();

  const reviewed = reviewAtlasTransaction(
    prepared,
    1100,
  );

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: prepared,
        review: reviewed.review,
        confirmedAt: 1200,
      }),
    /only confirmed transactions/i,
  );
});

test("5I.1D rejects a reviewed but unconfirmed transaction", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: reviewed.transaction,
        review: reviewed.review,
        confirmedAt: 1200,
      }),
    /only confirmed transactions/i,
  );
});

test("5I.1D rejects mismatched review identity", () => {
  const flow = getConfirmedFlow();

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: flow.confirmed,
        review: {
          ...flow.reviewed.review,
          transactionId: "atlas-tx-other",
        },
        confirmedAt: 1200,
      }),
    /does not match transaction/i,
  );
});

test("5I.1D rejects confirmation time before review", () => {
  const flow = getConfirmedFlow();

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: flow.confirmed,
        review: flow.reviewed.review,
        confirmedAt: 1099,
      }),
    /cannot precede review/i,
  );
});

test("5I.1D rejects expired execution handoff creation", () => {
  const flow = getConfirmedFlow();

  assert.throws(
    () =>
      createAtlasExecutionHandoff({
        transaction: flow.confirmed,
        review: flow.reviewed.review,
        confirmedAt: 2000,
      }),
    /expired before execution handoff/i,
  );
});

test("5I.1D handoff contains no signing or broadcast authority", () => {
  const flow = getConfirmedFlow();

  const handoff = createAtlasExecutionHandoff({
    transaction: flow.confirmed,
    review: flow.reviewed.review,
    confirmedAt: 1200,
  });

  const serialized =
    JSON.stringify(handoff).toLowerCase();

  for (const forbidden of [
    "privatekey",
    "seedphrase",
    "signature",
    "walletclient",
    "signer",
    "sendtransaction",
    "broadcast",
    "execute",
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
    );
  }
});

test("5I.1D preserves the reviewed transaction details", () => {
  const flow = getConfirmedFlow();

  const handoff = createAtlasExecutionHandoff({
    transaction: flow.confirmed,
    review: flow.reviewed.review,
    confirmedAt: 1200,
  });

  assert.deepEqual(handoff.asset, {
    symbol: "USDC",
    amount: "25.00",
  });

  assert.deepEqual(handoff.source, {
    type: "marketplace-order",
    id: "TV-1001",
  });

  assert.equal(
    handoff.destination.address,
    "0x1111111111111111111111111111111111111111",
  );

  assert.equal(
    handoff.reviewBinding,
    flow.reviewed.review.binding,
  );
});