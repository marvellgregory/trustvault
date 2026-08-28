import type {
  MarketplaceProduct,
  ProductId,
} from "@/lib/marketplace/product-types";
import {
  createEmptyWishlist,
  createWishlistItemSnapshot,
  type MarketplaceWishlist,
  type WishlistItem,
  type WishlistRepository,
} from "@/lib/marketplace/wishlist-types";

const STORAGE_KEY =
  "trustvault.marketplace.wishlist.v1";

const WISHLIST_UPDATED_EVENT =
  "trustvault:wishlist-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

function isWishlistItem(
  value: unknown,
): value is WishlistItem {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const item =
    value as Partial<WishlistItem>;

  return (
    typeof item.productId === "string" &&
    item.productId.length > 0 &&
    typeof item.savedAt === "string" &&
    typeof item.snapshot === "object" &&
    item.snapshot !== null &&
    item.snapshot.productId === item.productId &&
    typeof item.snapshot.title === "string" &&
    typeof item.snapshot.slug === "string"
  );
}

function normalizeWishlist(
  value: unknown,
): MarketplaceWishlist {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return createEmptyWishlist();
  }

  const candidate =
    value as Partial<MarketplaceWishlist>;

  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.items)
  ) {
    return createEmptyWishlist();
  }

  const seen =
    new Set<ProductId>();

  const items =
    candidate.items.filter((item) => {
      if (!isWishlistItem(item)) {
        return false;
      }

      if (seen.has(item.productId)) {
        return false;
      }

      seen.add(item.productId);
      return true;
    });

  return {
    version: 1,
    items,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : new Date().toISOString(),
  };
}

function readWishlist(): MarketplaceWishlist {
  if (!isBrowser()) {
    return createEmptyWishlist();
  }

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!stored) {
      return createEmptyWishlist();
    }

    return normalizeWishlist(
      JSON.parse(stored),
    );
  }
  catch {
    return createEmptyWishlist();
  }
}

function emitWishlistUpdate(
  wishlist: MarketplaceWishlist,
) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      WISHLIST_UPDATED_EVENT,
      {
        detail: wishlist,
      },
    ),
  );
}

function writeWishlist(
  wishlist: MarketplaceWishlist,
): MarketplaceWishlist {
  const normalized =
    normalizeWishlist({
      ...wishlist,
      version: 1,
      updatedAt:
        new Date().toISOString(),
    });

  if (isBrowser()) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalized),
      );
    }
    catch {
      // Keep the current interaction usable when
      // browser storage is unavailable or full.
    }

    emitWishlistUpdate(normalized);
  }

  return normalized;
}

function createWishlistItem(
  product: MarketplaceProduct,
): WishlistItem {
  return {
    productId: product.id,
    snapshot:
      createWishlistItemSnapshot(
        product,
      ),
    savedAt:
      new Date().toISOString(),
  };
}

export const browserWishlistRepository:
  WishlistRepository = {
    async getWishlist() {
      return readWishlist();
    },

    async getItems() {
      return readWishlist().items;
    },

    async getProductIds() {
      return readWishlist().items.map(
        (item) => item.productId,
      );
    },

    async has(productId) {
      return readWishlist().items.some(
        (item) =>
          item.productId === productId,
      );
    },

    async add(product) {
      const wishlist =
        readWishlist();

      const existing =
        wishlist.items.find(
          (item) =>
            item.productId ===
            product.id,
        );

      if (existing) {
        return wishlist;
      }

      return writeWishlist({
        ...wishlist,
        items: [
          ...wishlist.items,
          createWishlistItem(product),
        ],
      });
    },

    async remove(productId) {
      const wishlist =
        readWishlist();

      return writeWishlist({
        ...wishlist,
        items:
          wishlist.items.filter(
            (item) =>
              item.productId !==
              productId,
          ),
      });
    },

    async toggle(product) {
      const wishlist =
        readWishlist();

      const exists =
        wishlist.items.some(
          (item) =>
            item.productId ===
            product.id,
        );

      if (exists) {
        return writeWishlist({
          ...wishlist,
          items:
            wishlist.items.filter(
              (item) =>
                item.productId !==
                product.id,
            ),
        });
      }

      return writeWishlist({
        ...wishlist,
        items: [
          ...wishlist.items,
          createWishlistItem(product),
        ],
      });
    },

    async clear() {
      return writeWishlist(
        createEmptyWishlist(),
      );
    },
  };

export function getWishlistStorageKey() {
  return STORAGE_KEY;
}

export function subscribeToWishlistUpdates(
  listener: (
    wishlist: MarketplaceWishlist,
  ) => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  function handleCustomEvent(
    event: Event,
  ) {
    const customEvent =
      event as CustomEvent<
        MarketplaceWishlist
      >;

    listener(
      normalizeWishlist(
        customEvent.detail,
      ),
    );
  }

  function handleStorageEvent(
    event: StorageEvent,
  ) {
    if (event.key === STORAGE_KEY) {
      listener(readWishlist());
    }
  }

  window.addEventListener(
    WISHLIST_UPDATED_EVENT,
    handleCustomEvent,
  );

  window.addEventListener(
    "storage",
    handleStorageEvent,
  );

  return () => {
    window.removeEventListener(
      WISHLIST_UPDATED_EVENT,
      handleCustomEvent,
    );

    window.removeEventListener(
      "storage",
      handleStorageEvent,
    );
  };
}