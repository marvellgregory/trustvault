"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  LoaderCircle,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { arcTestnet } from "viem/chains";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi";

import type {
  BillSplit,
  BillSplitParticipant,
} from "@/components/bill-split/types";
import { UnifiedTransactionReview } from "@/components/transaction-review/UnifiedTransactionReview";
import { browserBillSplitRepository } from "@/lib/bill-split/bill-repository";
import {
  confirmBillSplitPayment,
  readBillSplitFundingState,
  submitBillSplitPayment,
  type BillSplitFundingState,
  type BillSplitPaymentResult,
} from "@/lib/bill-split/pay-participant-share";
import { billSplitPaymentRecovery } from "@/lib/bill-split/payment-recovery";
import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";

function shortAddress(value: string) {
  if (value.length < 12) return value;
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

function sameAddress(left?: string, right?: string) {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

type PaymentStatus =
  | "idle"
  | "checking"
  | "sending"
  | "confirming"
  | "success"
  | "error";

export function BillSplitPaymentView({
  billId,
  participantId,
}: {
  billId: string;
  participantId: string;
}) {
  const transactionReadiness = useWalletTransactionReadiness();
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [bill, setBill] = useState<BillSplit | null>(null);
  const [participant, setParticipant] =
    useState<BillSplitParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] =
    useState<BillSplitFundingState | null>(null);
  const [status, setStatus] =
    useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] =
    useState<BillSplitPaymentResult | null>(null);
  const [pendingHash, setPendingHash] =
    useState<`0x${string}` | null>(null);
  const [finalConfirmed, setFinalConfirmed] =
    useState(false);

  async function reloadBill() {
    const record =
      await browserBillSplitRepository.findById(billId);

    setBill(record);

    setParticipant(
      record?.participants.find(
        (row) => row.id === participantId,
      ) ?? null,
    );

    return record;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const record =
        await browserBillSplitRepository.findById(billId);

      if (!active) return;

      setBill(record);

      setParticipant(
        record?.participants.find(
          (row) => row.id === participantId,
        ) ?? null,
      );

      const pending =
        billSplitPaymentRecovery.get(
          billId,
          participantId,
        );

      if (pending) {
        setPendingHash(pending.txHash);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [billId, participantId]);

  useEffect(() => {
    setFinalConfirmed(false);
  }, [
    address,
    chainId,
    participant?.walletAddress,
    participant?.amount,
    bill?.organizerAddress,
  ]);

  const walletMatches = useMemo(
    () => sameAddress(address, participant?.walletAddress),
    [address, participant?.walletAddress],
  );

  const organizerSelfShare = useMemo(
    () =>
      sameAddress(
        participant?.walletAddress,
        bill?.organizerAddress,
      ),
    [participant?.walletAddress, bill?.organizerAddress],
  );

  const alreadyPaid = participant?.status === "paid";

  async function copyOrganizerWallet() {
    if (!bill) return;
    await navigator.clipboard.writeText(
      bill.organizerAddress,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function checkFunding() {
    if (
      !publicClient ||
      !address ||
      !participant ||
      !walletMatches
    ) {
      return;
    }

    setStatus("checking");
    setError(null);

    try {
      const state = await readBillSplitFundingState({
        publicClient,
        payerAddress: address,
        amountBaseUnits: BigInt(
          participant.amountBaseUnits,
        ),
      });

      setFunding(state);
      setStatus("idle");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "USDC balance could not be checked.",
      );
      setStatus("error");
    }
  }

  async function payShare() {
    if (
      !publicClient ||
      !walletClient ||
      !address ||
      !chainId ||
      !bill ||
      !participant
    ) {
      setError(
        "Connect the participant wallet before paying.",
      );
      return;
    }

    if (!walletMatches) {
      setError(
        "The connected wallet does not match this participant.",
      );
      return;
    }

    if (alreadyPaid || organizerSelfShare) {
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const response = await submitBillSplitPayment({
        publicClient,
        walletClient,
        chainId,
        billId: bill.id,
        participantId: participant.id,
        connectedAddress: address,
        participantAddress:
          participant.walletAddress,
        organizerAddress: bill.organizerAddress,
        amountBaseUnits: BigInt(
          participant.amountBaseUnits,
        ),
        readinessAuthority: transactionReadiness.authority,
      });

      setResult(response);
      setPendingHash(null);
      setStatus("success");
      await reloadBill();
    } catch (caughtError) {
      const pending =
        billSplitPaymentRecovery.get(
          billId,
          participantId,
        );

      if (pending) {
        setPendingHash(pending.txHash);
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Bill Split payment could not be completed.",
      );
      setStatus("error");
    }
  }

  async function retryConfirmation() {
    if (!publicClient) return;

    const pending =
      billSplitPaymentRecovery.get(
        billId,
        participantId,
      );

    if (!pending) {
      setError(
        "No pending Bill Split transaction was found in this browser.",
      );
      return;
    }

    setStatus("confirming");
    setError(null);
    setPendingHash(pending.txHash);

    try {
      const response =
        await confirmBillSplitPayment({
          publicClient,
          pendingPayment: pending,
        });

      setResult(response);
      setPendingHash(null);
      setStatus("success");
      await reloadBill();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Transaction confirmation is temporarily unavailable.",
      );
      setStatus("error");
    }
  }

  if (loading) {
    return (
      <section className="section-shell py-16">
        <p className="text-center text-sm text-zinc-500">
          Loading payment obligation…
        </p>
      </section>
    );
  }

  if (!bill || !participant) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)]">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Payment link not available.
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            This Bill Split is not stored in this browser.
            Bill Split V1 still uses local browser storage.
          </p>

          <Link
            href="/bill-split"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
          >
            Back to Bill Split
          </Link>
        </div>
      </section>
    );
  }

  const explorerUrl =
    result?.explorerUrl ??
    participant.explorerUrl ??
    (pendingHash
      ? `https://testnet.arcscan.app/tx/${pendingHash}`
      : null);

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
            Bill Split payment
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950">
            {participant.name}, your share is{" "}
            {participant.amount} USDC.
          </h1>

          <p className="mt-4 text-sm leading-7 text-zinc-600">
            Bill: <strong>{bill.title}</strong>
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={ReceiptText}
              label="Bill ID"
              value={bill.id}
            />

            <InfoCard
              icon={WalletCards}
              label="Expected participant wallet"
              value={shortAddress(
                participant.walletAddress,
              )}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Organizer settlement wallet
            </p>

            <p className="mt-3 break-all font-mono text-xs font-semibold text-zinc-800">
              {bill.organizerAddress}
            </p>

            <button
              type="button"
              onClick={() => void copyOrganizerWallet()}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy organizer wallet"}
            </button>
          </div>

          <div
            className={`mt-6 rounded-3xl border p-5 ${
              !isConnected
                ? "border-amber-200 bg-amber-50"
                : walletMatches
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  !isConnected
                    ? "text-amber-700"
                    : walletMatches
                      ? "text-emerald-700"
                      : "text-rose-700"
                }`}
              />

              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  {!isConnected
                    ? "Connect the participant wallet"
                    : walletMatches
                      ? "Participant wallet verified"
                      : "Different wallet connected"}
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-700">
                  {!isConnected
                    ? "Use the TrustVault wallet control in the header to connect."
                    : walletMatches
                      ? `Connected wallet ${shortAddress(address ?? "")} matches this participant obligation.`
                      : `This payment obligation belongs to ${shortAddress(participant.walletAddress)}.`}
                </p>
              </div>
            </div>
          </div>

          {!alreadyPaid && !organizerSelfShare && (
            <div className="mt-6">
              <UnifiedTransactionReview
                eyebrow="Final payment review"
                title="Review participant settlement"
                description="Verify the participant wallet, organizer settlement destination, exact share and Arc Testnet before approving the transfer."
                summary={[
                  { label: "Bill", value: bill.title },
                  { label: "Participant", value: participant.name },
                  {
                    label: "Participant wallet",
                    value: participant.walletAddress,
                    mono: true,
                  },
                  {
                    label: "Settlement destination",
                    value: bill.organizerAddress,
                    mono: true,
                  },
                  { label: "Network", value: "Arc Testnet" },
                  { label: "Asset", value: "USDC" },
                  {
                    label: "Participant share",
                    value: `${participant.amount} USDC`,
                  },
                  {
                    label: "Network fee",
                    value: "Shown by wallet before signing",
                  },
                  {
                    label: "Estimated total",
                    value: `${participant.amount} USDC + wallet network fee`,
                  },
                ]}
                progress={[
                  {
                    label: "Wallet connected",
                    state: isConnected ? "complete" : "pending",
                  },
                  {
                    label: "Participant wallet verified",
                    state: walletMatches ? "complete" : "pending",
                  },
                  {
                    label: "Arc network verified",
                    state:
                      chainId === arcTestnet.id ? "complete" : "pending",
                  },
                  {
                    label: "Organizer wallet checked",
                    state: bill.organizerAddress ? "complete" : "pending",
                  },
                  {
                    label: "USDC funding checked",
                    state:
                      funding
                        ? funding.hasEnough
                          ? "complete"
                          : "pending"
                        : status === "checking"
                          ? "active"
                          : "pending",
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
                        : pendingHash ||
                            result ||
                            participant.transactionHash
                          ? "complete"
                          : "pending",
                  },
                  {
                    label: "Transaction broadcast",
                    state:
                      pendingHash ||
                      result ||
                      participant.transactionHash
                        ? "complete"
                        : status === "sending"
                          ? "active"
                          : "pending",
                  },
                  {
                    label: "Arc confirmation & bill status",
                    state:
                      alreadyPaid
                        ? "complete"
                        : pendingHash || status === "confirming"
                          ? "active"
                          : "pending",
                  },
                ]}
                confirmed={finalConfirmed}
                onConfirmedChange={setFinalConfirmed}
                confirmationDisabled={
                  status === "sending" ||
                  status === "confirming" ||
                  Boolean(pendingHash)
                }
                confirmationText="I have reviewed my participant wallet, exact USDC share, organizer settlement wallet, Arc Testnet and the wallet-displayed network fee before signing."
              />
            </div>
          )}

          {alreadyPaid && (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Share settled
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    {participant.settlementType === "organizer-self-share"
                      ? "This participant is the organizer, so this share is treated as self-settled and no transfer is required."
                      : "The Arc Testnet USDC transaction confirmed and this participant is marked paid."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!alreadyPaid && walletMatches && !organizerSelfShare && (
            <div className="mt-6 rounded-3xl border border-zinc-200 p-5">
              <p className="text-sm font-semibold text-zinc-950">
                Arc Testnet funding check
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Verify this wallet has enough Arc Testnet USDC before submitting the exact participant share.
              </p>

              <button
                type="button"
                onClick={() => void checkFunding()}
                disabled={status === "checking"}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-950 disabled:opacity-50"
              >
                {status === "checking" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Check USDC
              </button>

              {funding && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-500">Wallet USDC</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-950">
                      {funding.balance} USDC
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-500">Funding</p>
                    <p className={`mt-1 text-sm font-semibold ${
                      funding.hasEnough
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}>
                      {funding.hasEnough
                        ? "Enough for this share"
                        : "Insufficient USDC"}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void payShare()}
                disabled={
                  !funding?.hasEnough ||
                  !finalConfirmed ||
                  status === "sending" ||
                  status === "confirming"
                }
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "sending" ||
                status === "confirming" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ReceiptText className="h-4 w-4" />
                )}

                {status === "sending"
                  ? "Confirm in wallet…"
                  : status === "confirming"
                    ? "Confirming on Arc…"
                    : !finalConfirmed
                      ? "Review & confirm details"
                      : `Pay ${participant.amount} USDC`}
              </button>
            </div>
          )}

          {pendingHash && !alreadyPaid && (
            <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-950">
                Payment transaction submitted
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-800">
                TrustVault preserved the transaction hash. Do not submit a second payment while confirmation is pending.
              </p>

              <p className="mt-3 break-all font-mono text-[11px] text-blue-800">
                {pendingHash}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void retryConfirmation()}
                  disabled={status === "confirming"}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-950 px-4 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Retry confirmation
                </button>

                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 text-xs font-semibold text-blue-950"
                  >
                    Open on ArcScan
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5"
            >
              <p className="text-sm font-semibold text-rose-950">
                Payment not completed
              </p>
              <p className="mt-1 text-xs leading-5 text-rose-800">
                {error}
              </p>
            </div>
          )}

          {(result || participant.transactionHash) && alreadyPaid && (
            <div className="mt-6 rounded-3xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Transaction receipt
              </p>

              <p className="mt-3 break-all font-mono text-xs text-zinc-700">
                {result?.txHash ??
                  participant.transactionHash}
              </p>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
                >
                  View on ArcScan
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs leading-5 text-amber-800">
              Arc Testnet assets have no real-world value. Review the wallet, amount and network before confirming.
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <Link
              href={`/bill-split/manage/${encodeURIComponent(bill.id)}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to bill
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">
          {label}
        </p>
      </div>

      <p className="mt-3 break-all text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}
