"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { arcTestnet } from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { SendNowReceipt } from "@/components/gift-vault/send-now/SendNowReceipt";
import { UnifiedTransactionReview } from "@/components/transaction-review/UnifiedTransactionReview";
import {
  ARC_TESTNET_EXPLORER_URL,
} from "@/lib/gift-vault/contract";
import {
  confirmSendNowTransaction,
  sendUsdcNow,
  SendNowConfirmationPendingError,
  type PendingSendNowTransaction,
  type SendNowResult,
} from "@/lib/gift-vault/send-now";
import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";

const PENDING_SEND_NOW_KEY =
  "trustvault:gift-vault:pending-send-now";

type Step = 1 | 2 | 3 | 4;

type Draft = {
  recipientName: string;
  walletAddress: string;
  amount: string;
  message: string;
};

const emptyDraft: Draft = {
  recipientName: "",
  walletAddress: "",
  amount: "",
  message: "",
};

function readPending() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PENDING_SEND_NOW_KEY);
    return raw
      ? (JSON.parse(raw) as PendingSendNowTransaction)
      : null;
  } catch {
    return null;
  }
}

function savePending(value: PendingSendNowTransaction) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    PENDING_SEND_NOW_KEY,
    JSON.stringify(value),
  );
}

function clearPending() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_SEND_NOW_KEY);
}

function amountIsValid(value: string) {
  return /^\d+(\.\d{1,6})?$/.test(value.trim()) && Number(value) > 0;
}

export function SendNowFlow() {
  const transactionReadiness = useWalletTransactionReadiness();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [step, setStep] = useState<Step>(1);
  const [maxStepReached, setMaxStepReached] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pending, setPending] =
    useState<PendingSendNowTransaction | null>(null);
  const [result, setResult] =
    useState<SendNowResult | null>(null);
  const [status, setStatus] =
    useState<"idle" | "sending" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finalConfirmed, setFinalConfirmed] = useState(false);

  useEffect(() => {
    const restorePending = window.setTimeout(() => {
      const stored = readPending();

      if (stored) {
        setPending(stored);
        setStatus("pending");
        setNotice(
          "A previously submitted Send Now transaction is awaiting confirmation. Do not send another payment.",
        );
      }
    }, 0);

    return () => {
      window.clearTimeout(restorePending);
    };
  }, []);


  const canContinue = useMemo(() => {
    if (step === 1) {
      return (
        draft.recipientName.trim().length >= 2 &&
        isAddress(draft.walletAddress)
      );
    }

    if (step === 2) {
      return amountIsValid(draft.amount);
    }

    if (step === 3) {
      return draft.message.trim().length <= 240;
    }

    return true;
  }, [draft, step]);

  function updateField<K extends keyof Draft>(
    field: K,
    value: Draft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setFinalConfirmed(false);
  }

  function nextStep() {
    if (!canContinue) {
      setTouched({
        recipientName: true,
        walletAddress: true,
        amount: true,
      });
      return;
    }

    const next = Math.min(step + 1, 4) as Step;
    setStep(next);
    setMaxStepReached(
      (current) => Math.max(current, next) as Step,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setStep(
      (current) => Math.max(1, current - 1) as Step,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(target: Step) {
    if (target > maxStepReached || status === "sending" || pending) {
      return;
    }

    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function executeSendNow() {
    if (pending) {
      setStatus("pending");
      setNotice(
        "An existing Send Now transaction is awaiting confirmation. Retry that transaction instead of sending again.",
      );
      return;
    }

    try {
      setStatus("sending");
      setError(null);
      setNotice("Preparing direct USDC transfer on Arc Testnet.");

      if (!address || !chainId || !publicClient || !walletClient) {
        throw new Error("Connect your wallet before sending USDC.");
      }

      const response = await sendUsdcNow({
        publicClient,
        walletClient,
        connectedAddress: address,
        chainId,
        recipientAddress: draft.walletAddress,
        amount: draft.amount,
        readinessAuthority: transactionReadiness.authority,
        onSubmitted(nextPending) {
          savePending(nextPending);
          setPending(nextPending);
          setStatus("pending");
          setNotice(
            "USDC transfer submitted. TrustVault is confirming the existing transaction.",
          );
        },
      });

      clearPending();
      setPending(null);
      setResult(response);
      setStatus("success");
      setNotice(null);
    } catch (caughtError) {
      if (caughtError instanceof SendNowConfirmationPendingError) {
        savePending(caughtError.pending);
        setPending(caughtError.pending);
        setStatus("pending");
        setError(null);
        setNotice(caughtError.message);
        return;
      }

      setStatus("error");
      setNotice(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Send Now transaction failed.",
      );
    }
  }

  async function retryConfirmation() {
    if (!publicClient || !pending) return;

    try {
      setStatus("pending");
      setError(null);
      setNotice(
        "Checking the existing USDC transfer. No new payment will be submitted.",
      );

      const confirmed = await confirmSendNowTransaction(
        publicClient,
        pending,
      );

      clearPending();
      setPending(null);
      setResult(confirmed);
      setStatus("success");
      setNotice(null);
    } catch (caughtError) {
      if (caughtError instanceof SendNowConfirmationPendingError) {
        setError(null);
        setNotice(caughtError.message);
        setStatus("pending");
        return;
      }

      setStatus("error");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Confirmation check failed.",
      );
    }
  }

  function reset() {
    if (pending) return;

    setDraft(emptyDraft);
    setStep(1);
    setMaxStepReached(1);
    setTouched({});
    setResult(null);
    setError(null);
    setNotice(null);
    setStatus("idle");
    setFinalConfirmed(false);
  }

  if (result) {
    return (
      <SendNowReceipt
        recipientName={draft.recipientName}
        message={draft.message}
        result={result}
        onReset={reset}
      />
    );
  }

  const steps = [
    { id: 1 as const, label: "Recipient", icon: UserRound },
    { id: 2 as const, label: "Amount", icon: WalletCards },
    { id: 3 as const, label: "Message", icon: MessageSquareText },
    { id: 4 as const, label: "Review", icon: Send },
  ];

  const navigationDisabled =
    status === "sending" || Boolean(pending);

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Send Now
            </p>

            <div className="mt-5 space-y-3">
              {steps.map(({ id, label, icon: Icon }) => {
                const active = id === step;
                const complete = id < maxStepReached;
                const available = id <= maxStepReached;

                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => goToStep(id)}
                    disabled={!available || navigationDisabled}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active
                        ? "bg-zinc-950 text-white"
                        : complete
                          ? "cursor-pointer bg-blue-50 text-blue-800 hover:bg-blue-100"
                          : available
                            ? "cursor-pointer text-zinc-700 hover:bg-zinc-100"
                            : "cursor-not-allowed text-zinc-400 opacity-60"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">
              Send Now transfers USDC directly to the recipient. It does not
              use the timed Gift Vault contract and cannot be claimed later.
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
            {step === 1 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Step 1
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
                  Who is receiving the gift?
                </h2>

                <div className="mt-7 space-y-5">
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-900">
                      Recipient name
                    </span>
                    <input
                      value={draft.recipientName}
                      onChange={(event) =>
                        updateField("recipientName", event.target.value)
                      }
                      onBlur={() =>
                        setTouched((current) => ({
                          ...current,
                          recipientName: true,
                        }))
                      }
                      className="mt-2 min-h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-500"
                      placeholder="e.g. Tapu"
                    />
                    {touched.recipientName &&
                      draft.recipientName.trim().length < 2 && (
                        <p className="mt-2 text-xs text-rose-700">
                          Enter the recipient name.
                        </p>
                      )}
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-900">
                      Recipient wallet
                    </span>
                    <input
                      value={draft.walletAddress}
                      onChange={(event) =>
                        updateField("walletAddress", event.target.value)
                      }
                      onBlur={() =>
                        setTouched((current) => ({
                          ...current,
                          walletAddress: true,
                        }))
                      }
                      className="mt-2 min-h-12 w-full rounded-2xl border border-zinc-300 px-4 font-mono text-sm outline-none focus:border-zinc-500"
                      placeholder="0x..."
                    />
                    {touched.walletAddress &&
                      !isAddress(draft.walletAddress) && (
                        <p className="mt-2 text-xs text-rose-700">
                          Enter a valid EVM wallet address.
                        </p>
                      )}
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Step 2
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
                  How much USDC?
                </h2>

                <label className="mt-7 block">
                  <span className="text-sm font-semibold text-zinc-900">
                    Gift amount
                  </span>
                  <div className="mt-2 flex min-h-14 items-center rounded-2xl border border-zinc-300 px-4">
                    <input
                      value={draft.amount}
                      onChange={(event) =>
                        updateField("amount", event.target.value)
                      }
                      onBlur={() =>
                        setTouched((current) => ({
                          ...current,
                          amount: true,
                        }))
                      }
                      inputMode="decimal"
                      className="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold outline-none"
                      placeholder="0.10"
                    />
                    <span className="text-sm font-semibold text-zinc-500">
                      USDC
                    </span>
                  </div>

                  {touched.amount && !amountIsValid(draft.amount) && (
                    <p className="mt-2 text-xs text-rose-700">
                      Enter a positive USDC amount with up to 6 decimals.
                    </p>
                  )}
                </label>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Step 3
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
                  Add a message
                </h2>

                <label className="mt-7 block">
                  <span className="text-sm font-semibold text-zinc-900">
                    Message <span className="font-normal text-zinc-400">(optional)</span>
                  </span>
                  <textarea
                    value={draft.message}
                    onChange={(event) =>
                      updateField("message", event.target.value.slice(0, 240))
                    }
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-zinc-300 p-4 text-sm outline-none focus:border-zinc-500"
                    placeholder="Add a note for the recipient."
                  />
                  <p className="mt-2 text-right text-xs text-zinc-400">
                    {draft.message.length}/240
                  </p>
                </label>
              </div>
            )}

            {step === 4 && (
              <UnifiedTransactionReview
                eyebrow="Final review"
                title="Review direct USDC gift"
                description="Verify the recipient, connected wallet, Arc Testnet and exact USDC amount before opening MetaMask."
                accent="blue"
                summary={[
                  { label: "Recipient", value: draft.recipientName },
                  { label: "Recipient wallet", value: draft.walletAddress, mono: true },
                  { label: "Network", value: "Arc Testnet" },
                  { label: "Asset", value: "USDC" },
                  { label: "Payment amount", value: `${draft.amount} USDC` },
                  { label: "Network fee", value: "Shown by wallet before signing" },
                  { label: "Estimated total", value: `${draft.amount} USDC + wallet network fee` },
                  { label: "Delivery", value: "Immediate wallet-to-wallet transfer" },
                ]}
                progress={[
                  { label: "Wallet connected", state: address ? "complete" : "pending" },
                  {
                    label: "Arc network verified",
                    state: chainId === arcTestnet.id ? "complete" : "pending",
                  },
                  {
                    label: "Recipient wallet checked",
                    state: isAddress(draft.walletAddress) ? "complete" : "pending",
                  },
                  {
                    label: "Final approval",
                    state: finalConfirmed ? "complete" : "pending",
                  },
                  {
                    label: "Wallet approval",
                    state:
                      status === "sending"
                        ? "active"
                        : pending
                          ? "complete"
                          : "pending",
                  },
                  {
                    label: "Transaction broadcast",
                    state:
                      pending
                        ? "complete"
                        : status === "sending"
                          ? "active"
                          : "pending",
                  },
                  {
                    label: "Arc confirmation & receipt",
                    state: pending ? "active" : "pending",
                  },
                ]}
                confirmed={finalConfirmed}
                onConfirmedChange={setFinalConfirmed}
                confirmationDisabled={navigationDisabled}
                confirmationText="I have reviewed the recipient wallet, exact USDC amount, Arc Testnet network and the fact that the wallet will show the network fee before signing."
              >
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
                  Send Now transfers USDC directly to the recipient. It does not
                  create a timed Gift Vault and there is no later claim step.
                </div>
              </UnifiedTransactionReview>
            )}

            {step === 4 && notice && (
              <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-950">
                  Transaction status
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-800">
                  {notice}
                </p>

                {pending && (
                  <div className="mt-4">
                    <p className="break-all font-mono text-[11px] text-blue-900/80">
                      {pending.txHash}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void retryConfirmation()}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-950 px-4 text-xs font-semibold text-white"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry confirmation
                      </button>

                      <a
                        href={`${ARC_TESTNET_EXPLORER_URL}/tx/${pending.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 text-xs font-semibold text-blue-950"
                      >
                        Open on ArcScan
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 4 && error && (
              <div
                role="alert"
                className="mt-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
              >
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                <div>
                  <p className="text-sm font-semibold text-rose-950">
                    Send Now transaction not completed
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
                disabled={step === 1 || navigationDisabled}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={navigationDisabled}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void executeSendNow()}
                  disabled={navigationDisabled || !finalConfirmed}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-700 px-6 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {status === "sending" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {pending
                    ? "Existing transaction pending"
                    : status === "sending"
                      ? "Confirm in wallet..."
                      : !finalConfirmed
                        ? "Review & confirm details"
                        : "Send USDC Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
