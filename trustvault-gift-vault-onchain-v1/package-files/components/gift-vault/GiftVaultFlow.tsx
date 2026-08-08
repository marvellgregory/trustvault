"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Gift,
  LoaderCircle,
} from "lucide-react";

import { GiftVaultProgress } from "@/components/gift-vault/GiftVaultProgress";
import { GiftVaultReceipt } from "@/components/gift-vault/GiftVaultReceipt";
import { useGiftVault } from "@/components/gift-vault/hooks/useGiftVault";
import { useGiftVaultTransaction } from "@/components/gift-vault/hooks/useGiftVaultTransaction";
import { AmountStep } from "@/components/gift-vault/steps/AmountStep";
import { MessageStep } from "@/components/gift-vault/steps/MessageStep";
import { RecipientStep } from "@/components/gift-vault/steps/RecipientStep";
import { ReviewStep } from "@/components/gift-vault/steps/ReviewStep";
import { UnlockStep } from "@/components/gift-vault/steps/UnlockStep";

export function GiftVaultFlow() {
  const {
    step,
    data,
    touched,
    today,
    updateField,
    markTouched,
    nextStep,
    previousStep,
    reset,
  } = useGiftVault();

  const {
    executeTransaction,
    resetTransaction,
    result,
    error,
    isSending,
    isSuccess,
  } = useGiftVaultTransaction();

  async function handleSendGift() {
    try {
      await executeTransaction(data);
    } catch {
      // User-facing transaction errors are rendered below.
    }
  }

  function handleReset() {
    resetTransaction();
    reset();
  }

  if (isSuccess && result) {
    return (
      <GiftVaultReceipt
        data={data}
        result={result}
        onReset={handleReset}
      />
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
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

            {step === 5 && (
              <ReviewStep data={data} />
            )}

            {error && step === 5 && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
              >
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-rose-700"
                />

                <div>
                  <p className="text-sm font-semibold text-rose-950">
                    Gift Vault transaction not completed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-rose-800">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={previousStep}
                disabled={
                  step === 1 ||
                  isSending
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="h-4 w-4"
                />
                Back
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={isSending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
                >
                  Continue
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendGift}
                  disabled={isSending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
                >
                  {isSending ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Gift
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  )}

                  {isSending
                    ? "Confirm wallet requests…"
                    : "Lock Gift on Arc Testnet"}
                </button>
              )}
            </div>

            {step === 5 && (
              <p className="mt-4 text-right text-xs leading-5 text-zinc-500">
                Creating a timed gift may require a USDC approval followed by the
                Gift Vault contract transaction. Review every wallet request before
                confirming.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
