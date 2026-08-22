import type { GiftData } from "@/components/gift-vault/types";
import type { CreateTimedGiftResult } from "@/lib/gift-vault/create-gift";
import type {
  GiftVaultPersistenceResult,
} from "@/lib/aws/gift-vault-client";

export type GiftVaultSyncState =
  | {
      status: "idle";
      giftId: null;
      message: null;
    }
  | {
      status: "syncing";
      giftId: string;
      message: null;
    }
  | {
      status: "persisted";
      giftId: string;
      message: null;
    }
  | {
      status: "failed";
      giftId: string;
      message: string;
    };

export type GiftVaultPersist = (
  confirmed: CreateTimedGiftResult,
  input: {
    recipientAddress: string;
    message: string;
  },
) => Promise<GiftVaultPersistenceResult>;

export type GiftVaultSyncDependencies = {
  persist: GiftVaultPersist;
};

export const initialGiftVaultSyncState: GiftVaultSyncState = {
  status: "idle",
  giftId: null,
  message: null,
};

export function createGiftVaultPersistenceInput(
  data: GiftData,
) {
  return {
    recipientAddress: data.walletAddress,
    message: data.message,
  };
}

export async function syncConfirmedGiftVault(
  confirmed: CreateTimedGiftResult,
  data: GiftData,
  dependencies?: GiftVaultSyncDependencies,
): Promise<GiftVaultPersistenceResult> {
  const input =
    createGiftVaultPersistenceInput(data);

  if (dependencies) {
    return dependencies.persist(
      confirmed,
      input,
    );
  }

  const {
    persistGiftVault,
  } = await import(
    "@/lib/aws/gift-vault-client"
  );

  return persistGiftVault(
    confirmed,
    input,
  );
}
