export type ProductId = string;
export type ProductSku = string;
export type SellerId = string;

export type ProductStatus =
  | "draft"
  | "active"
  | "inactive"
  | "out-of-stock"
  | "archived";

export type ProductType =
  | "physical"
  | "digital"
  | "service";

export type InventoryPolicy =
  | "deny"
  | "continue";

export type ProductImageRole =
  | "cover"
  | "gallery";

export type ProductImage = {
  id: string;
  productId: ProductId;
  role: ProductImageRole;
  src: string;
  alt: string;
  position: number;
};

export type ProductPrice = {
  amount: string;
  currency: "USDC";
};

export type ProductInventory = {
  tracked: boolean;
  quantity: number | null;
  policy: InventoryPolicy;
};

export type ProductDimensions = {
  weight?: string;
  width?: string;
  height?: string;
  length?: string;
};

export type ProductVariantOption = {
  name: string;
  values: string[];
};

export type ProductVariant = {
  id: string;
  productId: ProductId;
  sku: ProductSku;
  title: string;
  price: ProductPrice;
  inventory: ProductInventory;
  options: Record<string, string>;
  imageSrc?: string;
  status: ProductStatus;
};

export type SellerSummary = {
  id: SellerId;
  displayName: string;
  storeName?: string;
  verified: boolean;
};

export type MarketplaceProduct = {
  id: ProductId;
  sku: ProductSku;

  title: string;
  slug: string;
  description: string;
  shortDescription?: string;

  category: string;
  subcategory?: string;
  tags: string[];

  productType: ProductType;
  status: ProductStatus;

  price: ProductPrice;
  compareAtPrice?: ProductPrice;

  images: ProductImage[];
  coverImage?: ProductImage;

  inventory: ProductInventory;
  dimensions?: ProductDimensions;

  sizes?: string[];
  colors?: string[];
  specifications?: Record<string, string>;

  variantOptions?: ProductVariantOption[];
  variants?: ProductVariant[];

  seller: SellerSummary;

  brand?: string;
  vendor?: string;
  originCountry?: string;

  featured: boolean;
  giftEligible: boolean;
  escrowEligible: boolean;

  createdAt: string;
  updatedAt: string;

  source?: {
    workbookSheet?: string;
    imageFolder?: string;
    importBatchId?: string;
  };
};

export type MarketplaceCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageSrc?: string;
  parentId?: string;
  position: number;
  active: boolean;
};

export type ProductImportStatus =
  | "valid"
  | "warning"
  | "invalid";

export type ProductImportIssue = {
  field?: string;
  code: string;
  message: string;
  severity: "warning" | "error";
};

export type ProductImportPreview = {
  productId: ProductId;
  sku: ProductSku;
  title: string;
  category: string;
  imageCount: number;
  imageFolder?: string;
  status: ProductImportStatus;
  issues: ProductImportIssue[];
  product?: MarketplaceProduct;
};

export type ProductImportBatch = {
  id: string;
  fileName: string;
  imageArchiveName?: string;
  createdAt: string;

  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;

  products: ProductImportPreview[];
};

export function createProductImageId(
  productId: ProductId,
  position: number,
) {
  return `${productId}-image-${position}`;
}

export function getProductCoverImage(
  product: MarketplaceProduct,
) {
  return (
    product.coverImage ??
    product.images.find((image) => image.role === "cover") ??
    product.images[0]
  );
}

export function isProductPurchasable(
  product: MarketplaceProduct,
) {
  if (product.status !== "active") {
    return false;
  }

  if (!product.inventory.tracked) {
    return true;
  }

  return (
    product.inventory.quantity === null ||
    product.inventory.quantity > 0 ||
    product.inventory.policy === "continue"
  );
}
