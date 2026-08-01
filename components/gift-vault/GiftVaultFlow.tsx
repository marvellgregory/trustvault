"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Gift,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type GiftData = {
  recipientName: string;
  walletAddress: string;
  amount: string;
  unlockDate: string;
  message: string;
};

const initialData: GiftData = {
  recipientName: "",
  walletAddress: "",
  amount: "",
  unlockDate: "",
  message: "",
};

const steps = [
  { id: 1, label: "Recipient", icon: UserRound },
  { id: 2, label: "Amount", icon: WalletCards },
  { id: 3, label: "Unlock", icon: CalendarDays },
  { id: 4, label: "Message", icon: MessageSquareText },
  { id: 5, label: "Review", icon: ShieldCheck },
];

function isValidWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isPositiveAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

export function GiftVaultFlow() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<GiftData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return (
        data.recipientName.trim().length >= 2 &&
        isValidWalletAddress(data.walletAddress)
      );
    }

    if (step === 2) return isPositiveAmount(data.amount);
    if (step === 3) return Boolean(data.unlockDate) && data.unlockDate >= today;
    if (step === 4) return data.message.trim().length <= 240;
    return true;
  }, [data, step, today]);

  function updateField<K extends keyof GiftData>(field: K, value: GiftData[K]) {
    setData((current) => ({ ...current, [field]: value }));
  }

  function nextStep() {
    if (!canContinue) {
      setTouched({
        recipientName: true,
        walletAddress: true,
        amount: true,
        unlockDate: true,
      });
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <section className="section-shell py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-50 text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
          </span>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Prototype complete
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
            Your Gift Vault draft is ready.
          </h2>
          <p className="mt-5 text-base leading-8 text-zinc-600">
            No transaction has been sent. This confirms the frontend flow only.
            Wallet signing and Arc Testnet transaction proof will be added later.
          </p>

          <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-left">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Recipient</dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  {data.recipientName}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Amount</dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  {data.amount} USDC
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Unlock date</dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  {data.unlockDate}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Network</dt>
                <dd className="mt-1 font-semibold text-zinc-950">
                  Arc Testnet
                </dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={() => {
              setData(initialData);
              setStep(1);
              setSubmitted(false);
              setTouched({});
            }}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            Create another draft
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Progress
            </p>

            <ol className="mt-6 space-y-3">
              {steps.map(({ id, label, icon: Icon }) => {
                const isCurrent = step === id;
                const isComplete = step > id;

                return (
                  <li key={id}>
                    <div
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                        isCurrent
                          ? "bg-zinc-950 text-white"
                          : isComplete
                            ? "bg-emerald-50 text-emerald-800"
                            : "text-zinc-500"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isCurrent
                            ? "bg-white/10"
                            : isComplete
                              ? "bg-white"
                              : "bg-zinc-100"
                        }`}
                      >
                        {isComplete ? (
                          <Check aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
                          Step {id}
                        </p>
                        <p className="truncate text-sm font-semibold">{label}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              This is a frontend prototype. No wallet or USDC action is connected yet.
            </div>
          </div>
        </aside>

        <form onSubmit={submitGift} className="min-w-0">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
            {step === 1 && (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
                  <UserRound aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Recipient
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
                  Who is this gift for?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                  Add a name you recognize and the wallet address that will receive
                  the future Gift Vault.
                </p>

                <div className="mt-8 grid gap-6">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-zinc-800">
                      Recipient name
                    </span>
                    <input
                      value={data.recipientName}
                      onChange={(event) =>
                        updateField("recipientName", event.target.value)
                      }
                      onBlur={() =>
                        setTouched((current) => ({
                          ...current,
                          recipientName: true,
                        }))
                      }
                      placeholder="e.g. Maya"
                      className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
                    />
                    {touched.recipientName &&
                      data.recipientName.trim().length < 2 && (
                        <span className="text-sm text-rose-700">
                          Enter a recipient name.
                        </span>
                      )}
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-zinc-800">
                      Recipient wallet address
                    </span>
                    <input
                      value={data.walletAddress}
                      onChange={(event) =>
                        updateField("walletAddress", event.target.value)
                      }
                      onBlur={() =>
                        setTouched((current) => ({
                          ...current,
                          walletAddress: true,
                        }))
                      }
                      placeholder="0x..."
                      autoComplete="off"
                      className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 font-mono text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
                    />
                    {touched.walletAddress &&
                      !isValidWalletAddress(data.walletAddress) && (
                        <span className="text-sm text-rose-700">
                          Enter a valid 42-character EVM wallet address.
                        </span>
                      )}
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
                  <WalletCards aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Amount
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
                  How much USDC would you like to gift?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                  The MVP will use USDC on Arc Testnet. A live balance check will
                  be added when wallet integration begins.
                </p>

                <div className="mt-8 max-w-xl">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-zinc-800">
                      Gift amount
                    </span>
                    <div className="flex min-h-16 items-center rounded-2xl border border-zinc-300 bg-white px-4 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/5">
                      <input
                        value={data.amount}
                        onChange={(event) => updateField("amount", event.target.value)}
                        onBlur={() =>
                          setTouched((current) => ({ ...current, amount: true }))
                        }
                        placeholder="0.00"
                        inputMode="decimal"
                        className="min-w-0 flex-1 bg-transparent text-3xl font-semibold tracking-[-0.04em] text-zinc-950 outline-none placeholder:text-zinc-300"
                      />
                      <span className="ml-3 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700">
                        USDC
                      </span>
                    </div>
                    {touched.amount && !isPositiveAmount(data.amount) && (
                      <span className="text-sm text-rose-700">
                        Enter an amount greater than zero.
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
                  <CalendarDays aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Unlock date
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
                  When should the gift unlock?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                  Choose today for an immediate gift draft, or a future date for a
                  time-based Gift Vault concept.
                </p>

                <label className="mt-8 grid max-w-xl gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    Unlock date
                  </span>
                  <input
                    type="date"
                    min={today}
                    value={data.unlockDate}
                    onChange={(event) =>
                      updateField("unlockDate", event.target.value)
                    }
                    onBlur={() =>
                      setTouched((current) => ({
                        ...current,
                        unlockDate: true,
                      }))
                    }
                    className="min-h-13 rounded-2xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
                  />
                  {touched.unlockDate &&
                    (!data.unlockDate || data.unlockDate < today) && (
                      <span className="text-sm text-rose-700">
                        Choose today or a future date.
                      </span>
                    )}
                </label>
              </div>
            )}

            {step === 4 && (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
                  <MessageSquareText aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Personal message
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
                  Add a note they will remember.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                  This step is optional. Keep the note short, personal and suitable
                  for the recipient.
                </p>

                <label className="mt-8 grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    Gift message
                  </span>
                  <textarea
                    rows={6}
                    maxLength={240}
                    value={data.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="A little something for your next big moment."
                    className="resize-none rounded-2xl border border-zinc-300 bg-white p-4 text-base leading-7 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5"
                  />
                  <span className="text-right text-xs text-zinc-500">
                    {data.message.length}/240
                  </span>
                </label>
              </div>
            )}

            {step === 5 && (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Review
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
                  Check every detail before creating the draft.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                  No transaction will be sent in this milestone. This review step
                  prepares the data for the future Arc wallet flow.
                </p>

                <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200">
                  <dl className="divide-y divide-zinc-200">
                    {[
                      ["Recipient", data.recipientName],
                      ["Wallet", data.walletAddress],
                      ["Amount", `${data.amount} USDC`],
                      ["Unlock date", data.unlockDate],
                      ["Network", "Arc Testnet"],
                      ["Message", data.message || "No message added"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="grid gap-2 bg-white px-5 py-4 sm:grid-cols-[10rem_1fr]"
                      >
                        <dt className="text-sm font-medium text-zinc-500">{label}</dt>
                        <dd className="min-w-0 break-words text-sm font-semibold text-zinc-950">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Creating this draft does not move USDC. Wallet connection,
                  signing, transaction status and explorer proof come later.
                </div>
              </div>
            )}

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

              {step < steps.length ? (
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
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--tv-brand-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tv-brand)] focus-visible:ring-offset-4"
                >
                  <Gift aria-hidden="true" className="h-4 w-4" />
                  Create Gift Vault draft
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
