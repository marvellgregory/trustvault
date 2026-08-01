"use client";

import { ArrowLeft, ArrowRight, Gift } from "lucide-react";
import { GiftVaultProgress } from "@/components/gift-vault/GiftVaultProgress";
import { GiftVaultSuccess } from "@/components/gift-vault/GiftVaultSuccess";
import { useGiftVault } from "@/components/gift-vault/hooks/useGiftVault";
import { AmountStep } from "@/components/gift-vault/steps/AmountStep";
import { MessageStep } from "@/components/gift-vault/steps/MessageStep";
import { RecipientStep } from "@/components/gift-vault/steps/RecipientStep";
import { ReviewStep } from "@/components/gift-vault/steps/ReviewStep";
import { UnlockStep } from "@/components/gift-vault/steps/UnlockStep";

export function GiftVaultFlow() {
  const {
    step,
    data,
    submitted,
    touched,
    today,
    updateField,
    markTouched,
    nextStep,
    previousStep,
    submitDraft,
    reset,
  } = useGiftVault();

  if (submitted) {
    return <GiftVaultSuccess data={data} onReset={reset} />;
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <GiftVaultProgress step={step} />

        <div className="min-w-0">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
            {step === 1 && (
              <RecipientStep
                data={data}
                touched={touched}
                updateField={updateField}
                markTouched={markTouched}
              />
            )}

            {step === 2 && (
              <AmountStep
                data={data}
                touched={touched}
                updateField={updateField}
                markTouched={markTouched}
              />
            )}

            {step === 3 && (
              <UnlockStep
                data={data}
                touched={touched}
                today={today}
                updateField={updateField}
                markTouched={markTouched}
              />
            )}

            {step === 4 && (
              <MessageStep
                data={data}
                updateField={updateField}
              />
            )}

            {step === 5 && <ReviewStep data={data} />}

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={previousStep}
                disabled={step === 1}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
                >
                  Continue
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitDraft}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
                >
                  <Gift aria-hidden="true" className="h-4 w-4" />
                  Create Gift Vault draft
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}