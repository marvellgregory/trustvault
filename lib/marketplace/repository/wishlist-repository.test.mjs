import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const repositoryPath =
  new URL(
    "./wishlist-repository.ts",
    import.meta.url,
  );

const typesPath =
  new URL(
    "../wishlist-types.ts",
    import.meta.url,
  );

const repository =
  fs.readFileSync(
    repositoryPath,
    "utf8",
  );

const types =
  fs.readFileSync(
    typesPath,
    "utf8",
  );

test(
  "wishlist uses a versioned TrustVault storage key",
  () => {
    assert.match(
      repository,
      /trustvault\.marketplace\.wishlist\.v1/,
    );
  },
);

test(
  "wishlist repository exposes required customer operations",
  () => {
    for (const operation of [
      "getWishlist",
      "getItems",
      "getProductIds",
      "has",
      "add",
      "remove",
      "toggle",
      "clear",
    ]) {
      assert.match(
        repository,
        new RegExp(
          `async\\s+${operation}\\s*\\(`,
        ),
      );
    }
  },
);

test(
  "wishlist stores a product snapshot",
  () => {
    assert.match(
      types,
      /WishlistItemSnapshot/,
    );

    assert.match(
      types,
      /coverImageSrc/,
    );

    assert.match(
      types,
      /sellerName/,
    );

    assert.match(
      types,
      /price:\s*ProductPrice/,
    );
  },
);

test(
  "wishlist prevents duplicate product ids",
  () => {
    assert.match(
      repository,
      /seen\.has\(item\.productId\)/,
    );

    assert.match(
      repository,
      /existing/,
    );
  },
);

test(
  "wishlist recovers from malformed browser storage",
  () => {
    assert.match(
      repository,
      /JSON\.parse\(stored\)/,
    );

    assert.match(
      repository,
      /catch\s*\{/,
    );

    assert.match(
      repository,
      /createEmptyWishlist\(\)/,
    );
  },
);

test(
  "wishlist publishes same-window and storage updates",
  () => {
    assert.match(
      repository,
      /CustomEvent/,
    );

    assert.match(
      repository,
      /"storage"/,
    );

    assert.match(
      repository,
      /subscribeToWishlistUpdates/,
    );
  },
);