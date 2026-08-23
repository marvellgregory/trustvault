import type {
  MarketplaceProduct,
  ProductId,
  ProductPrice,
  ProductSku,
  ProductType,
  SellerId,
} from "@/lib/marketplace/product-types";

export type WishlistItemSnapshot = {
  productId: ProductId;
  sku: ProductSku;
  title: string;
  slug: string;
  coverImageSrc?: string;
  sellerId: SellerId;
  sellerName: string;
  price: ProductPrice;
  productType: ProductType;
  status: MarketplaceProduct["status"];
  giftEligible: boolean;
  escrowEligible: boolean;
};

export type WishlistItem = {
  productId: ProductId;
  snapshot: WishlistItemSnapshot;
  savedAt: string;
};

export type MarketplaceWishlist = {
  version: 1;
  items: WishlistItem[];
  updatedAt: string;
};

export type WishlistRepository = {
  getWishlist(): Promise<MarketplaceWishlist>;
  getItems(): Promise<WishlistItem[]>;
  getProductIds(): Promise<ProductId[]>;
  has(productId: ProductId): Promise<boolean>;
  add(product: MarketplaceProduct): Promise<MarketplaceWishlist>;
  remove(productId: ProductId): Promise<MarketplaceWishlist>;
  toggle(product: MarketplaceProduct): Promise<MarketplaceWishlist>;
  clear(): Promise<MarketplaceWishlist>;
};

export function createEmptyWishlist(): MarketplaceWishlist {
  return {
    version: 1,
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createWishlistItemSnapshot(
  product: MarketplaceProduct,
): WishlistItemSnapshot {
  const coverImage =
    product.coverImage ??
    product.images.find(
      (image) => image.role === "cover",
    ) ??
    product.images[0];

  return {
    productId: product.id,
    sku: product.sku,
    title: product.title,
    slug: product.slug,
    coverImageSrc: coverImage?.src,
    sellerId: product.seller.id,
    sellerName:
      product.seller.storeName ??
      product.seller.displayName,
    price: product.price,
    productType: product.productType,
    status: product.status,
    giftEligible: product.giftEligible,
    escrowEligible: product.escrowEligible,
  };
}