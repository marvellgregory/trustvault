import { formatUnits } from "viem";

import { formatGiftUnlock } from "@/lib/gift-vault/timezone";

export type NormalizedGift = {
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  unlockTimestamp: bigint;
  claimed: boolean;
};

export function normalizeGift(raw: unknown): NormalizedGift {
  if (Array.isArray(raw)) {
    return {
      sender: raw[0] as `0x${string}`,
      recipient: raw[1] as `0x${string}`,
      amount: raw[2] as bigint,
      unlockTimestamp: raw[3] as bigint,
      claimed: raw[4] as boolean,
    };
  }

  const value = raw as {
    sender: `0x${string}`;
    recipient: `0x${string}`;
    amount: bigint;
    unlockTimestamp: bigint;
    claimed: boolean;
  };

  return value;
}

export function formatGiftAmount(amount: bigint) {
  return formatUnits(amount, 6);
}

export function formatGiftUnlockFromChain(
  unlockTimestamp: bigint,
  timeZone: string,
) {
  return formatGiftUnlock(
    Number(unlockTimestamp),
    timeZone,
  );
}

export function shortAddress(address: string) {
  if (address.length < 14) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function isSameAddress(
  left?: string,
  right?: string,
) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}
