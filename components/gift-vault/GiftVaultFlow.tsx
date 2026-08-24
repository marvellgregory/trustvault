"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gift,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";

import { GiftVaultProgress } from "@/components/gift-vault/GiftVaultProgress";
import { GiftVaultReceipt } from "@/components/gift-vault/GiftVaultReceipt";
import { useGiftVault } from "@/components/gift-vault/hooks/useGiftVault";
import { useGiftVaultTransaction } from "@/components/gift-vault/hooks/useGiftVaultTransaction";
import { AmountStep } from "@/components/gift-vault/steps/AmountStep";
import { MessageStep } from "@/components/gift-vault/steps/MessageStep";
import { RecipientStep } from "@/components/gift-vault/steps/RecipientStep";
import { ReviewStep } from "@/components/gift-vault/steps/ReviewStep";
import { UnlockStep } from "@/components/gift-vault/steps/UnlockStep";
import { ARC_TESTNET_EXPLORER_URL } from "@/lib/gift-vault/contract";
import {
  initialGiftVaultSyncState,
  syncConfirmedGiftVault,
  type GiftVaultSyncState,
} from "@/lib/aws/gift-vault-sync";

export function GiftVaultFlow() {
  const {
    step,
    maxStepReached,
    data,
    touched,
    today,
    updateField,
    markTouched,
    nextStep,
    previousStep,
    goToStep,
    reset,
  } = useGiftVault();

  const {
    executeTransaction,
    retryGiftConfirmation,
    retryApprovalConfirmation,
    resetTransaction,
    status,
    result,
    error,
    notice,
    pendingGift,
    pendingApproval,
    isSending,
    isSuccess,
    isConfirmationPending,
    isApprovalPending,
  } = useGiftVaultTransaction();

  const [finalConfirmed, setFinalConfirmed] = useState(false);

  const [giftSync, setGiftSync] =
    useState<GiftVaultSyncState>(
      initialGiftVaultSyncState,
    );

  async function handleSendGift() {
    try {
      setFinalConfirmed(false);

      const confirmed =
        await executeTransaction(data);

      if (!confirmed) {
        return;
      }

      await persistConfirmedGift(
        confirmed,
      );
    } catch {
      // User-facing errors are rendered below.
    }
  }

  async function handleRetryGiftConfirmation() {
    try {
      const confirmed =
        await retryGiftConfirmation();

      if (!confirmed) {
        return;
      }

      await persistConfirmedGift(
        confirmed,
      );
    } catch {
      // User-facing errors are rendered below.
    }
  }

  function handleReset() {
    resetTransaction();
    reset();
    setFinalConfirmed(false);
    setGiftSync(initialGiftVaultSyncState);
  }

  async function persistConfirmedGift(
    confirmed = result,
  ) {
    if (!confirmed) {
      return;
    }

    setGiftSync({
      status: "syncing",
      giftId: confirmed.giftId,
      message: null,
    });

    const persistence =
      await syncConfirmedGiftVault(
        confirmed,
        data,
      );

    if (persistence.ok) {
      setGiftSync({
        status: "persisted",
        giftId: confirmed.giftId,
        message: null,
      });

      return;
    }

    setGiftSync({
      status: "failed",
      giftId: confirmed.giftId,
      message: persistence.message,
    });
  }

  if (isSuccess && result) {
    return (
      <div>
        <GiftVaultReceipt
          data={data}
          result={result}
          onReset={handleReset}
        />

        <div className="section-shell pb-12 sm:pb-16">
          <div className="mx-auto max-w-3xl">
            {giftSync.status === "syncing" && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                Saving the private Gift Vault details to your TrustVault account?
              </div>
            )}

            {giftSync.status === "persisted" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Private Gift Vault details saved to your TrustVault account.
              </div>
            )}

            {giftSync.status === "failed" && (
              <div
                role="alert"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <p className="text-sm font-semibold text-amber-950">
                  Gift confirmed on Arc Testnet
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-900">
                  The blockchain transaction was confirmed, but TrustVault could not save the private account details yet.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void persistConfirmedGift();
                  }}
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-950 transition hover:border-amber-400"
                >
                  Retry private details sync
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const blocksNewSubmission =
    Boolean(pendingGift) ||
    Boolean(pendingApproval) ||
    isConfirmationPending ||
    isApprovalPending;

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <GiftVaultProgress
          step={step}
          maxStepReached={maxStepReached}
          onStepSelect={goToStep}
          navigationDisabled={isSending || blocksNewSubmission}
        />

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
              <ReviewStep
                data={data}
                confirmed={finalConfirmed}
                onConfirmedChange={setFinalConfirmed}
                transactionStatus={status}
                hasPendingGift={Boolean(pendingGift)}
                hasPendingApproval={Boolean(pendingApproval)}
              />
            )}

            {step === 5 && notice && (
              <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <Clock3
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-blue-950">
                      Transaction status
                    </p>
                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      {notice}
                    </p>

                    {pendingGift && (
                      <div className="mt-4">
                        <p className="break-all font-mono text-[11px] text-blue-900/80">
                          {pendingGift.txHash}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleRetryGiftConfirmation}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-950 px-4 text-xs font-semibold text-white transition hover:bg-blue-900"
                          >
                            <RotateCcw
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            Retry confirmation
                          </button>

                          <a
                            href={`${ARC_TESTNET_EXPLORER_URL}/tx/${pendingGift.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 text-xs font-semibold text-blue-950 transition hover:border-blue-400"
                          >
                            Open on ArcScan
                            <ExternalLink
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          </a>
                        </div>
                      </div>
                    )}

                    {pendingApproval && (
                      <div className="mt-4">
                        <p className="break-all font-mono text-[11px] text-blue-900/80">
                          {pendingApproval.approvalTxHash}
                        </p>

                        <button
                          type="button"
                          onClick={retryApprovalConfirmation}
                          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-950 px-4 text-xs font-semibold text-white transition hover:bg-blue-900"
                        >
                          <RotateCcw
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                          Retry approval confirmation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                  isSending ||
                  blocksNewSubmission
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
                  disabled={
                    isSending ||
                    blocksNewSubmission
                  }
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
                  disabled={
                    isSending ||
                    blocksNewSubmission ||
                    !finalConfirmed
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
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
                    : blocksNewSubmission
                      ? "Existing transaction pending"
                      : !finalConfirmed
                        ? "Review & confirm details"
                        : "Lock Gift on Arc Testnet"}
                </button>
              )}
            </div>

            {step === 5 && (
              <p className="mt-4 text-right text-xs leading-5 text-zinc-500">
                TrustVault never creates a replacement gift while a previously
                broadcast transaction is awaiting confirmation.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
