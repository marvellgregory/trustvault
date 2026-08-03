import type {
  MarketplaceProduct,
  ProductId,
  ProductPrice,
  ProductSku,
  ProductVariant,
  SellerId,
} from "@/lib/marketplace/product-types";

export type CartId = string;
export type CartItemId = string;

export type CartStatus =
  | "active"
  | "checkout"
  | "converted"
  | "abandoned";

export type CartItemType =
  | "standard"
  | "gift";

export type CartGiftOptions = {
  enabled: boolean;
  recipientName?: string;
  recipientWallet?: string;
  message?: string;
  requestedDeliveryDate?: string;
  hideSenderIdentity?: boolean;
};

export type CartShippingSelection = {
  methodId: string;
  methodName: string;
  price: ProductPrice;
  estimatedDelivery?: string;
  trackingAvailable: boolean;
};

export type CartItemSnapshot = {
  productId: ProductId;
  sku: ProductSku;
  title: string;
  slug: string;
  coverImageSrc?: string;
  sellerId: SellerId;
  sellerName: string;
  unitPrice: ProductPrice;
  productType: MarketplaceProduct["productType"];
  escrowEligible: boolean;
  giftEligible: boolean;
};

export type CartItem = {
  id: CartItemId;
  cartId: CartId;

  productId: ProductId;
  variantId?: string;

  quantity: number;
  itemType: CartItemType;

  selectedOptions?: Record<string, string>;
  gift?: CartGiftOptions;
  shipping?: CartShippingSelection;

  snapshot: CartItemSnapshot;

  addedAt: string;
  updatedAt: string;
};

export type SavedCartItem = {
  id: CartItemId;
  productId: ProductId;
  variantId?: string;
  quantity: number;
  snapshot: CartItemSnapshot;
  savedAt: string;
};

export type CartDiscount = {
  id: string;
  code: string;
  label: string;
  amount: ProductPrice;
};

export type CartTotals = {
  subtotal: ProductPrice;
  shipping: ProductPrice;
  discount: ProductPrice;
  tax: ProductPrice;
  total: ProductPrice;
};

export type MarketplaceCart = {
  id: CartId;
  status: CartStatus;

  buyerWallet?: string;
  buyerUserId?: string;

  items: CartItem[];
  savedForLater: SavedCartItem[];

  discounts: CartDiscount[];
  totals: CartTotals;

  currency: "USDC";

  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

export type AddToCartInput = {
  product: MarketplaceProduct;
  variant?: ProductVariant;
  quantity?: number;
  selectedOptions?: Record<string, string>;
  gift?: CartGiftOptions;
};

export type UpdateCartItemInput = {
  cartItemId: CartItemId;
  quantity?: number;
  selectedOptions?: Record<string, string>;
  gift?: CartGiftOptions;
  shipping?: CartShippingSelection;
};

export type CartValidationIssue = {
  cartItemId?: CartItemId;
  productId?: ProductId;
  code:
    | "invalid-quantity"
    | "product-unavailable"
    | "variant-unavailable"
    | "inventory-insufficient"
    | "missing-shipping"
    | "invalid-gift-recipient"
    | "price-changed";
  message: string;
  severity: "warning" | "error";
};

export type CartValidationResult = {
  valid: boolean;
  issues: CartValidationIssue[];
};

export type CheckoutReadiness = {
  ready: boolean;
  walletConnected: boolean;
  networkVerified: boolean;
  shippingComplete: boolean;
  inventoryVerified: boolean;
  totalsVerified: boolean;
  issues: CartValidationIssue[];
};

export function createEmptyPrice(): ProductPrice {
  return {
    amount: "0",
    currency: "USDC",
  };
}

export function createEmptyCartTotals(): CartTotals {
  return {
    subtotal: createEmptyPrice(),
    shipping: createEmptyPrice(),
    discount: createEmptyPrice(),
    tax: createEmptyPrice(),
    total: createEmptyPrice(),
  };
}

export function createCartItemSnapshot(
  product: MarketplaceProduct,
  variant?: ProductVariant,
): CartItemSnapshot {
  const coverImage =
    product.coverImage ??
    product.images.find((image) => image.role === "cover") ??
    product.images[0];

  return {
    productId: product.id,
    sku: variant?.sku ?? product.sku,
    title: variant
      ? `${product.title} — ${variant.title}`
      : product.title,
    slug: product.slug,
    coverImageSrc: variant?.imageSrc ?? coverImage?.src,
    sellerId: product.seller.id,
    sellerName:
      product.seller.storeName ??
      product.seller.displayName,
    unitPrice: variant?.price ?? product.price,
    productType: product.productType,
    escrowEligible: product.escrowEligible,
    giftEligible: product.giftEligible,
  };
}

export function calculateCartItemTotal(
  item: CartItem,
): ProductPrice {
  const unitPrice = Number(item.snapshot.unitPrice.amount);

  const amount =
    Number.isFinite(unitPrice) && item.quantity > 0
      ? unitPrice * item.quantity
      : 0;

  return {
    amount: amount.toFixed(6).replace(/\.?0+$/, ""),
    currency: "USDC",
  };
}

export function isValidCartQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity > 0;
}

export function getCartItemCount(cart: MarketplaceCart) {
  return cart.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
}
