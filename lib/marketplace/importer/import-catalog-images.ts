import JSZip from "jszip";

import type {
  CatalogValidationResult,
} from "@/lib/marketplace/importer/catalog-import-types";
import type {
  SaveProductImageInput,
  StoredProductImage,
} from "@/lib/marketplace/repository/product-image-repository";
import {
  browserProductImageRepository,
} from "@/lib/marketplace/repository/product-image-repository";

type ImportCatalogImagesInput = {
  imageArchiveFile: File;
  validationResult: CatalogValidationResult;
  replaceExistingImages?: boolean;
};

export type CatalogImageImportReport = {
  importedImages: number;
  importedProducts: number;
  skippedProducts: number;
  missingArchiveEntries: string[];
  importedAt: string;
};

function getMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "webp":
      return "image/webp";

    default:
      return "application/octet-stream";
  }
}

function normalizeArchivePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

export async function importCatalogImages({
  imageArchiveFile,
  validationResult,
  replaceExistingImages = false,
}: ImportCatalogImagesInput): Promise<CatalogImageImportReport> {
  if (
    !imageArchiveFile.name
      .toLowerCase()
      .endsWith(".zip")
  ) {
    throw new Error(
      "The selected product image file is not a ZIP archive.",
    );
  }

  let archive: JSZip;

  try {
    archive = await JSZip.loadAsync(
      await imageArchiveFile.arrayBuffer(),
    );
  } catch {
    throw new Error(
      "TrustVault could not reopen the product image ZIP.",
    );
  }

  if (replaceExistingImages) {
    await browserProductImageRepository.clear();
  }

  const imagesToSave: SaveProductImageInput[] = [];
  const missingArchiveEntries: string[] = [];
  const importedProductIds = new Set<string>();
  let skippedProducts = 0;

  for (const validation of validationResult.products) {
    if (
      validation.status === "invalid" ||
      !validation.product ||
      !validation.imageFolder
    ) {
      skippedProducts += 1;
      continue;
    }

    const orderedImages = [
      ...(validation.imageFolder.coverImage
        ? [validation.imageFolder.coverImage]
        : []),
      ...validation.imageFolder.galleryImages,
    ];

    if (orderedImages.length === 0) {
      skippedProducts += 1;
      continue;
    }

    for (const image of orderedImages) {
      const normalizedPath = normalizeArchivePath(
        image.archivePath,
      );

      const archiveEntry =
        archive.file(normalizedPath);

      if (!archiveEntry) {
        missingArchiveEntries.push(
          normalizedPath,
        );
        continue;
      }

      const blob = await archiveEntry.async(
        "blob",
      );

      const role =
        image ===
        validation.imageFolder.coverImage
          ? "cover"
          : "gallery";

      const position =
        role === "cover"
          ? 0
          : image.position ?? 1;

      imagesToSave.push({
        productId: validation.productId,
        role,
        position,

        fileName: image.fileName,
        archivePath: normalizedPath,
        mimeType: getMimeType(
          image.extension,
        ),

        blob: new Blob(
          [blob],
          {
            type: getMimeType(
              image.extension,
            ),
          },
        ),

        importBatchId:
          validationResult.id,
      });

      importedProductIds.add(
        validation.productId,
      );
    }
  }

  let savedImages: StoredProductImage[] = [];

  if (imagesToSave.length > 0) {
    savedImages =
      await browserProductImageRepository.saveMany(
        imagesToSave,
      );
  }

  return {
    importedImages: savedImages.length,
    importedProducts:
      importedProductIds.size,
    skippedProducts,
    missingArchiveEntries,
    importedAt:
      new Date().toISOString(),
  };
}
