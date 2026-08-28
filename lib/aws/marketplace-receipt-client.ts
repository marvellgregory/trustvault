import type {
  TransactionReceiptData,
} from "@/components/receipts/receipt-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL?.replace(
    /\/+$/,
    "",
  );

export type MarketplaceReceiptPersistenceResult =
  | {
      ok: true;
      receipt: TransactionReceiptData;
    }
  | {
      ok: false;
      status: number | null;
      code: string;
      message: string;
    };

export type MarketplaceReceiptCollectionResult =
  | {
      ok: true;
      receipts: TransactionReceiptData[];
    }
  | {
      ok: false;
      status: number | null;
      code: string;
      message: string;
    };

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL is not configured.",
    );
  }

  return API_BASE_URL;
}

function isMarketplaceReceipt(
  value: unknown,
): value is TransactionReceiptData {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<TransactionReceiptData>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.status === "string"
  );
}

function receiptPath(
  receiptId: string,
) {
  return `${requireApiBaseUrl()}/marketplace/receipts/${encodeURIComponent(
    receiptId,
  )}`;
}

function collectionPath() {
  return `${requireApiBaseUrl()}/marketplace/receipts`;
}

async function readJson(
  response: Response,
): Promise<unknown> {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readApiError(
  body: unknown,
  status: number,
): MarketplaceReceiptPersistenceResult {
  if (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body)
  ) {
    const candidate =
      body as {
        error?: {
          code?: unknown;
          message?: unknown;
        };
      };

    if (
      typeof candidate.error?.code === "string" &&
      typeof candidate.error?.message === "string"
    ) {
      return {
        ok: false,
        status,
        code: candidate.error.code,
        message: candidate.error.message,
      };
    }
  }

  return {
    ok: false,
    status,
    code: "MARKETPLACE_RECEIPT_REQUEST_FAILED",
    message:
      "TrustVault could not complete the Marketplace receipt request.",
  };
}

function readReceiptResponse(
  body: unknown,
): TransactionReceiptData | null {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return null;
  }

  const candidate =
    body as {
      receipt?: unknown;
    };

  return isMarketplaceReceipt(
    candidate.receipt,
  )
    ? candidate.receipt
    : null;
}

function readReceiptCollectionResponse(
  body: unknown,
): TransactionReceiptData[] | null {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return null;
  }

  const candidate =
    body as {
      receipts?: unknown;
    };

  if (!Array.isArray(candidate.receipts)) {
    return null;
  }

  if (
    !candidate.receipts.every(
      (receipt) =>
        isMarketplaceReceipt(receipt),
    )
  ) {
    return null;
  }

  return candidate.receipts;
}

export async function persistMarketplaceReceipt(
  receipt: TransactionReceiptData,
): Promise<MarketplaceReceiptPersistenceResult> {
  try {
    const response =
      await fetch(
        receiptPath(receipt.id),
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(receipt),
        },
      );

    const body =
      await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const persistedReceipt =
      readReceiptResponse(body);

    if (!persistedReceipt) {
      return {
        ok: false,
        status: response.status,
        code:
          "INVALID_MARKETPLACE_RECEIPT_RESPONSE",
        message:
          "TrustVault received an invalid Marketplace receipt response.",
      };
    }

    if (
      persistedReceipt.id !== receipt.id
    ) {
      return {
        ok: false,
        status: response.status,
        code:
          "MARKETPLACE_RECEIPT_ID_MISMATCH",
        message:
          "The persisted Marketplace receipt did not match the requested receipt.",
      };
    }

    return {
      ok: true,
      receipt: persistedReceipt,
    };
  } catch {
    return {
      ok: false,
      status: null,
      code:
        "MARKETPLACE_RECEIPT_NETWORK_ERROR",
      message:
        "TrustVault could not reach the Marketplace receipt service.",
    };
  }
}

export async function fetchMarketplaceReceipt(
  receiptId: string,
): Promise<MarketplaceReceiptPersistenceResult> {
  try {
    const response =
      await fetch(
        receiptPath(receiptId),
        {
          method: "GET",
          credentials: "include",
          headers: {
            accept: "application/json",
          },
        },
      );

    const body =
      await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const receipt =
      readReceiptResponse(body);

    if (!receipt) {
      return {
        ok: false,
        status: response.status,
        code:
          "INVALID_MARKETPLACE_RECEIPT_RESPONSE",
        message:
          "TrustVault received an invalid Marketplace receipt response.",
      };
    }

    if (receipt.id !== receiptId) {
      return {
        ok: false,
        status: response.status,
        code:
          "MARKETPLACE_RECEIPT_ID_MISMATCH",
        message:
          "The Marketplace receipt response did not match the requested receipt.",
      };
    }

    return {
      ok: true,
      receipt,
    };
  } catch {
    return {
      ok: false,
      status: null,
      code:
        "MARKETPLACE_RECEIPT_NETWORK_ERROR",
      message:
        "TrustVault could not reach the Marketplace receipt service.",
    };
  }
}

export async function fetchMarketplaceReceipts(): Promise<MarketplaceReceiptCollectionResult> {
  try {
    const response =
      await fetch(
        collectionPath(),
        {
          method: "GET",
          credentials: "include",
          headers: {
            accept: "application/json",
          },
        },
      );

    const body =
      await readJson(response);

    if (!response.ok) {
      const failure =
        readApiError(
          body,
          response.status,
        );

      if (failure.ok) {
        return {
          ok: false,
          status: response.status,
          code:
            "MARKETPLACE_RECEIPT_COLLECTION_REQUEST_FAILED",
          message:
            "TrustVault could not load the Marketplace receipt collection.",
        };
      }

      return failure;
    }

    const receipts =
      readReceiptCollectionResponse(
        body,
      );

    if (!receipts) {
      return {
        ok: false,
        status: response.status,
        code:
          "INVALID_MARKETPLACE_RECEIPT_COLLECTION_RESPONSE",
        message:
          "TrustVault received an invalid Marketplace receipt collection response.",
      };
    }

    return {
      ok: true,
      receipts,
    };
  } catch {
    return {
      ok: false,
      status: null,
      code:
        "MARKETPLACE_RECEIPT_NETWORK_ERROR",
      message:
        "TrustVault could not reach the Marketplace receipt service.",
    };
  }
}

