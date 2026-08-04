const fs = require("node:fs");
const path = require("node:path");

const XLSX = require("xlsx");
const JSZip = require("jszip");

const workbookPath =
  "C:\\Users\\marve\\Downloads\\ALL IN ONE\\Arc\\TrustVault\\products\\TrustVault_Catalog_Image_Matched.xlsx";

const zipPath =
  "C:\\Users\\marve\\Downloads\\ALL IN ONE\\Arc\\TrustVault\\products\\Products.zip";

const projectRoot = process.cwd();

const publicMarketplaceRoot = path.join(
  projectRoot,
  "public",
  "marketplace",
);

const publicProductsRoot = path.join(
  publicMarketplaceRoot,
  "products",
);

const catalogOutputPath = path.join(
  publicMarketplaceRoot,
  "catalog.json",
);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);

  if (
    !normalized ||
    normalized.toLowerCase() === "na" ||
    normalized.toLowerCase() === "n/a"
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePrice(value) {
  const numeric = Number(
    normalizeText(value).replace(/,/g, ""),
  );

  if (!Number.isFinite(numeric) || numeric < 0) {
    return "0";
  }

  return numeric
    .toFixed(6)
    .replace(/\.?0+$/, "");
}

function normalizeQuantity(value) {
  const numeric = Number.parseInt(
    normalizeText(value),
    10,
  );

  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

function normalizeStatus(value, quantity) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  if (quantity === 0) {
    return "out-of-stock";
  }

  if (
    quantity !== null &&
    quantity > 0
  ) {
    return "active";
  }

  if (normalized.includes("inactive")) {
    return "inactive";
  }

  if (normalized.includes("draft")) {
    return "draft";
  }

  if (normalized.includes("archived")) {
    return "archived";
  }

  if (
    normalized.includes("out-of-stock") ||
    normalized.includes("out-of")
  ) {
    return "out-of-stock";
  }

  return "active";
}

function parseList(value) {
  return normalizeText(value)
    .split(/[,;|]/)
    .map((entry) => entry.trim())
    .filter(
      (entry) =>
        entry &&
        entry.toLowerCase() !== "na" &&
        entry.toLowerCase() !== "n/a",
    );
}

function isTruthy(value) {
  return ["yes", "true", "1", "featured"].includes(
    normalizeText(value).toLowerCase(),
  );
}

function findProductIdInArchivePath(archivePath) {
  return (
    archivePath
      .split("/")
      .find((part) =>
        /^TV-[A-Z0-9]+-\d{6}$/i.test(part),
      )
      ?.toUpperCase() ?? null
  );
}

function isSupportedImage(fileName) {
  return /\.(png|jpe?g|webp)$/i.test(fileName);
}

function isCoverFile(fileName) {
  return /^cover(\.webp)+$/i.test(fileName);
}

function extensionFromFileName(fileName) {
  const extension = path
    .extname(fileName)
    .toLowerCase();

  if (extension === ".jpeg") {
    return ".jpg";
  }

  if (
    extension === ".png" ||
    extension === ".jpg" ||
    extension === ".webp"
  ) {
    return extension;
  }

  return ".webp";
}

function sortGalleryEntries(first, second) {
  const firstName = path.basename(first.name);
  const secondName = path.basename(second.name);

  const firstNumber = Number.parseInt(
    firstName.match(/\d+/)?.[0] ?? "9999",
    10,
  );

  const secondNumber = Number.parseInt(
    secondName.match(/\d+/)?.[0] ?? "9999",
    10,
  );

  if (firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }

  return firstName.localeCompare(secondName);
}

function createImageRecord({
  productId,
  src,
  role,
  position,
  title,
}) {
  return {
    id: `${productId}-image-${position}`,
    productId,
    role,
    src,
    alt:
      role === "cover"
        ? `${title} product image`
        : `${title} gallery image ${position}`,
    position,
  };
}

async function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(
      `Workbook was not found: ${workbookPath}`,
    );
  }

  if (!fs.existsSync(zipPath)) {
    throw new Error(
      `Product archive was not found: ${zipPath}`,
    );
  }

  console.log(
    "\n===== TRUSTVAULT PUBLIC CATALOG BUILD =====",
  );

  fs.rmSync(publicProductsRoot, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(publicProductsRoot, {
    recursive: true,
  });

  const workbook = XLSX.readFile(workbookPath);

  const workbookRowsByProductId = new Map();
  const duplicateWorkbookRows = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      {
        defval: "",
        raw: false,
      },
    );

    for (const row of sheetRows) {
      const productId = normalizeText(
        row["Product ID"],
      ).toUpperCase();

      if (
        !/^TV-[A-Z0-9]+-\d{6}$/.test(productId)
      ) {
        continue;
      }

      const candidate = {
        sheetName,
        row,
        productId,
      };

      if (
        workbookRowsByProductId.has(productId)
      ) {
        duplicateWorkbookRows.push(candidate);
        continue;
      }

      workbookRowsByProductId.set(
        productId,
        candidate,
      );
    }
  }

  const workbookRows = [
    ...workbookRowsByProductId.values(),
  ];

  if (workbookRows.length !== 44) {
    throw new Error(
      `Expected 44 unique workbook products but found ${workbookRows.length}.`,
    );
  }

  console.log(
    `Duplicate workbook rows ignored: ${duplicateWorkbookRows.length}`,
  );

  const zipBuffer = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(zipBuffer);

  const archiveImagesByProduct = new Map();

  for (const entry of Object.values(zip.files)) {
    if (
      entry.dir ||
      !isSupportedImage(entry.name)
    ) {
      continue;
    }

    const productId =
      findProductIdInArchivePath(entry.name);

    if (!productId) {
      continue;
    }

    const existing =
      archiveImagesByProduct.get(productId) ?? [];

    existing.push(entry);

    archiveImagesByProduct.set(
      productId,
      existing,
    );
  }

  const workbookIds = new Set(
    workbookRows.map(({ productId }) => productId),
  );

  const archiveIds = new Set(
    archiveImagesByProduct.keys(),
  );

  const missingImageFolders = [
    ...workbookIds,
  ].filter(
    (productId) => !archiveIds.has(productId),
  );

  const extraImageFolders = [
    ...archiveIds,
  ].filter(
    (productId) => !workbookIds.has(productId),
  );

  if (missingImageFolders.length > 0) {
    throw new Error(
      `Workbook products missing image folders: ${missingImageFolders.join(
        ", ",
      )}`,
    );
  }

  if (extraImageFolders.length > 0) {
    throw new Error(
      `ZIP folders missing workbook rows: ${extraImageFolders.join(
        ", ",
      )}`,
    );
  }

  const generatedAt = new Date().toISOString();

  const products = [];

  let exportedImageCount = 0;

  for (const {
    sheetName,
    row,
    productId,
  } of workbookRows) {
    const title =
      normalizeText(row["Product Name"]) ||
      normalizeText(row["SEO Title"]) ||
      productId;

    const sku =
      normalizeText(row["SKU"]) ||
      productId;

    const category =
      normalizeText(row["Category"]) ||
      "Marketplace";

    const subcategory =
      normalizeOptionalText(
        row["Sub Category"],
      );

    const description =
      normalizeText(row["Description"]) ||
      `${title} available through the TrustVault Marketplace.`;

    const shortDescription =
      normalizeText(
        row["SEO Description"],
      ) || description;

    const priceAmount = normalizePrice(
      row["Price USDC"],
    );

    const quantity = normalizeQuantity(
      row["Stock"],
    );

    const status = normalizeStatus(
      row["Status"],
      quantity,
    );

    const productFolder = path.join(
      publicProductsRoot,
      productId,
    );

    fs.mkdirSync(productFolder, {
      recursive: true,
    });

    const archiveEntries =
      archiveImagesByProduct.get(productId) ?? [];

    const coverEntry =
      archiveEntries.find((entry) =>
        isCoverFile(path.basename(entry.name)),
      ) ?? archiveEntries[0];

    if (!coverEntry) {
      throw new Error(
        `Product ${productId} has no usable images.`,
      );
    }

    const galleryEntries = archiveEntries
      .filter((entry) => entry !== coverEntry)
      .sort(sortGalleryEntries);

    const coverExtension =
      extensionFromFileName(
        path.basename(coverEntry.name),
      );

    const coverFileName =
      `cover${coverExtension}`;

    const coverOutputPath = path.join(
      productFolder,
      coverFileName,
    );

    const coverBuffer =
      await coverEntry.async("nodebuffer");

    fs.writeFileSync(
      coverOutputPath,
      coverBuffer,
    );

    exportedImageCount += 1;

    const imageRecords = [
      createImageRecord({
        productId,
        src: `/marketplace/products/${productId}/${coverFileName}`,
        role: "cover",
        position: 0,
        title,
      }),
    ];

    for (
      let index = 0;
      index < galleryEntries.length;
      index += 1
    ) {
      const galleryEntry =
        galleryEntries[index];

      const galleryExtension =
        extensionFromFileName(
          path.basename(galleryEntry.name),
        );

      const galleryFileName =
        `gallery-${String(index + 1).padStart(
          2,
          "0",
        )}${galleryExtension}`;

      const galleryOutputPath = path.join(
        productFolder,
        galleryFileName,
      );

      const galleryBuffer =
        await galleryEntry.async("nodebuffer");

      fs.writeFileSync(
        galleryOutputPath,
        galleryBuffer,
      );

      exportedImageCount += 1;

      imageRecords.push(
        createImageRecord({
          productId,
          src: `/marketplace/products/${productId}/${galleryFileName}`,
          role: "gallery",
          position: index + 1,
          title,
        }),
      );
    }

    const tags = [
      ...parseList(row["Search Keywords"]),
      ...parseList(row["AI Metadata"]),
      category,
      subcategory,
      normalizeOptionalText(row["Brand"]),
    ].filter(Boolean);

    const uniqueTags = [
      ...new Set(
        tags.map((tag) =>
          String(tag).trim(),
        ),
      ),
    ];

    const sizes = parseList(row["Sizes"]);
    const colors = parseList(row["Colors"]);

    const specifications = {};

    const weight =
      normalizeOptionalText(row["Weight"]);

    const deliveryEstimate =
      normalizeOptionalText(
        row["Delivery Estimate"],
      );

    const warranty =
      normalizeOptionalText(row["Warranty"]);

    if (weight) {
      specifications.Weight = weight;
    }

    if (deliveryEstimate) {
      specifications["Delivery estimate"] =
        deliveryEstimate;
    }

    if (warranty) {
      specifications.Warranty = warranty;
    }

    const product = {
      id: productId,
      sku,

      title,
      slug:
        normalizeSlug(`${title}-${productId}`) ||
        productId.toLowerCase(),

      description,
      shortDescription,

      category,
      subcategory,

      tags: uniqueTags,

      // The source workbook contains inconsistent product-type
      // labels, so the public commerce catalog safely treats
      // imported retail items as physical products.
      productType: "physical",

      status,

      price: {
        amount: priceAmount,
        currency: "USDC",
      },

      images: imageRecords,
      coverImage: imageRecords[0],

      inventory: {
        tracked: true,
        quantity,
        policy: "deny",
      },

      dimensions: weight
        ? {
            weight,
          }
        : undefined,

      sizes:
        sizes.length > 0
          ? sizes
          : undefined,

      colors:
        colors.length > 0
          ? colors
          : undefined,

      specifications:
        Object.keys(specifications).length > 0
          ? specifications
          : undefined,

      seller: {
        id: "trustvault-marketplace",
        displayName: "TrustVault Marketplace",
        storeName: "TrustVault Marketplace",
        verified: false,
      },

      brand:
        normalizeOptionalText(row["Brand"]),

      // Vendor and seller values are intentionally excluded
      // because the current workbook contains mismatched data.

      featured: isTruthy(row["Featured"]),

      giftEligible: true,
      escrowEligible: true,

      createdAt: generatedAt,
      updatedAt: generatedAt,

      source: {
        workbookSheet: sheetName,
        imageFolder:
          normalizeOptionalText(
            row["Image Folder"],
          ) ??
          `Products/${category}/${subcategory ?? ""}/${productId}`,

        importBatchId:
          `public-catalog-${generatedAt.slice(
            0,
            10,
          )}`,
      },
    };

    products.push(product);
  }

  products.sort((first, second) => {
    if (
      first.featured !== second.featured
    ) {
      return first.featured ? -1 : 1;
    }

    return first.title.localeCompare(
      second.title,
    );
  });

  const catalog = {
    version: 1,
    generatedAt,
    source: {
      workbook:
        path.basename(workbookPath),
      imageArchive:
        path.basename(zipPath),
    },
    productCount: products.length,
    products,
  };

  fs.mkdirSync(publicMarketplaceRoot, {
    recursive: true,
  });

  fs.writeFileSync(
    catalogOutputPath,
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Workbook products: ${workbookRows.length}`,
  );

  console.log(
    `ZIP product folders: ${archiveImagesByProduct.size}`,
  );

  console.log(
    `Public products generated: ${products.length}`,
  );

  console.log(
    `Public images exported: ${exportedImageCount}`,
  );

  console.log(
    `Catalog written to: ${catalogOutputPath}`,
  );

  console.log(
    `Images written to: ${publicProductsRoot}`,
  );

  console.log(
    "\nPublic Marketplace catalog build completed successfully.",
  );
}

main().catch((error) => {
  console.error(
    "\nPublic Marketplace catalog build failed.",
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});


