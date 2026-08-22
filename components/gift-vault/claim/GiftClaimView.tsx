"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gift,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi";

import { GiftClaimReceipt } from "@/components/gift-vault/claim/GiftClaimReceipt";
import { GiftVaultPrivateMessage } from "@/components/gift-vault/claim/GiftVaultPrivateMessage";
import {
  ARC_TESTNET_EXPLORER_URL,
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
} from "@/lib/gift-vault/contract";
import {
  claimGift,
  confirmGiftClaim,
  GiftClaimConfirmationPendingError,
  type GiftClaimResult,
  type PendingGiftClaim,
} from "@/lib/gift-vault/claim-gift";
import {
  formatGiftAmount,
  formatGiftUnlockFromChain,
  isSameAddress,
  normalizeGift,
  shortAddress,
  type NormalizedGift,
} from "@/lib/gift-vault/gift-display";
import {
  readGiftClaimable,
  readTimedGift,
} from "@/lib/gift-vault/read-gift";
import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";

const PENDING_CLAIM_KEY =
  "trustvault:gift-vault:pending-claim";

function readPendingClaim(
  giftId: string,
): PendingGiftClaim | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        PENDING_CLAIM_KEY,
      );

    if (!raw) {
      return null;
    }

    const pending =
      JSON.parse(raw) as PendingGiftClaim;

    return pending.giftId === giftId
      ? pending
      : null;
  } catch {
    return null;
  }
}

type LoadState =
  | "loading"
  | "ready"
  | "error";

export function GiftClaimView({
  giftId,
}: {
  giftId: string;
}) {
  const transactionReadiness = useWalletTransactionReadiness();
  const { address, chainId, isConnected } =
    useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } =
    useWalletClient();

  const parsedGiftId = useMemo(() => {
    try {
      const value = BigInt(giftId);
      return value > BigInt(0)
        ? value
        : null;
    } catch {
      return null;
    }
  }, [giftId]);

  const [gift, setGift] =
    useState<NormalizedGift | null>(null);
  const [claimable, setClaimable] =
    useState(false);
  const [loadState, setLoadState] =
    useState<LoadState>("loading");
  const [error, setError] =
    useState<string | null>(null);
  const [pendingClaim, setPendingClaim] =
    useState<PendingGiftClaim | null>(
      () => readPendingClaim(giftId),
    );
  const [notice, setNotice] =
    useState<string | null>(
      () =>
        readPendingClaim(giftId)
          ? "A claim transaction for this gift was already submitted. TrustVault will only retry confirmation."
          : null,
    );
  const [claimResult, setClaimResult] =
    useState<GiftClaimResult | null>(
      null,
    );
  const [isClaiming, setIsClaiming] =
    useState(false);

  const refreshGift = useCallback(
    async () => {
      if (!publicClient || !parsedGiftId) {
        return;
      }

      setLoadState("loading");
      setError(null);

      try {
        const [rawGift, canClaim] =
          await Promise.all([
            readTimedGift(
              publicClient,
              parsedGiftId,
            ),
            readGiftClaimable(
              publicClient,
              parsedGiftId,
            ),
          ]);

        const normalized =
          normalizeGift(rawGift);

        setGift(normalized);
        setClaimable(Boolean(canClaim));
        setLoadState("ready");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Gift could not be loaded from Arc Testnet.",
        );
        setLoadState("error");
      }
    },
    [parsedGiftId, publicClient],
  );

  useEffect(() => {
    if (!publicClient || !parsedGiftId) {
      return;
    }

    const activePublicClient =
      publicClient;
    const activeGiftId =
      parsedGiftId;

    let cancelled = false;

    async function loadGift() {
      try {
        const [rawGift, canClaim] =
          await Promise.all([
            readTimedGift(
              activePublicClient,
              activeGiftId,
            ),
            readGiftClaimable(
              activePublicClient,
              activeGiftId,
            ),
          ]);

        if (cancelled) {
          return;
        }

        const normalized =
          normalizeGift(rawGift);

        setGift(normalized);
        setClaimable(Boolean(canClaim));
        setError(null);
        setLoadState("ready");
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Gift could not be loaded from Arc Testnet.",
        );
        setLoadState("error");
      }
    }

    void loadGift();

    return () => {
      cancelled = true;
    };
  }, [
    parsedGiftId,
    publicClient,
  ]);

  const connectedIsRecipient =
    gift
      ? isSameAddress(
          address,
          gift.recipient,
        )
      : false;

  const timeZone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat()
          .resolvedOptions().timeZone ||
        "UTC"
      : "UTC";

  const unlock = gift
    ? formatGiftUnlockFromChain(
        gift.unlockTimestamp,
        timeZone,
      )
    : null;

  async function handleClaim() {
    if (
      !gift ||
      !parsedGiftId ||
      !address ||
      !chainId ||
      !publicClient ||
      !walletClient
    ) {
      setError(
        "Connect the recipient wallet on Arc Testnet before claiming.",
      );
      return;
    }

    if (pendingClaim) {
      setNotice(
        "A claim already exists for this gift. Retry confirmation instead of sending another claim.",
      );
      return;
    }

    setIsClaiming(true);
    setError(null);
    setNotice(null);

    try {
      const result = await claimGift({
        publicClient,
        walletClient,
        giftId: parsedGiftId,
        connectedAddress: address,
        chainId,
        readinessAuthority: transactionReadiness.authority,
        onSubmitted(pending) {
          setPendingClaim(pending);
          setNotice(
            "Claim submitted. TrustVault is confirming the existing transaction.",
          );

          if (
            typeof window !==
            "undefined"
          ) {
            window.localStorage.setItem(
              PENDING_CLAIM_KEY,
              JSON.stringify(pending),
            );
          }
        },
      });

      if (
        typeof window !== "undefined"
      ) {
        window.localStorage.removeItem(
          PENDING_CLAIM_KEY,
        );
      }

      setPendingClaim(null);
      setClaimResult(result);
      setNotice(null);
      await refreshGift();
    } catch (caughtError) {
      if (
        caughtError instanceof
        GiftClaimConfirmationPendingError
      ) {
        setPendingClaim(
          caughtError.pending,
        );
        setNotice(caughtError.message);
        setError(null);
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Gift claim failed.",
      );
    } finally {
      setIsClaiming(false);
    }
  }

  async function handleRetryConfirmation() {
    if (!publicClient || !pendingClaim) {
      return;
    }

    setIsClaiming(true);
    setError(null);
    setNotice(
      "Checking the existing claim transaction. No new claim will be submitted.",
    );

    try {
      const result =
        await confirmGiftClaim(
          publicClient,
          pendingClaim,
        );

      if (
        typeof window !== "undefined"
      ) {
        window.localStorage.removeItem(
          PENDING_CLAIM_KEY,
        );
      }

      setPendingClaim(null);
      setClaimResult(result);
      setNotice(null);
      await refreshGift();
    } catch (caughtError) {
      if (
        caughtError instanceof
        GiftClaimConfirmationPendingError
      ) {
        setNotice(caughtError.message);
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Claim confirmation check failed.",
      );
    } finally {
      setIsClaiming(false);
    }
  }

  if (!parsedGiftId) {
    return (
      <StateCard
        icon={CircleAlert}
        eyebrow="Invalid Gift"
        title="That Gift Vault ID is invalid."
        description="Open a valid TrustVault Gift Vault claim link."
        tone="error"
      />
    );
  }

  if (
    claimResult &&
    gift
  ) {
    return (
      <GiftClaimReceipt
        giftId={giftId}
        recipientAddress={
          gift.recipient
        }
        amountBaseUnits={
          gift.amount
        }
        result={claimResult}
        onDone={() => {
          setClaimResult(null);
          void refreshGift();
        }}
      />
    );
  }

  if (loadState === "loading") {
    return (
      <StateCard
        icon={LoaderCircle}
        eyebrow={`Gift #${giftId}`}
        title="Reading Gift Vault state…"
        description="TrustVault is reading the deployed Arc Testnet contract."
        tone="neutral"
        spinning
      />
    );
  }

  if (loadState === "error" || !gift) {
    return (
      <StateCard
        icon={CircleAlert}
        eyebrow={`Gift #${giftId}`}
        title="Gift could not be loaded."
        description={
          error ||
          "Arc Testnet did not return the Gift Vault state."
        }
        tone="error"
        action={
          <button
            type="button"
            onClick={() =>
              void refreshGift()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
        }
      />
    );
  }

  const alreadyClaimed =
    gift.claimed;

  const wrongWallet =
    isConnected &&
    !connectedIsRecipient;

  const locked =
    !gift.claimed &&
    !claimable;

  const ready =
    !gift.claimed &&
    claimable &&
    connectedIsRecipient;

  return (
    <section className="section-shell py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[var(--tv-shadow-lg)]">
        <div className="border-b border-zinc-200 px-6 py-8 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tv-brand)]">
            Received Gift Vault
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-5xl">
                Gift #{giftId}
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Read directly from the verified TrustVault timed Gift Vault contract on Arc Testnet.
              </p>
            </div>

            <a
              href={`${ARC_TESTNET_EXPLORER_URL}/address/${TRUSTVAULT_GIFT_VAULT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-950"
            >
              View vault
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={Gift}
              label="Amount"
              value={`${formatGiftAmount(gift.amount)} USDC`}
            />
            <InfoCard
              icon={Clock3}
              label="Unlock"
              value={
                unlock?.local ||
                gift.unlockTimestamp.toString()
              }
            />
            <InfoCard
              icon={WalletCards}
              label="Sender"
              value={shortAddress(gift.sender)}
            />
            <InfoCard
              icon={WalletCards}
              label="Recipient"
              value={shortAddress(gift.recipient)}
            />
          </div>

          <div className="mt-6">
            {alreadyClaimed && (
              <StatusPanel
                icon={CheckCircle2}
                title="Already claimed"
                description="This Gift Vault has already released its USDC to the recipient."
                tone="success"
              />
            )}

            {!alreadyClaimed &&
              !isConnected && (
                <StatusPanel
                  icon={WalletCards}
                  title="Connect the recipient wallet"
                  description="Connect the wallet assigned as recipient to determine whether this gift can be claimed."
                  tone="neutral"
                />
              )}

            {wrongWallet && (
              <StatusPanel
                icon={ShieldAlert}
                title="Different wallet connected"
                description={`This gift can only be claimed by ${shortAddress(gift.recipient)}.`}
                tone="error"
              />
            )}

            {locked &&
              !wrongWallet &&
              isConnected && (
                <StatusPanel
                  icon={LockKeyhole}
                  title="Gift still locked"
                  description={`The contract does not permit claim yet. Scheduled unlock: ${unlock?.local ?? gift.unlockTimestamp.toString()}.`}
                  tone="locked"
                />
              )}

            {ready && (
              <StatusPanel
                icon={Gift}
                title="Gift ready to claim"
                description="The connected wallet matches the recipient and the contract currently reports this gift as claimable."
                tone="success"
              />
            )}
          </div>

          {notice && (
            <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-950">
                Claim transaction status
              </p>
              <p className="mt-2 text-xs leading-5 text-blue-800">
                {notice}
              </p>

              {pendingClaim && (
                <>
                  <p className="mt-3 break-all font-mono text-[11px] text-blue-900/80">
                    {pendingClaim.txHash}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleRetryConfirmation}
                      disabled={isClaiming}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-950 px-4 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Retry confirmation
                    </button>

                    <a
                      href={`${ARC_TESTNET_EXPLORER_URL}/tx/${pendingClaim.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 text-xs font-semibold text-blue-950"
                    >
                      Open on ArcScan
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-sm font-semibold text-rose-950">
                Claim not completed
              </p>
              <p className="mt-2 text-xs leading-5 text-rose-800">
                {error}
              </p>
            </div>
          )}

          <GiftVaultPrivateMessage
            giftId={giftId}
            connectedIsRecipient={connectedIsRecipient}
          />

          <div className="mt-8 flex flex-wrap gap-3 border-t border-zinc-200 pt-6">
            <button
              type="button"
              onClick={() =>
                void refreshGift()
              }
              disabled={isClaiming}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh state
            </button>

            {ready && !pendingClaim && (
              <button
                type="button"
                onClick={handleClaim}
                disabled={isClaiming}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tv-brand)] px-6 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isClaiming ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                {isClaiming
                  ? "Confirm claim…"
                  : `Claim ${formatGiftAmount(gift.amount)} USDC`}
              </button>
            )}
          </div>

          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Claimability is determined by the deployed smart contract. TrustVault does not release funds from a frontend timer.
          </p>
        </div>
      </div>
    </section>
  );
}

function StateCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  tone,
  spinning,
  action,
}: {
  icon: typeof Gift;
  eyebrow: string;
  title: string;
  description: string;
  tone: "neutral" | "error";
  spinning?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <section className="section-shell py-16">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-12">
        <Icon
          className={`mx-auto h-8 w-8 ${
            spinning
              ? "animate-spin"
              : ""
          } ${
            tone === "error"
              ? "text-rose-700"
              : "text-zinc-700"
          }`}
        />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600">
          {description}
        </p>
        {action && (
          <div className="mt-6">
            {action}
          </div>
        )}
      </div>
    </section>
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
        <p className="text-xs font-medium">
          {label}
        </p>
      </div>
      <p className="mt-3 break-words text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function StatusPanel({
  icon: Icon,
  title,
  description,
  tone,
}: {
  icon: typeof Gift;
  title: string;
  description: string;
  tone:
    | "success"
    | "error"
    | "locked"
    | "neutral";
}) {
  const classes = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    error:
      "border-rose-200 bg-rose-50 text-rose-900",
    locked:
      "border-amber-200 bg-amber-50 text-amber-900",
    neutral:
      "border-zinc-200 bg-zinc-50 text-zinc-900",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${classes}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            {title}
          </p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
