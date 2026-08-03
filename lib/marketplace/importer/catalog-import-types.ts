import type {
  MarketplaceProduct,
  ProductId,
  ProductImportIssue,
  ProductImportStatus,
  ProductSku,
} from "@/lib/marketplace/product-types";

export type CatalogImportStage =
  | "idle"
  | "reading-workbook"
  | "reading-images"
  | "validating"
  | "ready"
  | "importing"
  | "complete"
  | "error";

export type CatalogSourceFiles = {
  workbook: File;
  imageArchive: File;
};

export type CatalogWorkbookCell =
  | string
  | number
  | boolean
  | null
  | undefined;

export type CatalogWorkbookRow = Record<
  string,
  CatalogWorkbookCell
>;

export type CatalogSheetData = {
  sheetName: string;
  rows: CatalogWorkbookRow[];
};

export type CatalogWorkbookData = {
  fileName: string;
  sheetNames: string[];
  sheets: CatalogSheetData[];
  totalRows: number;
};

export type CatalogImageFile = {
  archivePath: string;
  fileName: string;
  extension: string;
  productId?: ProductId;
  role: "cover" | "gallery" | "unknown";
  position?: number;
  size: number;
};

export type CatalogProductImageFolder = {
  productId: ProductId;
  folderPath: string;
  files: CatalogImageFile[];
  coverImage?: CatalogImageFile;
  galleryImages: CatalogImageFile[];
};

export type CatalogImageArchiveData = {
  fileName: string;
  totalFiles: number;
  supportedImageFiles: number;
  unsupportedFiles: number;
  productFolders: CatalogProductImageFolder[];
  unassignedImages: CatalogImageFile[];
};

export type CatalogColumnMap = {
  productId: string;
  sku: string;
  title: string;
  description?: string;
  shortDescription?: string;

  category?: string;
  subcategory?: string;

  price: string;
  currency?: string;

  productType?: string;
  status?: string;

  inventoryQuantity?: string;
  inventoryTracked?: string;

  brand?: string;
  vendor?: string;

  tags?: string;
  sizes?: string;
  colors?: string;

  mainImage?: string;
  gallery1?: string;
  gallery2?: string;
  gallery3?: string;

  imageFolder?: string;
  imageCount?: string;
  imageMatchStatus?: string;

  featured?: string;
  giftEligible?: string;
  escrowEligible?: string;
};

export type CatalogNormalizedRow = {
  sheetName: string;
  rowNumber: number;

  productId: ProductId;
  sku: ProductSku;

  title: string;
  description: string;
  shortDescription?: string;

  category: string;
  subcategory?: string;

  priceAmount: string;
  currency: "USDC";

  productType: "physical" | "digital" | "service";
  status:
    | "draft"
    | "active"
    | "inactive"
    | "out-of-stock"
    | "archived";

  inventoryQuantity: number | null;
  inventoryTracked: boolean;

  brand?: string;
  vendor?: string;

  tags: string[];
  sizes: string[];
  colors: string[];

  featured: boolean;
  giftEligible: boolean;
  escrowEligible: boolean;

  sourceRow: CatalogWorkbookRow;
};

export type CatalogProductValidation = {
  productId: ProductId;
  sku: ProductSku;
  sheetName: string;
  rowNumber: number;

  title: string;
  category: string;

  status: ProductImportStatus;
  issues: ProductImportIssue[];

  workbookRow: CatalogNormalizedRow;
  imageFolder?: CatalogProductImageFolder;

  product?: MarketplaceProduct;
};

export type CatalogValidationSummary = {
  totalProducts: number;
  validProducts: number;
  warningProducts: number;
  invalidProducts: number;

  matchedImageFolders: number;
  missingImageFolders: number;
  extraImageFolders: number;

  duplicateProductIds: ProductId[];
  duplicateSkus: ProductSku[];

  unsupportedFiles: number;
  unassignedImages: number;
};

export type CatalogValidationResult = {
  id: string;
  stage: CatalogImportStage;

  workbook: CatalogWorkbookData;
  imageArchive: CatalogImageArchiveData;

  products: CatalogProductValidation[];
  summary: CatalogValidationSummary;

  globalIssues: ProductImportIssue[];

  validatedAt: string;
};

export type CatalogImportProgress = {
  stage: CatalogImportStage;
  message: string;
  completed: number;
  total: number;
  percentage: number;
};

export type CatalogImportOptions = {
  requireCoverImage: boolean;
  requireImageFolder: boolean;
  rejectDuplicateProductIds: boolean;
  rejectDuplicateSkus: boolean;
  allowProductsWithoutGalleryImages: boolean;
  allowedImageExtensions: string[];
  maximumImageSizeBytes: number;
};

export const defaultCatalogImportOptions: CatalogImportOptions = {
  requireCoverImage: true,
  requireImageFolder: true,
  rejectDuplicateProductIds: true,
  rejectDuplicateSkus: true,
  allowProductsWithoutGalleryImages: true,
  allowedImageExtensions: [
    "jpg",
    "jpeg",
    "png",
    "webp",
  ],
  maximumImageSizeBytes: 10 * 1024 * 1024,
};

export function createCatalogImportId() {
  return `catalog-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createImportIssue(
  code: string,
  message: string,
  severity: "warning" | "error",
  field?: string,
): ProductImportIssue {
  return {
    code,
    message,
    severity,
    field,
  };
}

export function getValidationStatus(
  issues: ProductImportIssue[],
): ProductImportStatus {
  if (issues.some((issue) => issue.severity === "error")) {
    return "invalid";
  }

  if (issues.some((issue) => issue.severity === "warning")) {
    return "warning";
  }

  return "valid";
}

export function calculateImportPercentage(
  completed: number,
  total: number,
) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((completed / total) * 100)),
  );
}
