import assert from "node:assert/strict";
import test from "node:test";

import { extractAtlasEntities } from "./atlas-entity-extraction.ts";

test("5B.1 extracts an explicit Marketplace order reference", () => {
  assert.deepEqual(extractAtlasEntities("show me order TV-1001"), [
    {
      kind: "marketplace-order",
      reference: "explicit",
      value: "TV-1001",
    },
  ]);
});

test("5B.1 extracts an explicit receipt reference", () => {
  assert.deepEqual(extractAtlasEntities("open receipt receipt-456"), [
    {
      kind: "receipt",
      reference: "explicit",
      value: "receipt-456",
    },
  ]);
});

test("5B.1 extracts the existing numeric Gift Vault identifier", () => {
  assert.deepEqual(extractAtlasEntities("show gift #42"), [
    {
      kind: "gift",
      reference: "explicit",
      value: "42",
    },
  ]);
});

test("5B.1 extracts an explicit Bill Split reference", () => {
  assert.deepEqual(extractAtlasEntities("show bill split bill-17"), [
    {
      kind: "bill-split",
      reference: "explicit",
      value: "bill-17",
    },
  ]);
});

test("5B.1 extracts a valid transaction hash", () => {
  const hash = `0x${"a".repeat(64)}`;

  assert.deepEqual(extractAtlasEntities(`check transaction ${hash}`), [
    {
      kind: "transaction-hash",
      reference: "explicit",
      value: hash,
    },
  ]);
});

test("5B.1 rejects malformed transaction hashes", () => {
  assert.deepEqual(extractAtlasEntities("check transaction 0x1234"), []);
});

test("5B.1 recognizes latest order without inventing an ID", () => {
  assert.deepEqual(extractAtlasEntities("show my latest order"), [
    {
      kind: "marketplace-order",
      reference: "latest",
    },
  ]);
});

test("5B.1 recognizes previous receipt without inventing an ID", () => {
  assert.deepEqual(extractAtlasEntities("show the previous receipt"), [
    {
      kind: "receipt",
      reference: "previous",
    },
  ]);
});

test("5B.1 recognizes contextual Gift Vault reference without inventing an ID", () => {
  assert.deepEqual(extractAtlasEntities("what about that gift"), [
    {
      kind: "gift",
      reference: "current",
    },
  ]);
});

test("5B.1 recognizes contextual Bill Split reference without inventing an ID", () => {
  assert.deepEqual(extractAtlasEntities("what about this bill split"), [
    {
      kind: "bill-split",
      reference: "current",
    },
  ]);
});

test("5B.1 does not invent entities from unrelated numbers", () => {
  assert.deepEqual(
    extractAtlasEntities("split this between 4 people for 25 USDC"),
    [],
  );
});

test("5B.1 extraction exposes no authority metadata", () => {
  const entities = extractAtlasEntities("show my latest order");

  for (const entity of entities) {
    assert.equal("toolId" in entity, false);
    assert.equal("authenticated" in entity, false);
    assert.equal("owned" in entity, false);
    assert.equal("execute" in entity, false);
    assert.equal("transaction" in entity, false);
  }
});

test("5B.1 does not treat imperative order language as an entity", () => {
  assert.deepEqual(extractAtlasEntities("order this item for me"), []);
});

test("5B.1 does not treat gift action language as an entity", () => {
  assert.deepEqual(extractAtlasEntities("gift this to Sarah"), []);
});

test("5B.1 does not treat split action language as a record reference", () => {
  assert.deepEqual(extractAtlasEntities("split that amount equally"), []);
});

test("5B.1 does not invent a receipt identifier from an amount", () => {
  assert.deepEqual(extractAtlasEntities("receipt for 25 USDC"), []);
});

test("5B.1 keeps explicit entities distinct from contextual words elsewhere", () => {
  assert.deepEqual(
    extractAtlasEntities("for this payment show order TV-1001"),
    [
      {
        kind: "marketplace-order",
        reference: "explicit",
        value: "TV-1001",
      },
    ],
  );
});

test("5B.1 extracts multiple legitimate entities from one message", () => {
  const hash = `0x${"b".repeat(64)}`;

  assert.deepEqual(
    extractAtlasEntities(`check order TV-1001 and transaction ${hash}`),
    [
      {
        kind: "transaction-hash",
        reference: "explicit",
        value: hash,
      },
      {
        kind: "marketplace-order",
        reference: "explicit",
        value: "TV-1001",
      },
    ],
  );
});

test("5B.1 does not convert ordinary participant counts into Gift IDs", () => {
  assert.deepEqual(
    extractAtlasEntities("send a gift to 3 people"),
    [],
  );
});

test("5B.1 does not convert an amount after split into a Bill Split ID", () => {
  assert.deepEqual(
    extractAtlasEntities("split 50 USDC between us"),
    [],
  );
});

test("5B.1G extracts multiple explicit Marketplace order references", () => {
  assert.deepEqual(
    extractAtlasEntities(
      "show order TV-1001 and order TV-2002",
    ),
    [
      {
        kind: "marketplace-order",
        reference: "explicit",
        value: "TV-1001",
      },
      {
        kind: "marketplace-order",
        reference: "explicit",
        value: "TV-2002",
      },
    ],
  );
});

test("5B.1G extracts multiple explicit Gift Vault references", () => {
  assert.deepEqual(
    extractAtlasEntities(
      "show gift 42 and gift 84",
    ),
    [
      {
        kind: "gift",
        reference: "explicit",
        value: "42",
      },
      {
        kind: "gift",
        reference: "explicit",
        value: "84",
      },
    ],
  );
});

test("5B.1G extracts multiple explicit Bill Split references", () => {
  assert.deepEqual(
    extractAtlasEntities(
      "show bill split bill-17 and bill split bill-18",
    ),
    [
      {
        kind: "bill-split",
        reference: "explicit",
        value: "bill-17",
      },
      {
        kind: "bill-split",
        reference: "explicit",
        value: "bill-18",
      },
    ],
  );
});

test("5B.1G deduplicates repeated explicit references case-insensitively", () => {
  assert.deepEqual(
    extractAtlasEntities(
      "show order TV-1001 and order tv-1001",
    ),
    [
      {
        kind: "marketplace-order",
        reference: "explicit",
        value: "TV-1001",
      },
    ],
  );
});
