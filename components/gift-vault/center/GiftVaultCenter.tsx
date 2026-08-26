"use client";

import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gift,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  listRecentGifts,
  type IndexedGift,
} from "@/lib/gift-vault/list-gifts";

type Tab = "received" | "sent";

export function GiftVaultCenter() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [tab, setTab] = useState<Tab>("received");
  const [gifts, setGifts] = useState<IndexedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const rows = await listRecentGifts(publicClient, {
        limit: 100,
      });
      setGifts(rows);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Gift Vault history could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(initialLoad);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!address) return [];

    return gifts.filter((gift) =>
      tab === "received"
        ? isSameAddress(gift.recipient, address)
        : isSameAddress(gift.sender, address),
    );
  }, [address, gifts, tab]);

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[var(--tv-shadow-md)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
                Gift Vault Center
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-5xl">
                Track every timed gift from one place.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
                TrustVault reads the deployed Arc Testnet Gift Vault contract and
                shows gifts associated with the connected wallet.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/gift-vault"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
              >
                <Gift className="h-4 w-4" />
                Create gift
              </Link>

              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-b border-zinc-200 pb-5">
            <TabButton
              active={tab === "received"}
              onClick={() => setTab("received")}
              icon={Inbox}
            >
              Received
            </TabButton>

            <TabButton
              active={tab === "sent"}
              onClick={() => setTab("sent")}
              icon={Send}
            >
              Sent
            </TabButton>
          </div>

          {!isConnected ? (
            <EmptyPanel
              icon={WalletCards}
              title="Connect a wallet"
              description="Connect a wallet to discover timed gifts where it is the sender or recipient."
            />
          ) : loading ? (
            <EmptyPanel
              icon={LoaderCircle}
              title="Reading Gift Vault history…"
              description="TrustVault is reconciling recent gifts directly from Arc Testnet."
              spinning
            />
          ) : error ? (
            <EmptyPanel
              icon={RefreshCcw}
              title="Gift history could not be loaded."
              description={error}
            />
          ) : filtered.length === 0 ? (
            <EmptyPanel
              icon={tab === "received" ? Inbox : Send}
              title={
                tab === "received"
                  ? "No received gifts found."
                  : "No sent gifts found."
              }
              description={
                tab === "received"
                  ? "When this wallet is assigned as a Gift Vault recipient, the gift will appear here."
                  : "Timed gifts created by this wallet will appear here."
              }
            />
          ) : (
            <div className="mt-6 grid gap-4">
              {filtered.map((gift) => (
                <GiftRow
                  key={gift.giftId.toString()}
                  gift={gift}
                  perspective={tab}
                  timeZone={timeZone}
                />
              ))}
            </div>
          )}

          <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Contract-backed status
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  This V1 center reconciles the most recent 100 Gift Vault IDs
                  directly from the verified Arc Testnet contract. A future
                  indexed history service can scale discovery without changing
                  the contract as source of truth.
                </p>
                <p className="mt-3 break-all font-mono text-[11px] text-zinc-500">
                  {TRUSTVAULT_GIFT_VAULT_ADDRESS}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GiftRow({
  gift,
  perspective,
  timeZone,
}: {
  gift: IndexedGift;
  perspective: Tab;
  timeZone: string;
}) {
  const [claimable, setClaimable] = useState<boolean | null>(
    null,
  );
  const publicClient = usePublicClient();

  useEffect(() => {
    let cancelled = false;

    async function loadClaimable() {
      if (!publicClient || gift.claimed) {
        setClaimable(false);
        return;
      }

      try {
        const value = await publicClient.readContract({
          address: TRUSTVAULT_GIFT_VAULT_ADDRESS,
          abi: (
            await import("@/lib/gift-vault/contract")
          ).giftVaultAbi,
          functionName: "isClaimable",
          args: [gift.giftId],
        });

        if (!cancelled) {
          setClaimable(Boolean(value));
        }
      } catch {
        if (!cancelled) {
          setClaimable(null);
        }
      }
    }

    void loadClaimable();

    return () => {
      cancelled = true;
    };
  }, [gift.claimed, gift.giftId, publicClient]);

  const unlock = formatGiftUnlockFromChain(
    gift.unlockTimestamp,
    timeZone,
  );

  const status = gift.claimed
    ? {
        label: "Claimed",
        icon: CheckCircle2,
        classes:
          "border-emerald-200 bg-emerald-50 text-emerald-800",
      }
    : claimable
      ? {
          label: "Claimable",
          icon: Gift,
          classes:
            "border-blue-200 bg-blue-50 text-blue-800",
        }
      : {
          label: "Locked",
          icon: LockKeyhole,
          classes:
            "border-amber-200 bg-amber-50 text-amber-800",
        };

  const StatusIcon = status.icon;

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-950">
              Gift #{gift.giftId.toString()}
            </p>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${status.classes}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>

          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
            {formatGiftAmount(gift.amount)} USDC
          </p>

          <div className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
            <p>
              {perspective === "received" ? "From" : "To"}{" "}
              <span className="font-mono font-semibold text-zinc-700">
                {shortAddress(
                  perspective === "received"
                    ? gift.sender
                    : gift.recipient,
                )}
              </span>
            </p>

            <p>
              Unlock{" "}
              <span className="font-semibold text-zinc-700">
                {unlock.local}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/gift-vault/claim/${gift.giftId.toString()}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
          >
            View gift
          </Link>

          <a
            href={`${ARC_TESTNET_EXPLORER_URL}/address/${TRUSTVAULT_GIFT_VAULT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-950"
          >
            ArcScan
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
        active
          ? "bg-zinc-950 text-white"
          : "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  spinning,
}: {
  icon: typeof Gift;
  title: string;
  description: string;
  spinning?: boolean;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
      <Icon
        className={`mx-auto h-7 w-7 text-zinc-500 ${
          spinning ? "animate-spin" : ""
        }`}
      />
      <p className="mt-4 text-base font-semibold text-zinc-950">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-600">
        {description}
      </p>
    </div>
  );
}
