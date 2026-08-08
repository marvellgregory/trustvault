import type { PublicClient } from "viem";

import {
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
  giftVaultAbi,
} from "@/lib/gift-vault/contract";
import {
  normalizeGift,
  type NormalizedGift,
} from "@/lib/gift-vault/gift-display";

export type IndexedGift = NormalizedGift & {
  giftId: bigint;
};

export async function readNextGiftId(
  publicClient: PublicClient,
) {
  return publicClient.readContract({
    address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
    abi: giftVaultAbi,
    functionName: "nextGiftId",
  });
}

export async function listRecentGifts(
  publicClient: PublicClient,
  options?: {
    limit?: number;
  },
): Promise<IndexedGift[]> {
  const nextGiftId = await readNextGiftId(publicClient);
  const latestGiftId = nextGiftId - BigInt(1);

  if (latestGiftId < BigInt(1)) {
    return [];
  }

  const limit = Math.max(
    1,
    Math.min(options?.limit ?? 100, 250),
  );

  const firstGiftId =
    latestGiftId > BigInt(limit)
      ? latestGiftId - BigInt(limit) + BigInt(1)
      : BigInt(1);

  const ids: bigint[] = [];

  for (
    let id = latestGiftId;
    id >= firstGiftId;
    id -= BigInt(1)
  ) {
    ids.push(id);
  }

  const results = await Promise.allSettled(
    ids.map(async (giftId) => {
      const raw = await publicClient.readContract({
        address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
        abi: giftVaultAbi,
        functionName: "getGift",
        args: [giftId],
      });

      return {
        giftId,
        ...normalizeGift(raw),
      };
    }),
  );

  return results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<IndexedGift> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
}
