import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require =
  createRequire(import.meta.url);

const {
  BillSplitError,
  getBillSplit,
  listBillSplits,
  saveBillSplit,
  validateBillSplitForPersistence,
} = require("./bill-split.cjs");

const CUSTOMER_ID =
  "tvc_11111111111111111111111111111111";

const WALLET =
  "0x1111111111111111111111111111111111111111";

const OTHER_WALLET =
  "0x2222222222222222222222222222222222222222";

const PARTICIPANT_WALLET =
  "0x3333333333333333333333333333333333333333";

const NOW =
  new Date(
    "2026-08-21T03:30:00.000Z",
  );

const session = {
  customerId: CUSTOMER_ID,
  walletAddress: WALLET,
  chainId: 5_042_002,
};

function validBill() {
  return {
    id: "bill-1724210000000-test",
    title: "Dinner",
    note: "Friday dinner",
    totalAmount: "20",
    totalBaseUnits: "20000000",
    asset: "USDC",
    network: "Arc Testnet",
    organizerAddress: WALLET,
    splitMethod: "equal",
    participants: [
      {
        id: "participant-organizer",
        name: "Organizer",
        walletAddress: WALLET,
        amountBaseUnits: "10000000",
        amount: "10",
        status: "paid",
        paidAt:
          "2026-08-21T03:00:00.000Z",
        settlementType:
          "organizer-self-share",
      },
      {
        id: "participant-friend",
        name: "Friend",
        walletAddress:
          PARTICIPANT_WALLET,
        amountBaseUnits: "10000000",
        amount: "10",
        status: "pending",
      },
    ],
    createdAt:
      "2026-08-21T03:00:00.000Z",
    updatedAt:
      "2026-08-21T03:00:00.000Z",
    status: "active",
  };
}

function storedItem(
  bill,
  customerId = CUSTOMER_ID,
) {
  return {
    PK: {
      S: `CUSTOMER#${customerId}`,
    },
    SK: {
      S: `BILL_SPLIT#${bill.id}`,
    },
    entityType: {
      S: "BILL_SPLIT",
    },
    customerId: {
      S: customerId,
    },
    billId: {
      S: bill.id,
    },
    billJson: {
      S: JSON.stringify(bill),
    },
  };
}

test(
  "Bill Split validation derives ownership from authenticated session",
  () => {
    const result =
      validateBillSplitForPersistence(
        session,
        validBill(),
      );

    assert.equal(
      result.customerId,
      CUSTOMER_ID,
    );

    assert.equal(
      result.walletAddress,
      WALLET,
    );

    assert.equal(
      result.bill.organizerAddress,
      WALLET,
    );
  },
);

test(
  "Bill Split validation rejects unauthenticated sessions",
  () => {
    assert.throws(
      () =>
        validateBillSplitForPersistence(
          {},
          validBill(),
        ),
      (error) =>
        error instanceof
          BillSplitError &&
        error.statusCode === 401 &&
        error.code ===
          "BILL_SPLIT_AUTHENTICATION_REQUIRED",
    );
  },
);

test(
  "Bill Split validation rejects organizer impersonation",
  () => {
    const bill =
      validBill();

    bill.organizerAddress =
      OTHER_WALLET;

    assert.throws(
      () =>
        validateBillSplitForPersistence(
          session,
          bill,
        ),
      (error) =>
        error instanceof
          BillSplitError &&
        error.statusCode === 403 &&
        error.code ===
          "BILL_SPLIT_OWNERSHIP_MISMATCH",
    );
  },
);

test(
  "Bill Split validation preserves exact USDC base-unit totals",
  () => {
    const bill =
      validBill();

    bill.participants[1]
      .amountBaseUnits =
      "9999999";

    assert.throws(
      () =>
        validateBillSplitForPersistence(
          session,
          bill,
        ),
      (error) =>
        error instanceof
          BillSplitError &&
        error.statusCode === 400 &&
        error.code ===
          "INVALID_BILL_SPLIT",
    );
  },
);

test(
  "Bill Split validation rejects settled state while participant remains pending",
  () => {
    const bill =
      validBill();

    bill.status =
      "settled";

    assert.throws(
      () =>
        validateBillSplitForPersistence(
          session,
          bill,
        ),
      (error) =>
        error instanceof
          BillSplitError &&
        error.statusCode === 400 &&
        error.code ===
          "INVALID_BILL_SPLIT",
    );
  },
);

test(
  "valid Bill Split persists under authenticated customer partition",
  async () => {
    const writes = [];

    const saved =
      await saveBillSplit(
        session,
        validBill(),
        {
          now: () => NOW,

          putItem:
            async (input) => {
              writes.push(input);
              return {};
            },
        },
      );

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      writes[0].TableName,
      "TrustVaultPilot",
    );

    assert.equal(
      writes[0].Item.PK.S,
      `CUSTOMER#${CUSTOMER_ID}`,
    );

    assert.equal(
      writes[0].Item.SK.S,
      `BILL_SPLIT#${saved.id}`,
    );

    assert.equal(
      writes[0].Item.entityType.S,
      "BILL_SPLIT",
    );

    assert.equal(
      writes[0].Item.organizerAddress.S,
      WALLET,
    );

    assert.equal(
      saved.updatedAt,
      NOW.toISOString(),
    );
  },
);

test(
  "authenticated customer can retrieve persisted Bill Split",
  async () => {
    const bill =
      validBill();

    const loaded =
      await getBillSplit(
        session,
        bill.id,
        {
          getItem:
            async (input) => {
              assert.equal(
                input.Key.PK.S,
                `CUSTOMER#${CUSTOMER_ID}`,
              );

              assert.equal(
                input.Key.SK.S,
                `BILL_SPLIT#${bill.id}`,
              );

              return {
                Item:
                  storedItem(bill),
              };
            },
        },
      );

    assert.equal(
      loaded.id,
      bill.id,
    );

    assert.equal(
      loaded.organizerAddress,
      WALLET,
    );
  },
);

test(
  "customer cannot retrieve Bill Split stored for another customer",
  async () => {
    const bill =
      validBill();

    await assert.rejects(
      () =>
        getBillSplit(
          session,
          bill.id,
          {
            getItem:
              async () => ({
                Item:
                  storedItem(
                    bill,
                    "tvc_22222222222222222222222222222222",
                  ),
              }),
          },
        ),
      (error) =>
        error instanceof
          BillSplitError &&
        error.statusCode === 404 &&
        error.code ===
          "BILL_SPLIT_NOT_FOUND",
    );
  },
);

test(
  "Bill Split collection queries only authenticated customer partition",
  async () => {
    const older =
      validBill();

    older.id =
      "bill-older";

    older.updatedAt =
      "2026-08-20T00:00:00.000Z";

    const newer =
      validBill();

    newer.id =
      "bill-newer";

    newer.updatedAt =
      "2026-08-21T00:00:00.000Z";

    const queries = [];

    const bills =
      await listBillSplits(
        session,
        {
          query:
            async (input) => {
              queries.push(
                input,
              );

              return {
                Items: [
                  storedItem(
                    older,
                  ),
                  storedItem(
                    newer,
                  ),
                ],
              };
            },
        },
      );

    assert.equal(
      queries.length,
      1,
    );

    assert.equal(
      queries[0]
        .ExpressionAttributeValues[
          ":customerPk"
        ].S,
      `CUSTOMER#${CUSTOMER_ID}`,
    );

    assert.equal(
      queries[0]
        .ExpressionAttributeValues[
          ":billPrefix"
        ].S,
      "BILL_SPLIT#",
    );

    assert.deepEqual(
      bills.map(
        (bill) =>
          bill.id,
      ),
      [
        "bill-newer",
        "bill-older",
      ],
    );
  },
);
