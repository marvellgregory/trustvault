import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareAtlasTransaction,
  reviewAtlasTransaction,
} from "./atlas-transaction-preparation.ts";

import {
  ATLAS_CONFIRMATION_REPLAY_LIMIT,
  confirmAtlasTransactionOnce,
  createAtlasTransactionReplayState,
  hasAtlasTransactionBeenConsumed,
} from "./atlas-transaction-replay-protection.ts";

function prepare(id = "atlas-tx-1") {
  return prepareAtlasTransaction({
    id,
    kind: "marketplace-payment",
    amount: "25.00",
    destinationAddress:
      "0x1111111111111111111111111111111111111111",
    source: {
      type: "marketplace-order",
      id: "TV-1001",
    },
    chainId: 5042002,
    preparedAt: 1000,
    expiresAt: 2000,
  });
}

function confirmation(transaction) {
  return {
    transactionId: transaction.id,
    confirmedAt: 1200,
    confirmationToken: "user-confirmed",
  };
}

test("5I.1C confirms a reviewed transaction once", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const result = confirmAtlasTransactionOnce(
    createAtlasTransactionReplayState(),
    reviewed.transaction,
    reviewed.review,
    confirmation(reviewed.transaction),
  );

  assert.equal(result.transaction.status, "confirmed");

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      result.replayState,
      reviewed.transaction.id,
    ),
    true,
  );
});

test("5I.1C rejects replay of the same reviewed snapshot", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const first = confirmAtlasTransactionOnce(
    createAtlasTransactionReplayState(),
    reviewed.transaction,
    reviewed.review,
    confirmation(reviewed.transaction),
  );

  assert.throws(
    () =>
      confirmAtlasTransactionOnce(
        first.replayState,
        reviewed.transaction,
        reviewed.review,
        confirmation(reviewed.transaction),
      ),
    /already been consumed/i,
  );
});

test("5I.1C replay matching is case insensitive", () => {
  const reviewed = reviewAtlasTransaction(
    prepare("ATLAS-TX-ABC"),
    1100,
  );

  const first = confirmAtlasTransactionOnce(
    createAtlasTransactionReplayState(),
    reviewed.transaction,
    reviewed.review,
    confirmation(reviewed.transaction),
  );

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      first.replayState,
      "atlas-tx-abc",
    ),
    true,
  );
});

test("5I.1C permits a different reviewed transaction", () => {
  let state = createAtlasTransactionReplayState();

  const first = reviewAtlasTransaction(
    prepare("atlas-tx-1"),
    1100,
  );

  const firstResult = confirmAtlasTransactionOnce(
    state,
    first.transaction,
    first.review,
    confirmation(first.transaction),
  );

  state = firstResult.replayState;

  const second = reviewAtlasTransaction(
    prepare("atlas-tx-2"),
    1100,
  );

  const secondResult = confirmAtlasTransactionOnce(
    state,
    second.transaction,
    second.review,
    confirmation(second.transaction),
  );

  assert.equal(
    secondResult.transaction.status,
    "confirmed",
  );

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      secondResult.replayState,
      "atlas-tx-1",
    ),
    true,
  );

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      secondResult.replayState,
      "atlas-tx-2",
    ),
    true,
  );
});

test("5I.1C does not consume a failed confirmation", () => {
  const reviewed = reviewAtlasTransaction(
    prepare(),
    1100,
  );

  const state = createAtlasTransactionReplayState();

  assert.throws(
    () =>
      confirmAtlasTransactionOnce(
        state,
        reviewed.transaction,
        reviewed.review,
        {
          transactionId: reviewed.transaction.id,
          confirmedAt: 1200,
          confirmationToken: " ",
        },
      ),
    /explicit confirmation/i,
  );

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      state,
      reviewed.transaction.id,
    ),
    false,
  );
});

test("5I.1C bounds retained replay records", () => {
  let state = createAtlasTransactionReplayState();

  for (
    let index = 0;
    index < ATLAS_CONFIRMATION_REPLAY_LIMIT + 5;
    index += 1
  ) {
    const reviewed = reviewAtlasTransaction(
      prepare(`atlas-tx-${index}`),
      1100,
    );

    const result = confirmAtlasTransactionOnce(
      state,
      reviewed.transaction,
      reviewed.review,
      confirmation(reviewed.transaction),
    );

    state = result.replayState;
  }

  assert.equal(
    state.consumedTransactionIds.length,
    ATLAS_CONFIRMATION_REPLAY_LIMIT,
  );

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      state,
      "atlas-tx-0",
    ),
    false,
  );

  assert.equal(
    hasAtlasTransactionBeenConsumed(
      state,
      `atlas-tx-${ATLAS_CONFIRMATION_REPLAY_LIMIT + 4}`,
    ),
    true,
  );
});

test("5I.1C replay state carries no signing authority", () => {
  const state = createAtlasTransactionReplayState();

  const serialized = JSON.stringify(state).toLowerCase();

  for (const forbidden of [
    "privatekey",
    "seedphrase",
    "signature",
    "walletclient",
    "signingauthority",
    "sendtransaction",
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
    );
  }
});