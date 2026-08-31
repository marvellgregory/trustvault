import assert from "node:assert/strict";
import test from "node:test";

import {
  createAtlasExecutionBoundaryEnvelope,
} from "./atlas-execution-boundary-policy.ts";

function createHandoff() {
  return {
    version: 1,
    transactionId: "atlas-tx-1",
    kind: "transfer",
    asset: {
      symbol: "USDC",
      amount: "12.50",
    },
    destination: {
      address:
        "0x2222222222222222222222222222222222222222",
    },
    source: {
      feature: "marketplace",
      referenceId: "order-1",
    },
    chainId: 5042002,
    preparedAt: 100,
    expiresAt: 500,
    confirmedAt: 300,
    reviewBinding: "review-binding-1",
  };
}

test("5M.1C execution boundary explicitly assigns authority to the external user wallet", () => {
  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      createHandoff(),
    );

  assert.equal(
    envelope.authority,
    "EXTERNAL_USER_WALLET",
  );
});

test("5M.1C execution boundary preserves the inert Atlas handoff", () => {
  const handoff = createHandoff();

  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      handoff,
    );

  assert.deepEqual(
    envelope.handoff,
    handoff,
  );
});

test("5M.1C execution boundary exposes only version handoff and external authority", () => {
  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      createHandoff(),
    );

  assert.deepEqual(
    Object.keys(envelope).sort(),
    [
      "authority",
      "handoff",
      "version",
    ],
  );
});

test("5M.1C execution envelope contains no provider signer wallet client or broadcast authority", () => {
  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      createHandoff(),
    );

  const serialized =
    JSON.stringify(envelope).toLowerCase();

  for (
    const forbidden of [
      "privatekey",
      "seedphrase",
      "mnemonic",
      "provider",
      "signer",
      "walletclient",
      "signature",
      "broadcast",
      "sendtransaction",
      "writecontract",
    ]
  ) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `Execution boundary leaked forbidden authority: ${forbidden}`,
    );
  }
});

test("5M.1C execution boundary cannot be mutated after creation", () => {
  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      createHandoff(),
    );

  assert.equal(
    Object.isFrozen(envelope),
    true,
  );

  assert.equal(
    Object.isFrozen(envelope.handoff),
    true,
  );

  assert.equal(
    Object.isFrozen(envelope.handoff.asset),
    true,
  );

  assert.equal(
    Object.isFrozen(
      envelope.handoff.destination,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(envelope.handoff.source),
    true,
  );
});

test("5M.1C execution boundary clones nested handoff data instead of retaining mutable caller objects", () => {
  const handoff = createHandoff();

  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      handoff,
    );

  assert.notEqual(
    envelope.handoff,
    handoff,
  );

  assert.notEqual(
    envelope.handoff.asset,
    handoff.asset,
  );

  assert.notEqual(
    envelope.handoff.destination,
    handoff.destination,
  );

  assert.notEqual(
    envelope.handoff.source,
    handoff.source,
  );
});

test("5M.1C caller mutation cannot alter the created execution envelope", () => {
  const handoff = createHandoff();

  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      handoff,
    );

  handoff.asset.amount = "999999";
  handoff.destination.address =
    "0x9999999999999999999999999999999999999999";
  handoff.source.referenceId =
    "hostile-order";

  assert.equal(
    envelope.handoff.asset.amount,
    "12.50",
  );

  assert.equal(
    envelope.handoff.destination.address,
    "0x2222222222222222222222222222222222222222",
  );

  assert.equal(
    envelope.handoff.source.referenceId,
    "order-1",
  );
});

test("5M.1C external wallet authority does not imply Atlas signing authority", () => {
  const envelope =
    createAtlasExecutionBoundaryEnvelope(
      createHandoff(),
    );

  assert.notEqual(
    envelope.authority,
    "ATLAS",
  );

  assert.notEqual(
    envelope.authority,
    "ATLAS_WALLET",
  );
});