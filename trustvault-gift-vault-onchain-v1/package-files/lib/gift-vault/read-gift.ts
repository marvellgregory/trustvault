import type { PublicClient } from "viem";

import {
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
  giftVaultAbi,
} from "@/lib/gift-vault/contract";

export async function readTimedGift(
  publicClient: PublicClient,
  giftId: bigint,
) {
  return publicClient.readContract({
    address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
    abi: giftVaultAbi,
    functionName: "getGift",
    args: [giftId],
  });
}

export async function readGiftClaimable(
  publicClient: PublicClient,
  giftId: bigint,
) {
  return publicClient.readContract({
    address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
    abi: giftVaultAbi,
    functionName: "isClaimable",
    args: [giftId],
  });
}
