"use client";

import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  LoaderCircle,
  RefreshCcw,
  Send,
  Share2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import {
  ARC_TESTNET_EXPLORER_URL,
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
} from "@/lib/gift-vault/contract";
import {
  formatGiftAmount,
  formatGiftUnlockFromChain,
  isSameAddress,
  shortAddress,
} from "@/lib/gift-vault/gift-display";
import {
  readTimedGift,
  readGiftClaimable,
} from "@/lib/gift-vault/read-gift";

type LoadedGift = {
  id: bigint;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  unlockTimestamp: bigint;
  claimed: boolean;
  claimable: boolean;
};

function parseGiftId(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error("Gift ID must be a positive whole number.");
  }

  const parsed = BigInt(value);

  if (parsed <= BigInt(0)) {
    throw new Error("Gift ID must be greater than zero.");
  }

  return parsed;
}

export function GiftVaultLifecycleView({
  giftId,
}: {
  giftId: string;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [gift, setGift] = useState<LoadedGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const timeZone = useMemo(() => {
    try {
      return (
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC"
      );
    } catch {
      return "UTC";
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!publicClient) return;

    setLoading(true);
    setError(null);

    try {
      const id = parseGiftId(giftId);

      const [record, claimable] = await Promise.all([
        readTimedGift(publicClient, id),
        readGiftClaimable(publicClient, id),
      ]);

      setGift({
        id,
        sender: record.sender,
        recipient: record.recipient,
        amount: record.amount,
        unlockTimestamp: record.unlockTimestamp,
        claimed: record.claimed,
        claimable,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Gift Vault state could not be loaded.",
      );
      setGift(null);
    } finally {
      setLoading(false);
    }
  }, [giftId, publicClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isSender = useMemo(
    () =>
      Boolean(
        address &&
          gift &&
          isSameAddress(address, gift.sender),
      ),
    [address, gift],
  );

  const isRecipient = useMemo(
    () =>
      Boolean(
        address &&
          gift &&
          isSameAddress(address, gift.recipient),
      ),
    [address, gift],
  );

  const claimPath = useMemo(
    () => `/gift-vault/claim/${encodeURIComponent(giftId)}`,
    [giftId],
  );

  async function copyValue(
    value: string,
    key: string,
  ) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  }

  async function copyClaimLink() {
    const url = new URL(
      claimPath,
      window.location.origin,
    ).toString();

    await copyValue(url, "claim-link");
  }

  async function shareClaimLink() {
    if (!gift) return;

    const url = new URL(
      claimPath,
      window.location.origin,
    ).toString();

    const shareData = {
      title: `TrustVault Gift #${gift.id.toString()}`,
      text: `A timed ${formatGiftAmount(gift.amount)} USDC Gift Vault is available for the recipient on Arc Testnet.`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fall back to copy below.
      }
    }

    await copyValue(url, "claim-link");
  }

  if (loading) {
    return (
      <section className="section-shell py-16">
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Reading Gift Vault state from Arc Testnetâ€¦
        </div>
      </section>
    );
  }

  if (error || !gift) {
    return (
      <section className="section-shell py-16">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)]">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Gift Vault not available.
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {error ?? "Gift state could not be loaded."}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>

            <Link
              href="/gift-vault/manage"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
            >
              Gift Vault Center
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const formattedAmount = formatGiftAmount(gift.amount);
  const formattedUnlock = formatGiftUnlockFromChain(
    gift.unlockTimestamp,
    timeZone,
  );

  const state = gift.claimed
    ? "claimed"
    : gift.claimable
      ? "claimable"
      : "locked";

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-md)]">
          <header className="border-b border-zinc-200 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
                  Gift Vault lifecycle
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
                  Gift #{gift.id.toString()}
                </h1>

                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Read directly from the deployed TrustVault timed Gift Vault contract on Arc Testnet.
                </p>
              </div>

              <StateBadge state={state} />
            </div>
          </header>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={Gift}
                label="Amount"
                value={`${formattedAmount} USDC`}
              />

              <InfoCard
                icon={Clock3}
                label="Unlock"
                value={formattedUnlock.local}
              />

              <InfoCard
                icon={Send}
                label="Sender"
                value={shortAddress(gift.sender)}
              />

              <InfoCard
                icon={WalletCards}
                label="Recipient"
                value={shortAddress(gift.recipient)}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />

                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    Connected wallet role
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    {!isConnected
                      ? "No wallet is connected."
                      : isRecipient
                        ? "The connected wallet is the designated recipient."
                        : isSender
                          ? "The connected wallet is the sender of this Gift Vault."
                          : "The connected wallet is neither the sender nor the recipient."}
                  </p>
                </div>
              </div>
            </div>

            {state === "locked" && (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-950">
                  Gift locked until the scheduled unlock.
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  The recipient cannot claim this Gift Vault until the contract reports it as claimable.
                </p>
              </div>
            )}

            {state === "claimable" && (
              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-emerald-950">
                  Gift ready to claim.
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  The contract currently reports this Gift Vault as claimable.
                </p>

                {isRecipient && (
                  <Link
                    href={claimPath}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-800 px-5 text-sm font-semibold text-white"
                  >
                    Open claim flow
                  </Link>
                )}
              </div>
            )}

            {state === "claimed" && (
              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-950">
                      Gift claimed.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                      The deployed contract reports this Gift Vault as claimed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(isSender || isRecipient) && !gift.claimed && (
              <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-950">
                  Recipient claim link
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-800">
                  This claim URL uses the onchain Gift ID, so the core gift state can be read in another browser or device without relying on the sender&apos;s local storage.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyClaimLink()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 text-xs font-semibold text-blue-950"
                  >
                    <Copy className="h-4 w-4" />
                    {copied === "claim-link"
                      ? "Copied"
                      : "Copy claim link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void shareClaimLink()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-950 px-4 text-xs font-semibold text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    Share claim link
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Contract verification
              </p>

              <p className="mt-3 break-all font-mono text-[11px] text-zinc-600">
                {TRUSTVAULT_GIFT_VAULT_ADDRESS}
              </p>

              <a
                href={`${ARC_TESTNET_EXPLORER_URL}/address/${TRUSTVAULT_GIFT_VAULT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 text-xs font-semibold text-zinc-950"
              >
                Open vault on ArcScan
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6">
              <Link
                href="/gift-vault/manage"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-950"
              >
                Gift Vault Center
              </Link>

              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh onchain state
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StateBadge({
  state,
}: {
  state: "locked" | "claimable" | "claimed";
}) {
  const styles =
    state === "claimed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : state === "claimable"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  const label =
    state === "claimed"
      ? "Claimed"
      : state === "claimable"
        ? "Claimable"
        : "Locked";

  return (
    <div
      className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-xs font-semibold ${styles}`}
    >
      {label}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gift;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">{label}</p>
      </div>

      <p className="mt-3 break-all text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}


