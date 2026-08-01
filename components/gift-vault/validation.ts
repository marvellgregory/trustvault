import type { GiftData, GiftStepId } from "@/components/gift-vault/types";

export function isValidWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function isPositiveAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

export function isStepValid(step: GiftStepId, data: GiftData, today: string) {
  if (step === 1) return data.recipientName.trim().length >= 2 && isValidWalletAddress(data.walletAddress);
  if (step === 2) return isPositiveAmount(data.amount);
  if (step === 3) return Boolean(data.unlockDate) && data.unlockDate >= today;
  if (step === 4) return data.message.trim().length <= 240;
  return true;
}
