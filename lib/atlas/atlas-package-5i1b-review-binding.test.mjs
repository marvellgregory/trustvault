import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmAtlasTransaction,
  prepareAtlasTransaction,
  reviewAtlasTransaction,
} from "./atlas-transaction-preparation.ts";

function prepare() {
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
  });
}

function confirm(transaction, review) {
  return confirmAtlasTransaction(
    transaction,
    review,
    {
      transactionId: transaction.id,
      confirmedAt: 1200,
      confirmationToken: "user-confirmed",
    },
  );
}

test("5I.1B confirms the exact transaction the user reviewed", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const confirmed = confirm(
    reviewed.transaction,
    reviewed.review,
  );

  assert.equal(confirmed.status, "confirmed");
});

test("5I.1B rejects amount mutation after review", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const changed = {
    ...reviewed.transaction,
    asset: {
      ...reviewed.transaction.asset,
      amount: "250.00",
    },
  };

  assert.throws(
    () => confirm(changed, reviewed.review),
    /changed after review/i,
  );
});

test("5I.1B rejects destination mutation after review", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const changed = {
    ...reviewed.transaction,
    destination: {
      ...reviewed.transaction.destination,
      address:
        "0x2222222222222222222222222222222222222222",
    },
  };

  assert.throws(
    () => confirm(changed, reviewed.review),
    /changed after review/i,
  );
});

test("5I.1B rejects chain mutation after review", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const changed = {
    ...reviewed.transaction,
    chainId: 1,
  };

  assert.throws(
    () => confirm(changed, reviewed.review),
    /changed after review/i,
  );
});

test("5I.1B rejects source mutation after review", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const changed = {
    ...reviewed.transaction,
    source: {
      ...reviewed.transaction.source,
      id: "TV-9999",
    },
  };

  assert.throws(
    () => confirm(changed, reviewed.review),
    /changed after review/i,
  );
});

test("5I.1B rejects mismatched review identity", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  assert.throws(
    () =>
      confirmAtlasTransaction(
        reviewed.transaction,
        {
          ...reviewed.review,
          transactionId: "atlas-tx-other",
        },
        {
          transactionId: reviewed.transaction.id,
          confirmedAt: 1200,
          confirmationToken: "user-confirmed",
        },
      ),
    /does not match/i,
  );
});

test("5I.1B rejects confirmation timestamp before review", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  assert.throws(
    () =>
      confirmAtlasTransaction(
        reviewed.transaction,
        reviewed.review,
        {
          transactionId: reviewed.transaction.id,
          confirmedAt: 1099,
          confirmationToken: "user-confirmed",
        },
      ),
    /before review/i,
  );
});

test("5I.1B rejects review timestamp before preparation", () => {
  assert.throws(
    () => reviewAtlasTransaction(prepare(), 999),
    /before preparation/i,
  );
});

test("5I.1B rejects invalid chain IDs during preparation", () => {
  assert.throws(
    () =>
      prepareAtlasTransaction({
        id: "atlas-tx-1",
        kind: "marketplace-payment",
        amount: "25.00",
        destinationAddress:
          "0x1111111111111111111111111111111111111111",
        source: {
          type: "marketplace-order",
          id: "TV-1001",
        },
        chainId: 0,
        preparedAt: 1000,
        expiresAt: 2000,
      }),
    /chainId/i,
  );
});