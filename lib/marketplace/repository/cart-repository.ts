import {
  createCartItemSnapshot,
  createEmptyCartTotals,
  type AddToCartInput,
  type CartId,
  type CartItem,
  type CartItemId,
  type MarketplaceCart,
  type UpdateCartItemInput,
} from "@/lib/marketplace/cart-types";
import type {
  ProductPrice,
} from "@/lib/marketplace/product-types";

export type CartRepository = {
  getCart(): Promise<MarketplaceCart>;

  addItem(
    input: AddToCartInput,
  ): Promise<MarketplaceCart>;

  updateItem(
    input: UpdateCartItemInput,
  ): Promise<MarketplaceCart>;

  removeItem(
    cartItemId: CartItemId,
  ): Promise<MarketplaceCart>;

  saveForLater(
    cartItemId: CartItemId,
  ): Promise<MarketplaceCart>;

  moveSavedItemToCart(
    cartItemId: CartItemId,
  ): Promise<MarketplaceCart>;

  clear(): Promise<MarketplaceCart>;
};

export const CART_UPDATED_EVENT =
  "trustvault:marketplace-cart-updated";

const STORAGE_KEY =
  "trustvault.marketplace.cart.v1";

const DEFAULT_CART_ID: CartId =
  "trustvault-browser-cart";

function isBrowser() {
  return typeof window !== "undefined";
}

function createCartItemId() {
  return `cart-item-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createEmptyCart(): MarketplaceCart {
  const now = new Date().toISOString();

  return {
    id: DEFAULT_CART_ID,
    status: "active",

    items: [],
    savedForLater: [],

    discounts: [],
    totals: createEmptyCartTotals(),

    currency: "USDC",

    createdAt: now,
    updatedAt: now,
  };
}

function isMarketplaceCart(
  value: unknown,
): value is MarketplaceCart {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<MarketplaceCart>;

  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.savedForLater) &&
    Array.isArray(candidate.discounts) &&
    candidate.currency === "USDC"
  );
}

function readCart(): MarketplaceCart {
  if (!isBrowser()) {
    return createEmptyCart();
  }

  try {
    const storedValue =
      window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return createEmptyCart();
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (!isMarketplaceCart(parsedValue)) {
      return createEmptyCart();
    }

    return recalculateCart(parsedValue);
  } catch {
    return createEmptyCart();
  }
}

function writeCart(cart: MarketplaceCart) {
  if (!isBrowser()) {
    throw new Error(
      "Marketplace cart storage is unavailable during server rendering.",
    );
  }

  const recalculatedCart =
    recalculateCart({
      ...cart,
      updatedAt: new Date().toISOString(),
    });

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(recalculatedCart),
  );

  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, {
      detail: recalculatedCart,
    }),
  );

  return recalculatedCart;
}

function normalizeAmount(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value
    .toFixed(6)
    .replace(/\.?0+$/, "");
}

function createPrice(
  amount: number,
): ProductPrice {
  return {
    amount: normalizeAmount(amount),
    currency: "USDC",
  };
}

function getNumericAmount(
  price: ProductPrice,
) {
  const value = Number(price.amount);

  return Number.isFinite(value)
    ? value
    : 0;
}

function recalculateCart(
  cart: MarketplaceCart,
): MarketplaceCart {
  const subtotal = cart.items.reduce(
    (total, item) => {
      const unitPrice =
        getNumericAmount(
          item.snapshot.unitPrice,
        );

      return (
        total +
        unitPrice * item.quantity
      );
    },
    0,
  );

  const shipping = cart.items.reduce(
    (total, item) => {
      if (!item.shipping) {
        return total;
      }

      return (
        total +
        getNumericAmount(
          item.shipping.price,
        )
      );
    },
    0,
  );

  const discount = cart.discounts.reduce(
    (total, item) =>
      total +
      getNumericAmount(item.amount),
    0,
  );

  const tax = getNumericAmount(
    cart.totals.tax,
  );

  const total = Math.max(
    0,
    subtotal +
      shipping +
      tax -
      discount,
  );

  return {
    ...cart,

    totals: {
      subtotal: createPrice(subtotal),
      shipping: createPrice(shipping),
      discount: createPrice(discount),
      tax: createPrice(tax),
      total: createPrice(total),
    },
  };
}

function findMatchingItem(
  cart: MarketplaceCart,
  input: AddToCartInput,
) {
  const variantId = input.variant?.id;

  const normalizedOptions =
    JSON.stringify(
      input.selectedOptions ?? {},
    );

  const normalizedGift =
    JSON.stringify(
      input.gift ?? {},
    );

  return cart.items.find((item) => {
    return (
      item.productId === input.product.id &&
      item.variantId === variantId &&
      JSON.stringify(
        item.selectedOptions ?? {},
      ) === normalizedOptions &&
      JSON.stringify(
        item.gift ?? {},
      ) === normalizedGift
    );
  });
}

function validateQuantity(
  quantity: number,
) {
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Cart quantity must be a positive whole number.",
    );
  }
}

function enforceInventoryLimit(
  input: AddToCartInput,
  requestedQuantity: number,
) {
  const inventory =
    input.variant?.inventory ??
    input.product.inventory;

  if (!inventory.tracked) {
    return;
  }

  if (
    inventory.policy === "continue" ||
    inventory.quantity === null
  ) {
    return;
  }

  if (
    requestedQuantity >
    inventory.quantity
  ) {
    throw new Error(
      `Only ${inventory.quantity} item(s) are currently available.`,
    );
  }
}

function createCartItem(
  cart: MarketplaceCart,
  input: AddToCartInput,
): CartItem {
  const now = new Date().toISOString();

  const quantity =
    input.quantity ?? 1;

  validateQuantity(quantity);
  enforceInventoryLimit(
    input,
    quantity,
  );

  return {
    id: createCartItemId(),
    cartId: cart.id,

    productId: input.product.id,
    variantId: input.variant?.id,

    quantity,

    itemType:
      input.gift?.enabled
        ? "gift"
        : "standard",

    selectedOptions:
      input.selectedOptions,

    gift: input.gift,

    snapshot:
      createCartItemSnapshot(
        input.product,
        input.variant,
      ),

    addedAt: now,
    updatedAt: now,
  };
}

export const browserCartRepository: CartRepository =
  {
    async getCart() {
      return readCart();
    },

    async addItem(input) {
      const cart = readCart();

      const quantity =
        input.quantity ?? 1;

      validateQuantity(quantity);

      const existingItem =
        findMatchingItem(
          cart,
          input,
        );

      if (existingItem) {
        const nextQuantity =
          existingItem.quantity +
          quantity;

        enforceInventoryLimit(
          input,
          nextQuantity,
        );

        const items =
          cart.items.map((item) =>
            item.id ===
            existingItem.id
              ? {
                  ...item,
                  quantity:
                    nextQuantity,
                  updatedAt:
                    new Date().toISOString(),
                }
              : item,
          );

        return writeCart({
          ...cart,
          status: "active",
          items,
        });
      }

      const item =
        createCartItem(
          cart,
          input,
        );

      return writeCart({
        ...cart,
        status: "active",
        items: [
          ...cart.items,
          item,
        ],
      });
    },

    async updateItem(input) {
      const cart = readCart();

      const existingItem =
        cart.items.find(
          (item) =>
            item.id ===
            input.cartItemId,
        );

      if (!existingItem) {
        throw new Error(
          "The selected cart item could not be found.",
        );
      }

      if (
        input.quantity !== undefined
      ) {
        validateQuantity(
          input.quantity,
        );
      }

      const items: CartItem[] =
        cart.items.map((item) => {
          if (
            item.id !==
            input.cartItemId
          ) {
            return item;
          }

          return {
            ...item,

            quantity:
              input.quantity ??
              item.quantity,

            selectedOptions:
              input.selectedOptions ??
              item.selectedOptions,

            gift:
              input.gift ??
              item.gift,

            itemType:
              (input.gift ??
                item.gift)
                ?.enabled
                ? "gift"
                : "standard",

            shipping:
              input.shipping ??
              item.shipping,

            updatedAt:
              new Date().toISOString(),
          };
        });

      return writeCart({
        ...cart,
        items,
      });
    },

    async removeItem(cartItemId) {
      const cart = readCart();

      return writeCart({
        ...cart,

        items: cart.items.filter(
          (item) =>
            item.id !== cartItemId,
        ),
      });
    },

    async saveForLater(cartItemId) {
      const cart = readCart();

      const item =
        cart.items.find(
          (cartItem) =>
            cartItem.id ===
            cartItemId,
        );

      if (!item) {
        throw new Error(
          "The selected cart item could not be found.",
        );
      }

      const now =
        new Date().toISOString();

      return writeCart({
        ...cart,

        items: cart.items.filter(
          (cartItem) =>
            cartItem.id !==
            cartItemId,
        ),

        savedForLater: [
          ...cart.savedForLater.filter(
            (savedItem) =>
              savedItem.id !==
              cartItemId,
          ),

          {
            id: item.id,
            productId:
              item.productId,
            variantId:
              item.variantId,
            quantity:
              item.quantity,
            snapshot:
              item.snapshot,
            savedAt: now,
          },
        ],
      });
    },

    async moveSavedItemToCart(
      cartItemId,
    ) {
      const cart = readCart();

      const savedItem =
        cart.savedForLater.find(
          (item) =>
            item.id === cartItemId,
        );

      if (!savedItem) {
        throw new Error(
          "The saved product could not be found.",
        );
      }

      const now =
        new Date().toISOString();

      const cartItem: CartItem = {
        id: savedItem.id,
        cartId: cart.id,

        productId:
          savedItem.productId,
        variantId:
          savedItem.variantId,

        quantity:
          savedItem.quantity,

        itemType: "standard",

        snapshot:
          savedItem.snapshot,

        addedAt: now,
        updatedAt: now,
      };

      return writeCart({
        ...cart,

        items: [
          ...cart.items,
          cartItem,
        ],

        savedForLater:
          cart.savedForLater.filter(
            (item) =>
              item.id !==
              cartItemId,
          ),
      });
    },

    async clear() {
      const cart =
        createEmptyCart();

      return writeCart(cart);
    },
  };

export function getCartStorageKey() {
  return STORAGE_KEY;
}

export function subscribeToCartUpdates(
  listener: (
    cart: MarketplaceCart,
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
        MarketplaceCart
      >;

    listener(customEvent.detail);
  }

  function handleStorageEvent(
    event: StorageEvent,
  ) {
    if (
      event.key === STORAGE_KEY
    ) {
      listener(readCart());
    }
  }

  window.addEventListener(
    CART_UPDATED_EVENT,
    handleCustomEvent,
  );

  window.addEventListener(
    "storage",
    handleStorageEvent,
  );

  return () => {
    window.removeEventListener(
      CART_UPDATED_EVENT,
      handleCustomEvent,
    );

    window.removeEventListener(
      "storage",
      handleStorageEvent,
    );
  };
}

