import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const source =
  await fs.readFile(
    new URL(
      "./receipt-store.ts",
      import.meta.url,
    ),
    "utf8",
  );

test(
  "Marketplace receipt store preserves local-first save",
  () => {
    const writeIndex =
      source.indexOf(
        "writeBrowserReceipts(",
        source.indexOf(
          "async save(receipt)",
        ),
      );

    const syncIndex =
      source.indexOf(
        "syncMarketplaceReceiptSnapshot(",
        source.indexOf(
          "async save(receipt)",
        ),
      );

    assert.ok(
      writeIndex >= 0,
      "save() must write the browser receipt",
    );

    assert.ok(
      syncIndex >= 0,
      "save() must schedule Marketplace AWS persistence",
    );

    assert.ok(
      writeIndex < syncIndex,
      "browser persistence must happen before AWS synchronization",
    );
  },
);

test(
  "only Marketplace purchase receipts are sent to Marketplace AWS persistence",
  () => {
    assert.match(
      source,
      /return receipt\.type === "purchase";/,
    );

    assert.match(
      source,
      /!isMarketplaceReceipt\(receipt\)/,
    );

    assert.match(
      source,
      /syncMarketplaceReceipt\(/,
    );
  },
);

test(
  "findById performs local-first authenticated cloud recovery",
  () => {
    const methodStart =
      source.indexOf(
        "async findById(receiptId)",
      );

    assert.ok(
      methodStart >= 0,
      "findById() must exist",
    );

    const methodEnd =
      source.indexOf(
        "async findAll()",
        methodStart,
      );

    assert.ok(
      methodEnd > methodStart,
      "findById() method boundary must exist",
    );

    const method =
      source.slice(
        methodStart,
        methodEnd,
      );

    const localIndex =
      method.indexOf(
        "if (localReceipt)",
      );

    const cloudIndex =
      method.indexOf(
        "loadMarketplaceReceiptFromCloud(",
      );

    const hydrateIndex =
      method.indexOf(
        "storeRecoveredReceipt(",
      );

    assert.ok(
      localIndex >= 0,
      "findById() must check local storage",
    );

    assert.ok(
      cloudIndex >= 0,
      "findById() must support AWS recovery",
    );

    assert.ok(
      hydrateIndex >= 0,
      "recovered receipt must rehydrate browser storage",
    );

    assert.ok(
      localIndex < cloudIndex,
      "local receipt lookup must happen before AWS recovery",
    );

    assert.ok(
      cloudIndex < hydrateIndex,
      "AWS recovery must happen before browser rehydration",
    );
  },
);

test(
  "findAll merges authenticated Marketplace cloud receipts with local receipts",
  () => {
    const methodStart =
      source.indexOf(
        "async findAll()",
      );

    const methodEnd =
      source.indexOf(
        "async remove(receiptId)",
        methodStart,
      );

    assert.ok(
      methodStart >= 0 &&
      methodEnd > methodStart,
      "findAll() method must exist",
    );

    const method =
      source.slice(
        methodStart,
        methodEnd,
      );

    assert.match(
      method,
      /readBrowserReceipts\(\)/,
    );

    assert.match(
      method,
      /loadMarketplaceReceiptsFromCloud\(\)/,
    );

    assert.match(
      method,
      /localReceipts\[/,
    );

    assert.match(
      method,
      /writeBrowserReceipts\(/,
    );

    assert.match(
      method,
      /sortStoredReceipts\(/,
    );
  },
);

test(
  "cloud hydration does not trigger a redundant AWS write",
  () => {
    const helperStart =
      source.indexOf(
        "function storeRecoveredReceipt(",
      );

    const helperEnd =
      source.indexOf(
        "function syncMarketplaceReceiptSnapshot(",
        helperStart,
      );

    assert.ok(
      helperStart >= 0 &&
      helperEnd > helperStart,
      "recovery helper must exist",
    );

    const helper =
      source.slice(
        helperStart,
        helperEnd,
      );

    assert.match(
      helper,
      /writeBrowserReceipts\(/,
    );

    assert.doesNotMatch(
      helper,
      /syncMarketplaceReceipt\(/,
    );
  },
);

test(
  "browser clear and remove do not delete durable Marketplace receipts",
  () => {
    const removeStart =
      source.indexOf(
        "async remove(receiptId)",
      );

    const clearStart =
      source.indexOf(
        "async clear()",
        removeStart,
      );

    assert.ok(
      removeStart >= 0 &&
      clearStart > removeStart,
      "remove() and clear() must exist",
    );

    const removeMethod =
      source.slice(
        removeStart,
        clearStart,
      );

    const clearMethod =
      source.slice(
        clearStart,
        source.indexOf(
          "export function createReceiptPath",
          clearStart,
        ),
      );

    assert.match(
      removeMethod,
      /delete receipts\[/,
    );

    assert.doesNotMatch(
      removeMethod,
      /fetch\(/,
    );

    assert.doesNotMatch(
      removeMethod,
      /deleteMarketplaceReceipt/,
    );

    assert.match(
      clearMethod,
      /localStorage\.removeItem/,
    );

    assert.doesNotMatch(
      clearMethod,
      /fetch\(/,
    );

    assert.doesNotMatch(
      clearMethod,
      /deleteMarketplaceReceipt/,
    );
  },
);

test(
  "public ReceiptStore interface remains backward compatible",
  () => {
    assert.match(
      source,
      /save\([\s\S]*?Promise<StoredReceipt>/,
    );

    assert.match(
      source,
      /findById\([\s\S]*?Promise<StoredReceipt \| null>/,
    );

    assert.match(
      source,
      /findAll\(\): Promise<StoredReceipt\[\]>/,
    );

    assert.match(
      source,
      /remove\([\s\S]*?Promise<void>/,
    );

    assert.match(
      source,
      /clear\(\): Promise<void>/,
    );
  },
);
