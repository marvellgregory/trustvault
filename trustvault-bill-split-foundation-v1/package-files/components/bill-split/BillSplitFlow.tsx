"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";

import { BillSplitProgress } from "@/components/bill-split/BillSplitProgress";
import { useBillSplit } from "@/components/bill-split/hooks/useBillSplit";
import { BillDetailsStep } from "@/components/bill-split/steps/BillDetailsStep";
import { ParticipantsStep } from "@/components/bill-split/steps/ParticipantsStep";
import { ReviewStep } from "@/components/bill-split/steps/ReviewStep";
import { SplitMethodStep } from "@/components/bill-split/steps/SplitMethodStep";

export function BillSplitFlow() {
  const router = useRouter();
  const { address } = useAccount();
  const [saving, setSaving] = useState(false);

  const {
    step,
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
    createBill,
  } = useBillSplit(address);

  async function handleCreate() {
    setSaving(true);

    try {
      const bill = await createBill();

      if (bill) {
        router.push(`/bill-split/manage/${encodeURIComponent(bill.id)}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (createdBill) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)]">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
            Bill Split created.
          </h2>
          <p className="mt-3 text-sm text-zinc-600">
            {createdBill.id}
          </p>
          <Link
            href={`/bill-split/manage/${encodeURIComponent(createdBill.id)}`}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
          >
            Open bill
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <BillSplitProgress step={step} />

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
          {step === 1 && (
            <BillDetailsStep
              draft={draft}
              organizerAddress={address}
              updateField={updateField}
            />
          )}

          {step === 2 && (
            <ParticipantsStep
              draft={draft}
              updateParticipant={updateParticipant}
              addParticipant={addParticipant}
              removeParticipant={removeParticipant}
            />
          )}

          {step === 3 && (
            <SplitMethodStep
              draft={draft}
              calculatedShares={calculatedShares}
              setSplitMethod={setSplitMethod}
              updateParticipant={updateParticipant}
            />
          )}

          {step === 4 && (
            <ReviewStep
              draft={draft}
              organizerAddress={address}
              calculatedShares={calculatedShares}
            />
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 1 || saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ReceiptText className="h-4 w-4" />
                )}
                {saving ? "Creating…" : "Create Bill Split"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
