import {
  createProductImageId,
  type MarketplaceProduct,
  type ProductImage,
  type ProductImportIssue,
  type ProductStatus,
  type ProductType,
} from "@/lib/marketplace/product-types";
import {
  createCatalogImportId,
  createImportIssue,
  defaultCatalogImportOptions,
  getValidationStatus,
  type CatalogColumnMap,
  type CatalogImageArchiveData,
  type CatalogImportOptions,
  type CatalogNormalizedRow,
  type CatalogProductValidation,
  type CatalogValidationResult,
  type CatalogWorkbookCell,
  type CatalogWorkbookData,
  type CatalogWorkbookRow,
} from "@/lib/marketplace/importer/catalog-import-types";

type ValidateCatalogInput = {
  workbook: CatalogWorkbookData;
  imageArchive: CatalogImageArchiveData;
  options?: Partial<CatalogImportOptions>;
};

const COLUMN_ALIASES: Record<
  keyof CatalogColumnMap,
  string[]
> = {
  productId: [
    "product id",
    "productid",
    "product_id",
    "id",
  ],

  sku: [
    "sku",
    "product sku",
    "productsku",
  ],

  title: [
    "title",
    "product title",
    "product name",
    "name",
  ],

  description: [
    "description",
    "product description",
    "long description",
  ],

  shortDescription: [
    "short description",
    "shortdescription",
    "summary",
  ],

  category: [
    "category",
    "product category",
  ],

  subcategory: [
    "subcategory",
    "sub category",
    "product subcategory",
  ],

  price: [
    "price usdc",
    "usdc price",
    "price",
    "selling price",
  ],

  currency: [
    "currency",
    "price currency",
  ],

  productType: [
    "product type",
    "producttype",
    "type",
  ],

  status: [
    "status",
    "product status",
  ],

  inventoryQuantity: [
    "inventory quantity",
    "inventory",
    "quantity",
    "stock",
    "stock quantity",
  ],

  inventoryTracked: [
    "inventory tracked",
    "track inventory",
    "tracked",
  ],

  brand: [
    "brand",
    "product brand",
  ],

  vendor: [
    "vendor",
    "seller",
    "merchant",
  ],

  tags: [
    "tags",
    "keywords",
  ],

  sizes: [
    "sizes",
    "size",
  ],

  colors: [
    "colors",
    "colours",
    "color",
    "colour",
  ],

  mainImage: [
    "main image",
    "cover image",
    "cover",
    "primary image",
  ],

  gallery1: [
    "gallery 1",
    "gallery1",
    "image 1",
  ],

  gallery2: [
    "gallery 2",
    "gallery2",
    "image 2",
  ],

  gallery3: [
    "gallery 3",
    "gallery3",
    "image 3",
  ],

  imageFolder: [
    "image folder",
    "imagefolder",
    "folder path",
  ],

  imageCount: [
    "image count",
    "imagecount",
  ],

  imageMatchStatus: [
    "image match status",
    "image status",
    "match status",
  ],

  featured: [
    "featured",
    "is featured",
  ],

  giftEligible: [
    "gift eligible",
    "gifteligible",
    "gift",
  ],

  escrowEligible: [
    "escrow eligible",
    "escroweligible",
    "escrow",
  ],
};

function normalizeColumnName(value: string) {
  return value
    .replace(/\uFEFF/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveColumn(
  row: CatalogWorkbookRow,
  aliases: string[],
) {
  const entries = Object.keys(row);

  return entries.find((column) => {
    const normalizedColumn =
      normalizeColumnName(column);

    return aliases.some(
      (alias) =>
        normalizedColumn ===
        normalizeColumnName(alias),
    );
  });
}

function createColumnMap(
  row: CatalogWorkbookRow,
): Partial<CatalogColumnMap> {
  const map: Partial<CatalogColumnMap> = {};

  (
    Object.keys(
      COLUMN_ALIASES,
    ) as Array<keyof CatalogColumnMap>
  ).forEach((key) => {
    const column = resolveColumn(
      row,
      COLUMN_ALIASES[key],
    );

    if (column) {
      map[key] = column;
    }
  });

  return map;
}

function getCell(
  row: CatalogWorkbookRow,
  column?: string,
): CatalogWorkbookCell {
  if (!column) {
    return null;
  }

  return row[column];
}

function toText(value: CatalogWorkbookCell) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function toOptionalText(
  value: CatalogWorkbookCell,
) {
  const text = toText(value);

  return text || undefined;
}

function toBoolean(
  value: CatalogWorkbookCell,
  fallback: boolean,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  if (
    [
      "true",
      "yes",
      "y",
      "1",
      "enabled",
      "active",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "n",
      "0",
      "disabled",
      "inactive",
    ].includes(normalized)
  ) {
    return false;
  }

  return fallback;
}

function toList(value: CatalogWorkbookCell) {
  const text = toText(value);

  if (!text) {
    return [];
  }

  return text
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProductId(
  value: CatalogWorkbookCell,
) {
  return toText(value).toUpperCase();
}

function normalizeSku(
  value: CatalogWorkbookCell,
) {
  return toText(value).toUpperCase();
}

function normalizePrice(
  value: CatalogWorkbookCell,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return String(value);
  }

  const normalized = toText(value)
    .replace(/,/g, "")
    .replace(/USDC/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  return normalized;
}

function normalizeInventoryQuantity(
  value: CatalogWorkbookCell,
) {
  const text = toText(value);

  if (!text) {
    return null;
  }

  const quantity = Number(text);

  if (
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    return null;
  }

  return Math.floor(quantity);
}

function normalizeProductType(
  value: CatalogWorkbookCell,
): ProductType {
  const normalized = toText(value)
    .toLowerCase();

  if (normalized === "digital") {
    return "digital";
  }

  if (normalized === "service") {
    return "service";
  }

  return "physical";
}

function normalizeProductStatus(
  value: CatalogWorkbookCell,
): ProductStatus {
  const normalized = toText(value)
    .replace(/\s+/g, "-")
    .toLowerCase();

  const supportedStatuses: ProductStatus[] = [
    "draft",
    "active",
    "inactive",
    "out-of-stock",
    "archived",
  ];

  if (
    supportedStatuses.includes(
      normalized as ProductStatus,
    )
  ) {
    return normalized as ProductStatus;
  }

  return "active";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRow(
  row: CatalogWorkbookRow,
  sheetName: string,
  rowNumber: number,
): CatalogNormalizedRow {
  const columns = createColumnMap(row);

  const productId = normalizeProductId(
    getCell(row, columns.productId),
  );

  const sku =
    normalizeSku(
      getCell(row, columns.sku),
    ) || productId;

  const category =
    toText(
      getCell(row, columns.category),
    ) || sheetName;

  const inventoryQuantity =
    normalizeInventoryQuantity(
      getCell(
        row,
        columns.inventoryQuantity,
      ),
    );

  return {
    sheetName,
    rowNumber,

    productId,
    sku,

    title: toText(
      getCell(row, columns.title),
    ),

    description:
      toText(
        getCell(row, columns.description),
      ) ||
      toText(
        getCell(
          row,
          columns.shortDescription,
        ),
      ),

    shortDescription: toOptionalText(
      getCell(
        row,
        columns.shortDescription,
      ),
    ),

    category,
    subcategory: toOptionalText(
      getCell(row, columns.subcategory),
    ),

    priceAmount: normalizePrice(
      getCell(row, columns.price),
    ),

    currency: "USDC",

    productType: normalizeProductType(
      getCell(row, columns.productType),
    ),

    status: normalizeProductStatus(
      getCell(row, columns.status),
    ),

    inventoryQuantity,

    inventoryTracked: toBoolean(
      getCell(
        row,
        columns.inventoryTracked,
      ),
      inventoryQuantity !== null,
    ),

    brand: toOptionalText(
      getCell(row, columns.brand),
    ),

    vendor: toOptionalText(
      getCell(row, columns.vendor),
    ),

    tags: toList(
      getCell(row, columns.tags),
    ),

    sizes: toList(
      getCell(row, columns.sizes),
    ),

    colors: toList(
      getCell(row, columns.colors),
    ),

    featured: toBoolean(
      getCell(row, columns.featured),
      false,
    ),

    giftEligible: toBoolean(
      getCell(row, columns.giftEligible),
      true,
    ),

    escrowEligible: toBoolean(
      getCell(row, columns.escrowEligible),
      true,
    ),

    sourceRow: row,
  };
}

function validateNormalizedRow(
  row: CatalogNormalizedRow,
) {
  const issues: ProductImportIssue[] = [];

  if (!row.productId) {
    issues.push(
      createImportIssue(
        "missing-product-id",
        "Product ID is required.",
        "error",
        "Product ID",
      ),
    );
  } else if (
    !/^TV-[A-Z0-9]+-\d{6}$/i.test(
      row.productId,
    )
  ) {
    issues.push(
      createImportIssue(
        "invalid-product-id",
        `Product ID "${row.productId}" does not follow the expected TV-CODE-000000 format.`,
        "error",
        "Product ID",
      ),
    );
  }

  if (!row.sku) {
    issues.push(
      createImportIssue(
        "missing-sku",
        "SKU is required.",
        "error",
        "SKU",
      ),
    );
  }

  if (!row.title) {
    issues.push(
      createImportIssue(
        "missing-title",
        "Product title is required.",
        "error",
        "Title",
      ),
    );
  }

  if (!row.category) {
    issues.push(
      createImportIssue(
        "missing-category",
        "Product category is required.",
        "error",
        "Category",
      ),
    );
  }

  const numericPrice = Number(
    row.priceAmount,
  );

  if (
    !row.priceAmount ||
    !Number.isFinite(numericPrice) ||
    numericPrice < 0
  ) {
    issues.push(
      createImportIssue(
        "invalid-price",
        "Enter a valid non-negative USDC price.",
        "error",
        "Price USDC",
      ),
    );
  }

  if (!row.description) {
    issues.push(
      createImportIssue(
        "missing-description",
        "Product description is empty.",
        "warning",
        "Description",
      ),
    );
  }

  return issues;
}

function createProductImages(
  productId: string,
  folder:
    | CatalogProductValidation["imageFolder"]
    | undefined,
): ProductImage[] {
  if (!folder) {
    return [];
  }

  const orderedImages = [
    ...(folder.coverImage
      ? [folder.coverImage]
      : []),
    ...folder.galleryImages,
  ];

  return orderedImages.map(
    (image, index) => ({
      id: createProductImageId(
        productId,
        index,
      ),

      productId,

      role:
        image === folder.coverImage
          ? "cover"
          : "gallery",

      src: image.archivePath,

      alt:
        image === folder.coverImage
          ? `${productId} cover image`
          : `${productId} product image ${
              index + 1
            }`,

      position: index,
    }),
  );
}

function createMarketplaceProduct(
  row: CatalogNormalizedRow,
  imageFolder:
    | CatalogProductValidation["imageFolder"]
    | undefined,
  importBatchId: string,
): MarketplaceProduct {
  const images = createProductImages(
    row.productId,
    imageFolder,
  );

  const coverImage = images.find(
    (image) => image.role === "cover",
  );

  const timestamp = new Date().toISOString();

  return {
    id: row.productId,
    sku: row.sku,

    title: row.title,
    slug:
      slugify(
        `${row.productId}-${row.title}`,
      ) || row.productId.toLowerCase(),

    description: row.description,
    shortDescription:
      row.shortDescription,

    category: row.category,
    subcategory: row.subcategory,
    tags: row.tags,

    productType:
      row.sheetName.trim().toLowerCase() === "digital" ||
      row.category.trim().toLowerCase() === "digital"
        ? "digital"
        : row.productType === "service"
          ? "service"
          : "physical",

    status:
      row.status === "archived"
        ? "archived"
        : "active",

    price: {
      amount: row.priceAmount,
      currency: "USDC",
    },

    images,
    coverImage,

    inventory: {
      tracked: row.inventoryTracked,
      quantity:
        row.inventoryQuantity,
      policy: "deny",
    },

    sizes:
      row.sizes.length > 0
        ? row.sizes
        : undefined,

    colors:
      row.colors.length > 0
        ? row.colors
        : undefined,

    seller: {
      id: "trustvault-catalog",
      displayName:
        row.vendor || "TrustVault Seller",
      storeName: row.vendor,
      verified: false,
    },

    brand: row.brand,
    vendor: row.vendor,

    featured: row.featured,
    giftEligible:
      row.giftEligible,
    escrowEligible:
      row.escrowEligible,

    createdAt: timestamp,
    updatedAt: timestamp,

    source: {
      workbookSheet: row.sheetName,
      imageFolder:
        imageFolder?.folderPath,
      importBatchId,
    },
  };
}

function findDuplicates(
  values: string[],
) {
  const counts = new Map<string, number>();

  values
    .filter(Boolean)
    .forEach((value) => {
      counts.set(
        value,
        (counts.get(value) ?? 0) + 1,
      );
    });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

export function validateCatalog({
  workbook,
  imageArchive,
  options: optionOverrides,
}: ValidateCatalogInput): CatalogValidationResult {
  const options: CatalogImportOptions = {
    ...defaultCatalogImportOptions,
    ...optionOverrides,
  };

  const importBatchId =
    createCatalogImportId();

  const normalizedRows =
    workbook.sheets.flatMap((sheet) =>
      sheet.rows.map((row, index) =>
        normalizeRow(
          row,
          sheet.sheetName,
          index + 2,
        ),
      ),
    );

  const duplicateProductIds =
    findDuplicates(
      normalizedRows.map(
        (row) => row.productId,
      ),
    );

  const duplicateSkus =
    findDuplicates(
      normalizedRows.map(
        (row) => row.sku,
      ),
    );

  const imageFolderMap = new Map(
    imageArchive.productFolders.map(
      (folder) => [
        folder.productId.toUpperCase(),
        folder,
      ],
    ),
  );

  const workbookProductIds = new Set(
    normalizedRows
      .map((row) => row.productId)
      .filter(Boolean),
  );

  const products: CatalogProductValidation[] =
    normalizedRows.map((row) => {
      const issues =
        validateNormalizedRow(row);

      const imageFolder =
        imageFolderMap.get(
          row.productId,
        );

      if (
        options.rejectDuplicateProductIds &&
        duplicateProductIds.includes(
          row.productId,
        )
      ) {
        issues.push(
          createImportIssue(
            "duplicate-product-id",
            `Product ID "${row.productId}" appears more than once in the workbook.`,
            "error",
            "Product ID",
          ),
        );
      }

      if (
        options.rejectDuplicateSkus &&
        duplicateSkus.includes(row.sku)
      ) {
        issues.push(
          createImportIssue(
            "duplicate-sku",
            `SKU "${row.sku}" appears more than once in the workbook.`,
            "error",
            "SKU",
          ),
        );
      }

      if (
        options.requireImageFolder &&
        !imageFolder
      ) {
        issues.push(
          createImportIssue(
            "missing-image-folder",
            `No image folder was found for Product ID "${row.productId}".`,
            "error",
            "Images",
          ),
        );
      }

      if (
        imageFolder &&
        options.requireCoverImage &&
        !imageFolder.coverImage
      ) {
        issues.push(
          createImportIssue(
            "missing-cover-image",
            `The image folder for "${row.productId}" does not contain a recognized cover image.`,
            "error",
            "Images",
          ),
        );
      }

      if (
        imageFolder &&
        imageFolder.galleryImages.length ===
          0 &&
        !options.allowProductsWithoutGalleryImages
      ) {
        issues.push(
          createImportIssue(
            "missing-gallery-images",
            `The image folder for "${row.productId}" does not contain gallery images.`,
            "error",
            "Images",
          ),
        );
      }

      if (
        imageFolder &&
        imageFolder.galleryImages.length ===
          0 &&
        options.allowProductsWithoutGalleryImages
      ) {
        issues.push(
          createImportIssue(
            "no-gallery-images",
            "This product has only a cover image. It can still be imported.",
            "warning",
            "Images",
          ),
        );
      }

      imageFolder?.files.forEach(
        (image) => {
          if (
            image.size >
            options.maximumImageSizeBytes
          ) {
            issues.push(
              createImportIssue(
                "image-too-large",
                `${image.fileName} exceeds the maximum permitted image size.`,
                "error",
                "Images",
              ),
            );
          }

          if (
            !options.allowedImageExtensions.includes(
              image.extension,
            )
          ) {
            issues.push(
              createImportIssue(
                "unsupported-image-extension",
                `${image.fileName} uses an unsupported image format.`,
                "error",
                "Images",
              ),
            );
          }
        },
      );

      const status =
        getValidationStatus(issues);

      const validation: CatalogProductValidation =
        {
          productId: row.productId,
          sku: row.sku,
          sheetName: row.sheetName,
          rowNumber: row.rowNumber,

          title: row.title,
          category: row.category,

          status,
          issues,

          workbookRow: row,
          imageFolder,
        };

      if (status !== "invalid") {
        validation.product =
          createMarketplaceProduct(
            row,
            imageFolder,
            importBatchId,
          );
      }

      return validation;
    });

  const extraImageFolders =
    imageArchive.productFolders.filter(
      (folder) =>
        !workbookProductIds.has(
          folder.productId.toUpperCase(),
        ),
    );

  const validProducts = products.filter(
    (product) =>
      product.status === "valid",
  ).length;

  const warningProducts =
    products.filter(
      (product) =>
        product.status === "warning",
    ).length;

  const invalidProducts =
    products.filter(
      (product) =>
        product.status === "invalid",
    ).length;

  const matchedImageFolders =
    products.filter(
      (product) =>
        Boolean(product.imageFolder),
    ).length;

  const missingImageFolders =
    products.length -
    matchedImageFolders;

  const globalIssues: ProductImportIssue[] =
    [];

  if (
    imageArchive.unsupportedFiles > 0
  ) {
    globalIssues.push(
      createImportIssue(
        "unsupported-archive-files",
        `${imageArchive.unsupportedFiles} unsupported file(s) were ignored in the ZIP archive.`,
        "warning",
        "Image archive",
      ),
    );
  }

  if (
    imageArchive.unassignedImages.length >
    0
  ) {
    globalIssues.push(
      createImportIssue(
        "unassigned-images",
        `${imageArchive.unassignedImages.length} image(s) could not be matched to a Product ID folder.`,
        "warning",
        "Image archive",
      ),
    );
  }

  if (extraImageFolders.length > 0) {
    globalIssues.push(
      createImportIssue(
        "extra-image-folders",
        `${extraImageFolders.length} Product ID folder(s) exist in the ZIP but not in the workbook.`,
        "warning",
        "Image archive",
      ),
    );
  }

  return {
    id: importBatchId,
    stage: "ready",

    workbook,
    imageArchive,

    products,

    summary: {
      totalProducts: products.length,
      validProducts,
      warningProducts,
      invalidProducts,

      matchedImageFolders,
      missingImageFolders,
      extraImageFolders:
        extraImageFolders.length,

      duplicateProductIds,
      duplicateSkus,

      unsupportedFiles:
        imageArchive.unsupportedFiles,

      unassignedImages:
        imageArchive.unassignedImages
          .length,
    },

    globalIssues,

    validatedAt:
      new Date().toISOString(),
  };
}

