import type { CreateTimedGiftResult } from "@/lib/gift-vault/create-gift";

export type PersistedGiftVault = {
  id: string;
  senderAddress: string;
  recipientAddress: string;
  amountBaseUnits: string;
  unlockTimestamp: string;
  transactionHash: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type GiftVaultPersistenceInput = {
  recipientAddress: string;
  message: string;
};

export type GiftVaultPersistenceResult =
  | {
      ok: true;
      gift: PersistedGiftVault;
    }
  | {
      ok: false;
      status: number | null;
      code: string;
      message: string;
    };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL?.replace(
    /\/$/,
    "",
  );

function giftPath(giftId: string) {
  if (!API_BASE_URL) {
    return null;
  }

  return `${API_BASE_URL}/gift-vault/gifts/${encodeURIComponent(
    giftId,
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
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  value: unknown,
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

function readGift(
  value: unknown,
): PersistedGiftVault | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const senderAddress =
    readString(value.senderAddress);
  const recipientAddress =
    readString(value.recipientAddress);
  const amountBaseUnits =
    readString(value.amountBaseUnits);
  const unlockTimestamp =
    readString(value.unlockTimestamp);
  const transactionHash =
    readString(value.transactionHash);
  const message = readString(value.message);
  const createdAt = readString(value.createdAt);
  const updatedAt = readString(value.updatedAt);

  if (
    !id ||
    !senderAddress ||
    !recipientAddress ||
    !amountBaseUnits ||
    !unlockTimestamp ||
    !transactionHash ||
    message === null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    senderAddress,
    recipientAddress,
    amountBaseUnits,
    unlockTimestamp,
    transactionHash,
    message,
    createdAt,
    updatedAt,
  };
}

function readGiftResponse(
  body: unknown,
): PersistedGiftVault | null {
  if (!isRecord(body)) {
    return null;
  }

  return readGift(body.giftVault);
}

function readApiError(
  body: unknown,
  status: number,
): GiftVaultPersistenceResult {
  if (isRecord(body)) {
    const error = body.error;

    if (isRecord(error)) {
      const code = readString(error.code);
      const message = readString(error.message);

      if (code && message) {
        return {
          ok: false,
          status,
          code,
          message,
        };
      }
    }
  }

  return {
    ok: false,
    status,
    code: "GIFT_VAULT_API_ERROR",
    message: "TrustVault could not save the private Gift Vault details.",
  };
}

function configurationError(): GiftVaultPersistenceResult {
  return {
    ok: false,
    status: null,
    code: "GIFT_VAULT_API_NOT_CONFIGURED",
    message: "Gift Vault cloud persistence is not configured.",
  };
}

function networkError(): GiftVaultPersistenceResult {
  return {
    ok: false,
    status: null,
    code: "GIFT_VAULT_NETWORK_ERROR",
    message: "TrustVault could not reach the Gift Vault persistence service.",
  };
}

export async function persistGiftVault(
  confirmed: CreateTimedGiftResult,
  input: GiftVaultPersistenceInput,
): Promise<GiftVaultPersistenceResult> {
  const path = giftPath(confirmed.giftId);

  if (!path) {
    return configurationError();
  }

  try {
    const response = await fetch(path, {
      method: "PUT",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        id: confirmed.giftId,
        recipientAddress:
          input.recipientAddress,
        amountBaseUnits:
          confirmed.amountBaseUnits,
        unlockTimestamp:
          String(confirmed.unlockTimestamp),
        transactionHash:
          confirmed.txHash,
        message: input.message,
      }),
    });

    const body = await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const gift = readGiftResponse(body);

    if (!gift) {
      return {
        ok: false,
        status: response.status,
        code: "INVALID_GIFT_VAULT_RESPONSE",
        message: "TrustVault received an invalid Gift Vault persistence response.",
      };
    }

    return {
      ok: true,
      gift,
    };
  } catch {
    return networkError();
  }
}

export async function fetchGiftVault(
  giftId: string,
): Promise<GiftVaultPersistenceResult> {
  const path = giftPath(giftId);

  if (!path) {
    return configurationError();
  }

  try {
    const response = await fetch(path, {
      method: "GET",
      credentials: "include",
      headers: {
        accept: "application/json",
      },
    });

    const body = await readJson(response);

    if (!response.ok) {
      return readApiError(
        body,
        response.status,
      );
    }

    const gift = readGiftResponse(body);

    if (!gift) {
      return {
        ok: false,
        status: response.status,
        code: "INVALID_GIFT_VAULT_RESPONSE",
        message: "TrustVault received an invalid Gift Vault persistence response.",
      };
    }

    return {
      ok: true,
      gift,
    };
  } catch {
    return networkError();
  }
}
