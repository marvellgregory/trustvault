import type {
  GiftData,
  GiftStepId,
} from "@/components/gift-vault/types";
import { isFutureGiftUnlock } from "@/lib/gift-vault/timezone";

export function isValidWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isPositiveAmount(value: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(value.trim())) {
    return false;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

export const GIFT_MESSAGE_MAX_WORDS = 500;

export function countGiftMessageWords(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/u).length;
}

export function isValidGiftMessage(value: string) {
  return countGiftMessageWords(value) <= GIFT_MESSAGE_MAX_WORDS;
}
export function isStepValid(
  step: GiftStepId,
  data: GiftData,
  today: string,
) {
  void today;
  if (step === 1) {
    return (
      data.recipientName.trim().length >= 2 &&
      isValidWalletAddress(data.walletAddress)
    );
  }

  if (step === 2) {
    return isPositiveAmount(data.amount);
  }

  if (step === 3) {
    return Boolean(
      data.unlockDate &&
        data.unlockTime &&
        data.timeZone &&
        isFutureGiftUnlock(
          data.unlockDate,
          data.unlockTime,
          data.timeZone,
        ),
    );
  }

  if (step === 4) {
    return isValidGiftMessage(data.message);
  }

  return true;
}
