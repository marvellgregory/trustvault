import type {
  MarketplaceProduct,
  ProductId,
} from "@/lib/marketplace/product-types";

export type StoredMarketplaceProduct = {
  product: MarketplaceProduct;
  createdAt: string;
  updatedAt: string;
  importedAt?: string;
  importBatchId?: string;
};

export type ProductRepositoryFilters = {
  status?: MarketplaceProduct["status"];
  category?: string;
  sellerId?: string;
  featured?: boolean;
  giftEligible?: boolean;
  escrowEligible?: boolean;
  search?: string;
};

export type ProductRepository = {
  save(
    product: MarketplaceProduct,
  ): Promise<StoredMarketplaceProduct>;

  saveMany(
    products: MarketplaceProduct[],
  ): Promise<StoredMarketplaceProduct[]>;

  findById(
    productId: ProductId,
  ): Promise<StoredMarketplaceProduct | null>;

  findBySlug(
    slug: string,
  ): Promise<StoredMarketplaceProduct | null>;

  findAll(
    filters?: ProductRepositoryFilters,
  ): Promise<StoredMarketplaceProduct[]>;

  count(
    filters?: ProductRepositoryFilters,
  ): Promise<number>;

  remove(productId: ProductId): Promise<void>;

  clear(): Promise<void>;
};

const STORAGE_KEY =
  "trustvault.marketplace.products.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase();
}

function readStoredProducts(): Record<
  ProductId,
  StoredMarketplaceProduct
> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const storedValue =
      window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return parsedValue as Record<
      ProductId,
      StoredMarketplaceProduct
    >;
  } catch {
    return {};
  }
}

function writeStoredProducts(
  products: Record<
    ProductId,
    StoredMarketplaceProduct
  >,
) {
  if (!isBrowser()) {
    throw new Error(
      "Marketplace product storage is unavailable during server rendering.",
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(products),
  );
}

function matchesFilters(
  storedProduct: StoredMarketplaceProduct,
  filters?: ProductRepositoryFilters,
) {
  if (!filters) {
    return true;
  }

  const { product } = storedProduct;

  if (
    filters.status &&
    product.status !== filters.status
  ) {
    return false;
  }

  if (
    filters.category &&
    product.category.toLocaleLowerCase() !==
      filters.category.toLocaleLowerCase()
  ) {
    return false;
  }

  if (
    filters.sellerId &&
    product.seller.id !== filters.sellerId
  ) {
    return false;
  }

  if (
    filters.featured !== undefined &&
    product.featured !== filters.featured
  ) {
    return false;
  }

  if (
    filters.giftEligible !== undefined &&
    product.giftEligible !==
      filters.giftEligible
  ) {
    return false;
  }

  if (
    filters.escrowEligible !== undefined &&
    product.escrowEligible !==
      filters.escrowEligible
  ) {
    return false;
  }

  const search =
    filters.search &&
    normalizeSearchValue(filters.search);

  if (search) {
    const searchableText = [
      product.id,
      product.sku,
      product.title,
      product.description,
      product.shortDescription,
      product.category,
      product.subcategory,
      product.brand,
      product.vendor,
      product.seller.displayName,
      product.seller.storeName,
      ...product.tags,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string",
      )
      .join(" ")
      .toLocaleLowerCase();

    if (!searchableText.includes(search)) {
      return false;
    }
  }

  return true;
}

function sortProducts(
  first: StoredMarketplaceProduct,
  second: StoredMarketplaceProduct,
) {
  const firstTime = new Date(
    first.updatedAt,
  ).getTime();

  const secondTime = new Date(
    second.updatedAt,
  ).getTime();

  return secondTime - firstTime;
}

function createStoredProduct(
  product: MarketplaceProduct,
  existing?: StoredMarketplaceProduct,
): StoredMarketplaceProduct {
  const now = new Date().toISOString();

  return {
    product: {
      ...product,
      updatedAt: now,
      createdAt:
        existing?.product.createdAt ??
        product.createdAt ??
        now,
    },

    createdAt:
      existing?.createdAt ??
      product.createdAt ??
      now,

    updatedAt: now,

    importedAt:
      existing?.importedAt ??
      (product.source?.importBatchId
        ? now
        : undefined),

    importBatchId:
      product.source?.importBatchId ??
      existing?.importBatchId,
  };
}

export const browserProductRepository: ProductRepository =
  {
    async save(product) {
      const products = readStoredProducts();

      const storedProduct =
        createStoredProduct(
          product,
          products[product.id],
        );

      products[product.id] = storedProduct;
      writeStoredProducts(products);

      return storedProduct;
    },

    async saveMany(productsToSave) {
      const products = readStoredProducts();
      const savedProducts: StoredMarketplaceProduct[] =
        [];

      for (const product of productsToSave) {
        const storedProduct =
          createStoredProduct(
            product,
            products[product.id],
          );

        products[product.id] = storedProduct;
        savedProducts.push(storedProduct);
      }

      writeStoredProducts(products);

      return savedProducts;
    },

    async findById(productId) {
      const products = readStoredProducts();

      return products[productId] ?? null;
    },

    async findBySlug(slug) {
      const products =
        Object.values(readStoredProducts());

      return (
        products.find(
          ({ product }) =>
            product.slug === slug,
        ) ?? null
      );
    },

    async findAll(filters) {
      return Object.values(
        readStoredProducts(),
      )
        .filter((product) =>
          matchesFilters(product, filters),
        )
        .sort(sortProducts);
    },

    async count(filters) {
      const products =
        await this.findAll(filters);

      return products.length;
    },

    async remove(productId) {
      const products = readStoredProducts();

      delete products[productId];
      writeStoredProducts(products);
    },

    async clear() {
      if (!isBrowser()) {
        throw new Error(
          "Marketplace product storage is unavailable during server rendering.",
        );
      }

      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    },
  };

export function getProductRepositoryStorageKey() {
  return STORAGE_KEY;
}
