import type {
  MarketplaceOrder,
  OrderId,
} from "@/lib/marketplace/order-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL?.replace(
    /\/+$/,
    "",
  );

export type MarketplaceOrderPersistenceResult =
  | {
      ok: true;
      order: MarketplaceOrder;
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

function isMarketplaceOrder(
  value: unknown,
): value is MarketplaceOrder {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const candidate =
    value as Partial<MarketplaceOrder>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.orderNumber === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.buyer === "object" &&
    candidate.buyer !== null &&
    Array.isArray(candidate.items) &&
    Array.isArray(candidate.timeline) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function orderPath(
  orderId: OrderId,
) {
  return `${requireApiBaseUrl()}/marketplace/orders/${encodeURIComponent(
    orderId,
  )}`;
}

async function readJson(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

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
): MarketplaceOrderPersistenceResult {
  if (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body)
  ) {
    const candidate = body as {
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
    code: "MARKETPLACE_ORDER_REQUEST_FAILED",
    message:
      "TrustVault could not complete the Marketplace order request.",
  };
}

function readOrderResponse(
  body: unknown,
): MarketplaceOrder | null {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return null;
  }

  const candidate = body as {
    order?: unknown;
  };

  return isMarketplaceOrder(candidate.order)
    ? candidate.order
    : null;
}

export async function persistMarketplaceOrder(
  order: MarketplaceOrder,
): Promise<MarketplaceOrderPersistenceResult> {
  try {
    const response = await fetch(
      orderPath(order.id),
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(order),
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const persistedOrder =
      readOrderResponse(body);

    if (!persistedOrder) {
      return {
        ok: false,
        status: response.status,
        code: "INVALID_MARKETPLACE_ORDER_RESPONSE",
        message:
          "TrustVault received an invalid Marketplace order response.",
      };
    }

    if (persistedOrder.id !== order.id) {
      return {
        ok: false,
        status: response.status,
        code: "MARKETPLACE_ORDER_ID_MISMATCH",
        message:
          "The persisted Marketplace order did not match the requested order.",
      };
    }

    return {
      ok: true,
      order: persistedOrder,
    };
  } catch {
    return {
      ok: false,
      status: null,
      code: "MARKETPLACE_ORDER_NETWORK_ERROR",
      message:
        "TrustVault could not reach the Marketplace order service.",
    };
  }
}

export async function fetchMarketplaceOrder(
  orderId: OrderId,
): Promise<MarketplaceOrderPersistenceResult> {
  try {
    const response = await fetch(
      orderPath(orderId),
      {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json",
        },
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const order =
      readOrderResponse(body);

    if (!order) {
      return {
        ok: false,
        status: response.status,
        code: "INVALID_MARKETPLACE_ORDER_RESPONSE",
        message:
          "TrustVault received an invalid Marketplace order response.",
      };
    }

    if (order.id !== orderId) {
      return {
        ok: false,
        status: response.status,
        code: "MARKETPLACE_ORDER_ID_MISMATCH",
        message:
          "The Marketplace order response did not match the requested order.",
      };
    }

    return {
      ok: true,
      order,
    };
  } catch {
    return {
      ok: false,
      status: null,
      code: "MARKETPLACE_ORDER_NETWORK_ERROR",
      message:
        "TrustVault could not reach the Marketplace order service.",
    };
  }
}
