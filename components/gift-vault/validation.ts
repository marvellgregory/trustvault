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

export function isStepValid(
  step: GiftStepId,
  data: GiftData,
  _today: string,
) {
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
    return data.message.trim().length <= 240;
  }

  return true;
}
