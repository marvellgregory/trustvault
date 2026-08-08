"use client";

import { useMemo, useState } from "react";
import { initialGiftData, type GiftData, type GiftStepId } from "@/components/gift-vault/types";
import { isStepValid } from "@/components/gift-vault/validation";

export function useGiftVault() {
  const [step, setStep] = useState<GiftStepId>(1);
  const [data, setData] = useState<GiftData>(initialGiftData);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const canContinue = useMemo(() => isStepValid(step, data, today), [data, step, today]);

  function updateField<K extends keyof GiftData>(field: K, value: GiftData[K]) {
    setData((current) => ({ ...current, [field]: value }));
  }
  function markTouched(field: keyof GiftData) {
    setTouched((current) => ({ ...current, [field]: true }));
  }
  function nextStep() {
    if (!canContinue) {
      setTouched({ recipientName: true, walletAddress: true, amount: true, unlockDate: true });
      return;
    }
    setStep((current) => Math.min(current + 1, 5) as GiftStepId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function previousStep() {
    setStep((current) => Math.max(current - 1, 1) as GiftStepId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function submitDraft() { setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function reset() { setData(initialGiftData); setStep(1); setSubmitted(false); setTouched({}); }

  return { step, data, submitted, touched, today, updateField, markTouched, nextStep, previousStep, submitDraft, reset };
}
