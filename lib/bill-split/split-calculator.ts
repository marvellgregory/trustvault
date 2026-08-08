import { formatUnits, parseUnits } from "viem";

import type {
  BillSplitDraftParticipant,
  BillSplitMethod,
} from "@/components/bill-split/types";

export type CalculatedParticipantShare = {
  id: string;
  amountBaseUnits: bigint;
  amount: string;
};

export function calculateParticipantShares(input: {
  totalAmount: string;
  participants: BillSplitDraftParticipant[];
  splitMethod: BillSplitMethod;
}): CalculatedParticipantShare[] {
  const totalBaseUnits = parseUnits(input.totalAmount.trim(), 6);

  if (input.participants.length === 0) {
    return [];
  }

  if (input.splitMethod === "equal") {
    const participantCount = BigInt(input.participants.length);
    const baseShare = totalBaseUnits / participantCount;
    let remainder = totalBaseUnits % participantCount;

    return input.participants.map((participant) => {
      const receivesRemainder = remainder > BigInt(0);
      const amountBaseUnits =
        baseShare + (receivesRemainder ? BigInt(1) : BigInt(0));

      if (receivesRemainder) {
        remainder -= BigInt(1);
      }

      return {
        id: participant.id,
        amountBaseUnits,
        amount: formatUnits(amountBaseUnits, 6),
      };
    });
  }

  const shares = input.participants.map((participant) => ({
    id: participant.id,
    amountBaseUnits: parseUnits(
      participant.customAmount.trim() || "0",
      6,
    ),
  }));

  const customTotal = shares.reduce(
    (sum, participant) => sum + participant.amountBaseUnits,
    BigInt(0),
  );

  if (customTotal !== totalBaseUnits) {
    throw new Error(
      `Custom split must equal exactly ${formatUnits(totalBaseUnits, 6)} USDC.`,
    );
  }

  return shares.map((share) => ({
    ...share,
    amount: formatUnits(share.amountBaseUnits, 6),
  }));
}
