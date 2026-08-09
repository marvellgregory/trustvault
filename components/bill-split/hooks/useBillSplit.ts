"use client";

import { useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";

import type {
  BillSplit,
  BillSplitDraft,
  BillSplitDraftParticipant,
  BillSplitMethod,
} from "@/components/bill-split/types";
import { validateDraftBasics } from "@/components/bill-split/validation";
import { createBillSplitId, createParticipantId } from "@/lib/bill-split/bill-id";
import { browserBillSplitRepository } from "@/lib/bill-split/bill-repository";
import { calculateParticipantShares } from "@/lib/bill-split/split-calculator";

function emptyParticipant(): BillSplitDraftParticipant {
  return {
    id: createParticipantId(),
    name: "",
    walletAddress: "",
    customAmount: "",
  };
}

const initialDraft: BillSplitDraft = {
  title: "",
  note: "",
  totalAmount: "",
  splitMethod: "equal",
  participants: [emptyParticipant(), emptyParticipant()],
};

export function useBillSplit(organizerAddress?: string) {
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [draft, setDraft] = useState<BillSplitDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [createdBill, setCreatedBill] = useState<BillSplit | null>(null);

  const calculatedShares = useMemo(() => {
    if (!draft.totalAmount || draft.participants.length === 0) {
      return [];
    }

    try {
      return calculateParticipantShares({
        totalAmount: draft.totalAmount,
        participants: draft.participants,
        splitMethod: draft.splitMethod,
      });
    } catch {
      return [];
    }
  }, [draft]);

  function updateField<K extends keyof BillSplitDraft>(
    key: K,
    value: BillSplitDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setError(null);
  }

  function updateParticipant(
    id: string,
    patch: Partial<BillSplitDraftParticipant>,
  ) {
    setDraft((current) => ({
      ...current,
      participants: current.participants.map((participant) =>
        participant.id === id
          ? { ...participant, ...patch }
          : participant,
      ),
    }));
    setError(null);
  }

  function addParticipant() {
    setDraft((current) => ({
      ...current,
      participants: [...current.participants, emptyParticipant()],
    }));
  }

  function removeParticipant(id: string) {
    setDraft((current) => ({
      ...current,
      participants:
        current.participants.length <= 2
          ? current.participants
          : current.participants.filter(
              (participant) => participant.id !== id,
            ),
    }));
  }

  function setSplitMethod(method: BillSplitMethod) {
    updateField("splitMethod", method);
  }

  function nextStep() {
    setError(null);

    if (step === 1) {
      if (draft.title.trim().length < 2) {
        setError("Enter a bill title before continuing.");
        return;
      }

      try {
        if (parseUnits(draft.totalAmount.trim(), 6) <= BigInt(0)) {
          throw new Error();
        }
      } catch {
        setError("Enter a valid USDC total.");
        return;
      }
    }

    if (step === 2) {
      const errorMessage = validateDraftBasics(draft);

      if (errorMessage) {
        setError(errorMessage);
        return;
      }
    }

    if (step === 3) {
      try {
        calculateParticipantShares({
          totalAmount: draft.totalAmount,
          participants: draft.participants,
          splitMethod: draft.splitMethod,
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Split calculation failed.",
        );
        return;
      }
    }

    const next = Math.min(4, step + 1);
    setStep(next);
    setMaxStepReached((current) => Math.max(current, next));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  function goToStep(target: number) {
    setError(null);

    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > 4 ||
      target > maxStepReached
    ) {
      return;
    }

    if (target >= 2) {
      if (draft.title.trim().length < 2) {
        setError("Enter a bill title before continuing.");
        setStep(1);
        return;
      }

      try {
        if (parseUnits(draft.totalAmount.trim(), 6) <= BigInt(0)) {
          throw new Error();
        }
      } catch {
        setError("Enter a valid USDC total.");
        setStep(1);
        return;
      }
    }

    if (target >= 3) {
      const errorMessage = validateDraftBasics(draft);

      if (errorMessage) {
        setError(errorMessage);
        setStep(2);
        return;
      }
    }

    if (target >= 4) {
      try {
        calculateParticipantShares({
          totalAmount: draft.totalAmount,
          participants: draft.participants,
          splitMethod: draft.splitMethod,
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Split calculation failed.",
        );
        setStep(3);
        return;
      }
    }

    setStep(target);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function createBill() {
    setError(null);

    if (!organizerAddress) {
      setError("Connect the organizer wallet before creating the bill.");
      return null;
    }

    const errorMessage = validateDraftBasics(draft);

    if (errorMessage) {
      setError(errorMessage);
      return null;
    }

    let shares;

    try {
      shares = calculateParticipantShares({
        totalAmount: draft.totalAmount,
        participants: draft.participants,
        splitMethod: draft.splitMethod,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Split calculation failed.",
      );
      return null;
    }

    const now = new Date().toISOString();
    const totalBaseUnits = parseUnits(draft.totalAmount.trim(), 6);

    const bill: BillSplit = {
      id: createBillSplitId(),
      title: draft.title.trim(),
      note: draft.note.trim() || undefined,
      totalAmount: formatUnits(totalBaseUnits, 6),
      totalBaseUnits: totalBaseUnits.toString(),
      asset: "USDC",
      network: "Arc Testnet",
      organizerAddress,
      splitMethod: draft.splitMethod,
      participants: draft.participants.map((participant) => {
        const share = shares.find((row) => row.id === participant.id);

        if (!share) {
          throw new Error("Participant share could not be calculated.");
        }

        return {
          id: participant.id,
          name: participant.name.trim(),
          walletAddress: participant.walletAddress.trim(),
          amountBaseUnits: share.amountBaseUnits.toString(),
          amount: share.amount,
          status: "pending" as const,
        };
      }),
      createdAt: now,
      updatedAt: now,
      status: "active",
    };

    await browserBillSplitRepository.save(bill);
    setCreatedBill(bill);

    return bill;
  }

  return {
    step,
    maxStepReached,
    draft,
    error,
    createdBill,
    calculatedShares,
    updateField,
    updateParticipant,
    addParticipant,
    removeParticipant,
    setSplitMethod,
    nextStep,
    previousStep,
    goToStep,
    createBill,
  };
}
