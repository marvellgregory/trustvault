import JSZip from "jszip";

import type { ProductId } from "@/lib/marketplace/product-types";
import type {
  CatalogImageArchiveData,
  CatalogImageFile,
  CatalogProductImageFolder,
} from "@/lib/marketplace/importer/catalog-import-types";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const PRODUCT_ID_PATTERN =
  /^TV-[A-Z0-9]+-\d{6}$/i;

function normalizeArchivePath(path: string) {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function getFileName(path: string) {
  const segments = normalizeArchivePath(path)
    .split("/")
    .filter(Boolean);

  return segments.at(-1) ?? "";
}

function getExtension(fileName: string) {
  return fileName
    .split(".")
    .pop()
    ?.trim()
    .toLowerCase() ?? "";
}

function getBaseName(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");

  return (
    lastDot === -1
      ? fileName
      : fileName.slice(0, lastDot)
  )
    .trim()
    .toLowerCase();
}

function findProductId(path: string) {
  const segments = normalizeArchivePath(path)
    .split("/")
    .filter(Boolean);

  const matchingSegment = segments.find((segment) =>
    PRODUCT_ID_PATTERN.test(segment),
  );

  return matchingSegment?.toUpperCase();
}

function getProductFolderPath(
  path: string,
  productId: string,
) {
  const segments = normalizeArchivePath(path)
    .split("/")
    .filter(Boolean);

  const productIndex = segments.findIndex(
    (segment) =>
      segment.toUpperCase() === productId,
  );

  if (productIndex === -1) {
    return "";
  }

  return segments
    .slice(0, productIndex + 1)
    .join("/");
}

function detectImageRole(fileName: string): {
  role: CatalogImageFile["role"];
  position?: number;
} {
  const baseName = getBaseName(fileName);

  if (
    baseName === "cover" ||
    baseName === "main" ||
    baseName === "main-image" ||
    baseName.startsWith("cover-")
  ) {
    return {
      role: "cover",
      position: 0,
    };
  }

  const galleryMatch = baseName.match(
    /^(?:gallery[-_ ]?)?(\d+)$/,
  );

  if (galleryMatch) {
    return {
      role: "gallery",
      position: Number(galleryMatch[1]),
    };
  }

  const numberedImageMatch = baseName.match(
    /^(?:image|img)[-_ ]?(\d+)$/,
  );

  if (numberedImageMatch) {
    return {
      role: "gallery",
      position: Number(numberedImageMatch[1]),
    };
  }

  return {
    role: "unknown",
  };
}

function sortImages(
  first: CatalogImageFile,
  second: CatalogImageFile,
) {
  if (
    first.role === "cover" &&
    second.role !== "cover"
  ) {
    return -1;
  }

  if (
    second.role === "cover" &&
    first.role !== "cover"
  ) {
    return 1;
  }

  const firstPosition =
    first.position ?? Number.MAX_SAFE_INTEGER;

  const secondPosition =
    second.position ?? Number.MAX_SAFE_INTEGER;

  if (firstPosition !== secondPosition) {
    return firstPosition - secondPosition;
  }

  return first.fileName.localeCompare(
    second.fileName,
  );
}

export async function readCatalogImageArchive(
  file: File,
): Promise<CatalogImageArchiveData> {
  const extension = getExtension(file.name);

  if (extension !== "zip") {
    throw new Error(
      "Upload a ZIP archive containing the product image folders.",
    );
  }

  if (file.size === 0) {
    throw new Error("The image archive is empty.");
  }

  let archive: JSZip;

  try {
    archive = await JSZip.loadAsync(
      await file.arrayBuffer(),
    );
  } catch {
    throw new Error(
      "TrustVault could not read the ZIP archive. Confirm that it is a valid, non-encrypted ZIP file.",
    );
  }

  const productFolderMap = new Map<
    ProductId,
    CatalogProductImageFolder
  >();

  const unassignedImages: CatalogImageFile[] = [];

  let totalFiles = 0;
  let supportedImageFiles = 0;
  let unsupportedFiles = 0;

  const archiveEntries = Object.values(
    archive.files,
  ).filter((entry) => !entry.dir);

  for (const entry of archiveEntries) {
    totalFiles += 1;

    const archivePath = normalizeArchivePath(
      entry.name,
    );

    const fileName = getFileName(archivePath);
    const imageExtension = getExtension(fileName);

    if (
      !SUPPORTED_IMAGE_EXTENSIONS.has(
        imageExtension,
      )
    ) {
      unsupportedFiles += 1;
      continue;
    }

    supportedImageFiles += 1;

    const fileBytes = await entry.async(
      "uint8array",
    );

    const productId = findProductId(
      archivePath,
    );

    const detectedRole = detectImageRole(
      fileName,
    );

    const imageFile: CatalogImageFile = {
      archivePath,
      fileName,
      extension: imageExtension,
      productId,
      role: detectedRole.role,
      position: detectedRole.position,
      size: fileBytes.byteLength,
    };

    if (!productId) {
      unassignedImages.push(imageFile);
      continue;
    }

    const folderPath = getProductFolderPath(
      archivePath,
      productId,
    );

    const existingFolder =
      productFolderMap.get(productId);

    if (existingFolder) {
      existingFolder.files.push(imageFile);
      continue;
    }

    productFolderMap.set(productId, {
      productId,
      folderPath,
      files: [imageFile],
      galleryImages: [],
    });
  }

  const productFolders = Array.from(
    productFolderMap.values(),
  )
    .map((folder) => {
      const sortedFiles = [...folder.files].sort(
        sortImages,
      );

      const coverImage = sortedFiles.find(
        (image) => image.role === "cover",
      );

      const galleryImages = sortedFiles
        .filter(
          (image) =>
            image !== coverImage &&
            image.role !== "cover",
        )
        .map((image, index) => ({
          ...image,
          role:
            image.role === "unknown"
              ? ("gallery" as const)
              : image.role,
          position:
            image.position ?? index + 1,
        }));

      return {
        ...folder,
        files: sortedFiles,
        coverImage,
        galleryImages,
      };
    })
    .sort((first, second) =>
      first.productId.localeCompare(
        second.productId,
      ),
    );

  return {
    fileName: file.name,
    totalFiles,
    supportedImageFiles,
    unsupportedFiles,
    productFolders,
    unassignedImages,
  };
}
