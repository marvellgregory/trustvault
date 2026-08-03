import type {
  ProductId,
  ProductImageRole,
} from "@/lib/marketplace/product-types";

export type StoredProductImage = {
  id: string;
  productId: ProductId;
  role: ProductImageRole;
  position: number;

  fileName: string;
  archivePath: string;
  mimeType: string;
  size: number;

  blob: Blob;

  createdAt: string;
  updatedAt: string;
  importBatchId?: string;
};

export type SaveProductImageInput = {
  productId: ProductId;
  role: ProductImageRole;
  position: number;

  fileName: string;
  archivePath: string;
  mimeType: string;

  blob: Blob;
  importBatchId?: string;
};

export type ProductImageRepository = {
  save(
    image: SaveProductImageInput,
  ): Promise<StoredProductImage>;

  saveMany(
    images: SaveProductImageInput[],
  ): Promise<StoredProductImage[]>;

  findById(
    imageId: string,
  ): Promise<StoredProductImage | null>;

  findByProductId(
    productId: ProductId,
  ): Promise<StoredProductImage[]>;

  findCoverByProductId(
    productId: ProductId,
  ): Promise<StoredProductImage | null>;

  removeByProductId(
    productId: ProductId,
  ): Promise<void>;

  clear(): Promise<void>;
};

const DATABASE_NAME =
  "trustvault-marketplace-assets";

const DATABASE_VERSION = 1;

const IMAGE_STORE_NAME =
  "product-images";

function createImageId(
  productId: ProductId,
  role: ProductImageRole,
  position: number,
) {
  return `${productId}:${role}:${position}`;
}

function openDatabase() {
  return new Promise<IDBDatabase>(
    (resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(
          new Error(
            "IndexedDB is not available in this browser.",
          ),
        );
        return;
      }

      const request = indexedDB.open(
        DATABASE_NAME,
        DATABASE_VERSION,
      );

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "TrustVault could not open the product image database.",
            ),
        );
      };

      request.onupgradeneeded = () => {
        const database = request.result;

        if (
          !database.objectStoreNames.contains(
            IMAGE_STORE_NAME,
          )
        ) {
          const store =
            database.createObjectStore(
              IMAGE_STORE_NAME,
              {
                keyPath: "id",
              },
            );

          store.createIndex(
            "productId",
            "productId",
            {
              unique: false,
            },
          );

          store.createIndex(
            "productIdRole",
            [
              "productId",
              "role",
            ],
            {
              unique: false,
            },
          );
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    },
  );
}

function waitForTransaction(
  transaction: IDBTransaction,
) {
  return new Promise<void>(
    (resolve, reject) => {
      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error(
              "The product image transaction failed.",
            ),
        );

      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error(
              "The product image transaction was cancelled.",
            ),
        );
    },
  );
}

function requestResult<T>(
  request: IDBRequest<T>,
) {
  return new Promise<T>(
    (resolve, reject) => {
      request.onsuccess = () =>
        resolve(request.result);

      request.onerror = () =>
        reject(
          request.error ??
            new Error(
              "The product image request failed.",
            ),
        );
    },
  );
}

function sortImages(
  first: StoredProductImage,
  second: StoredProductImage,
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

  return first.position - second.position;
}

function createStoredImage(
  input: SaveProductImageInput,
  existing?: StoredProductImage,
): StoredProductImage {
  const now = new Date().toISOString();

  return {
    id: createImageId(
      input.productId,
      input.role,
      input.position,
    ),

    productId: input.productId,
    role: input.role,
    position: input.position,

    fileName: input.fileName,
    archivePath: input.archivePath,
    mimeType: input.mimeType,
    size: input.blob.size,

    blob: input.blob,

    createdAt:
      existing?.createdAt ?? now,

    updatedAt: now,

    importBatchId:
      input.importBatchId ??
      existing?.importBatchId,
  };
}

export const browserProductImageRepository: ProductImageRepository =
  {
    async save(input) {
      const database =
        await openDatabase();

      try {
        const readTransaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readonly",
          );

        const readStore =
          readTransaction.objectStore(
            IMAGE_STORE_NAME,
          );

        const imageId = createImageId(
          input.productId,
          input.role,
          input.position,
        );

        const existing =
          await requestResult(
            readStore.get(imageId),
          ) as
            | StoredProductImage
            | undefined;

        const storedImage =
          createStoredImage(
            input,
            existing,
          );

        const writeTransaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readwrite",
          );

        writeTransaction
          .objectStore(IMAGE_STORE_NAME)
          .put(storedImage);

        await waitForTransaction(
          writeTransaction,
        );

        return storedImage;
      } finally {
        database.close();
      }
    },

    async saveMany(inputs) {
      if (inputs.length === 0) {
        return [];
      }

      const database =
        await openDatabase();

      try {
        const transaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readwrite",
          );

        const store =
          transaction.objectStore(
            IMAGE_STORE_NAME,
          );

        const savedImages =
          inputs.map((input) => {
            const storedImage =
              createStoredImage(input);

            store.put(storedImage);

            return storedImage;
          });

        await waitForTransaction(
          transaction,
        );

        return savedImages;
      } finally {
        database.close();
      }
    },

    async findById(imageId) {
      const database =
        await openDatabase();

      try {
        const transaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readonly",
          );

        const result =
          await requestResult(
            transaction
              .objectStore(
                IMAGE_STORE_NAME,
              )
              .get(imageId),
          );

        return (
          result as
            | StoredProductImage
            | undefined
        ) ?? null;
      } finally {
        database.close();
      }
    },

    async findByProductId(productId) {
      const database =
        await openDatabase();

      try {
        const transaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readonly",
          );

        const store =
          transaction.objectStore(
            IMAGE_STORE_NAME,
          );

        const index =
          store.index("productId");

        const result =
          await requestResult(
            index.getAll(productId),
          );

        return (
          result as StoredProductImage[]
        ).sort(sortImages);
      } finally {
        database.close();
      }
    },

    async findCoverByProductId(
      productId,
    ) {
      const images =
        await this.findByProductId(
          productId,
        );

      return (
        images.find(
          (image) =>
            image.role === "cover",
        ) ??
        images[0] ??
        null
      );
    },

    async removeByProductId(productId) {
      const database =
        await openDatabase();

      try {
        const readTransaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readonly",
          );

        const store =
          readTransaction.objectStore(
            IMAGE_STORE_NAME,
          );

        const index =
          store.index("productId");

        const keys =
          await requestResult(
            index.getAllKeys(productId),
          );

        const writeTransaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readwrite",
          );

        const writeStore =
          writeTransaction.objectStore(
            IMAGE_STORE_NAME,
          );

        keys.forEach((key) => {
          writeStore.delete(key);
        });

        await waitForTransaction(
          writeTransaction,
        );
      } finally {
        database.close();
      }
    },

    async clear() {
      const database =
        await openDatabase();

      try {
        const transaction =
          database.transaction(
            IMAGE_STORE_NAME,
            "readwrite",
          );

        transaction
          .objectStore(IMAGE_STORE_NAME)
          .clear();

        await waitForTransaction(
          transaction,
        );
      } finally {
        database.close();
      }
    },
  };

export function createProductImageObjectUrl(
  image: StoredProductImage,
) {
  return URL.createObjectURL(image.blob);
}

export function revokeProductImageObjectUrl(
  url: string,
) {
  URL.revokeObjectURL(url);
}
