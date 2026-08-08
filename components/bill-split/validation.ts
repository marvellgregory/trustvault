import { isAddress, parseUnits } from "viem";

import type {
  BillSplitDraft,
  BillSplitDraftParticipant,
} from "@/components/bill-split/types";

export function validateUsdcAmount(value: string) {
  const normalized = value.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    return "Enter a valid USDC amount with up to 6 decimal places.";
  }

  if (parseUnits(normalized, 6) <= parseUnits("0", 6)) {
    return "Amount must be greater than zero.";
  }

  return null;
}

export function validateParticipant(
  participant: BillSplitDraftParticipant,
) {
  if (participant.name.trim().length < 2) {
    return "Participant name must contain at least 2 characters.";
  }

  if (!isAddress(participant.walletAddress.trim())) {
    return "Enter a valid EVM wallet address.";
  }

  return null;
}

export function validateDraftBasics(draft: BillSplitDraft) {
  if (draft.title.trim().length < 2) {
    return "Bill title must contain at least 2 characters.";
  }

  const amountError = validateUsdcAmount(draft.totalAmount);

  if (amountError) {
    return amountError;
  }

  if (draft.participants.length < 2) {
    return "Add at least 2 participants.";
  }

  for (const participant of draft.participants) {
    const error = validateParticipant(participant);

    if (error) {
      return `${participant.name || "Participant"}: ${error}`;
    }
  }

  const normalizedWallets = draft.participants.map((participant) =>
    participant.walletAddress.trim().toLowerCase(),
  );

  if (new Set(normalizedWallets).size !== normalizedWallets.length) {
    return "Each participant must use a different wallet address.";
  }

  return null;
}
