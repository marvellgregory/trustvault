"use client";

import {
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAccount } from "wagmi/actions";
import { useAccount, useConfig, useSignMessage } from "wagmi";

import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";
import {
  requestTrustVaultAuthChallenge,
  verifyTrustVaultAuthChallenge,
} from "@/lib/aws/auth-client";
import { authenticateTrustVaultWallet } from "@/lib/aws/wallet-auth-flow";

import {
  createSavedAddressId,
  createSavedWalletId,
  loadCustomerAccountProfile,
  saveCustomerAccountProfile,
  type CustomerAccountProfile,
  type SavedAccountAddress,
} from "@/lib/account/account-profile-store";
import {
  canCheckInToday,
  loadDailyCheckInState,
  performDailyCheckIn,
  type DailyCheckInState,
} from "@/lib/account/daily-checkin-store";
import {
  syncCustomerAccountForWallet,
  type CustomerAccountSnapshot,
} from "@/lib/account/customer-account-service";
import {
  calculateTrustScore,
} from "@/lib/account/trust-score";
import {
  browserReceiptStore,
  type StoredReceipt,
} from "@/lib/receipts/receipt-store";

type AccountTab =
  | "overview"
  | "orders"
  | "receipts"
  | "wallets"
  | "profile";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}Ã¢â‚¬Â¦${address.slice(-4)}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "Ã¢â‚¬â€";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function createBlankAddress(
  profile: CustomerAccountProfile,
): SavedAccountAddress {
  return {
    id: createSavedAddressId(),
    label: "Home",
    fullName: profile.displayName,
    email: profile.email,
    phone: profile.phone,
    addressLine1: "",
    addressLine2: "",
    city: profile.city,
    state: profile.state,
    postalCode: "",
    country: profile.country,
    defaultShipping: profile.addresses.length === 0,
    defaultBilling: profile.addresses.length === 0,
  };
}

export function CustomerAccountHub() {
  const {
    address,
    isConnected,
  } = useAccount();
  const config = useConfig();
  const { signMessageAsync } = useSignMessage();
  const transactionReadiness = useWalletTransactionReadiness();
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<AccountTab>("overview");

  const [snapshot, setSnapshot] =
    useState<CustomerAccountSnapshot | null>(null);

  const [profile, setProfile] =
    useState<CustomerAccountProfile | null>(null);

  const [checkIn, setCheckIn] =
    useState<DailyCheckInState | null>(null);

  const [receipts, setReceipts] =
    useState<StoredReceipt[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [savedMessage, setSavedMessage] =
    useState<string | null>(null);

  const [newWalletLabel, setNewWalletLabel] =
    useState("");

  const [newWalletAddress, setNewWalletAddress] =
    useState("");

  async function refreshAccount() {
    if (
      !address ||
      authenticatedAddress?.toLowerCase() !== address.toLowerCase()
    ) {
      setSnapshot(null);
      setProfile(null);
      setCheckIn(null);
      setReceipts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextSnapshot =
        await syncCustomerAccountForWallet(address);

      const nextProfile =
        loadCustomerAccountProfile({
          walletAddress: address,
          displayName:
            nextSnapshot.customer.displayName,
          email:
            nextSnapshot.customer.email,
        });

      const nextCheckIn =
        loadDailyCheckInState(address);

      const allReceipts =
        await browserReceiptStore.findAll();

      const receiptIds = new Set(
        nextSnapshot.orders
          .map((order) => order.receipt?.receiptId)
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      );

      const ownReceipts =
        allReceipts.filter((stored) => {
          const sender =
            stored.receipt.senderAddress;

          return (
            receiptIds.has(stored.receipt.id) ||
            Boolean(
              sender &&
              sender.toLowerCase() ===
                address.toLowerCase(),
            )
          );
        });

      setSnapshot(nextSnapshot);
      setProfile(nextProfile);
      setCheckIn(nextCheckIn);
      setReceipts(ownReceipts);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "TrustVault could not load this customer account.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Existing account loading is synchronized to the external Wagmi address.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, authenticatedAddress]);

  async function authenticateWallet() {
    if (!address || !isConnected) {
      setAuthenticationError("Connect a qualified wallet before authenticating.");
      return;
    }

    setAuthenticating(true);
    setAuthenticationError(null);
    try {
      const expectedAddress = address;
      await authenticateTrustVaultWallet({
        expectedAddress,
        getCurrentWallet: () => {
          const current = getAccount(config);
          return { connected: current.isConnected, address: current.address, chainId: current.chainId };
        },
        assertQualified: () => transactionReadiness.authority.assertCurrent(),
        requestChallenge: requestTrustVaultAuthChallenge,
        signMessage: (message) => signMessageAsync({ message }),
        verifyChallenge: verifyTrustVaultAuthChallenge,
      });
      setAuthenticatedAddress(expectedAddress);
    } catch (caughtError) {
      const error = caughtError as { code?: number; message?: string };
      setAuthenticationError(
        error.code === 4001
          ? "Signature request rejected. No authentication data was saved."
          : error.message || "TrustVault authentication failed. Please try again.",
      );
    } finally {
      setAuthenticating(false);
    }
  }

  const confirmedMarketplacePoints =
    snapshot?.trustPoints.balance.confirmed ?? 0;

  const totalVisiblePoints =
    confirmedMarketplacePoints +
    (checkIn?.totalCheckInPoints ?? 0);

  const trustScore =
    useMemo(() => {
      if (!profile || !checkIn) {
        return null;
      }

      return calculateTrustScore({
        walletConnected: isConnected,
        profile,
        confirmedOrderCount:
          snapshot?.totals.confirmedOrderCount ?? 0,
        receiptCount:
          snapshot?.totals.receiptCount ?? 0,
        confirmedTrustPoints:
          confirmedMarketplacePoints,
        checkIn,
      });
    }, [
      checkIn,
      confirmedMarketplacePoints,
      isConnected,
      profile,
      snapshot,
    ]);

  function saveProfileChanges() {
    if (!profile) {
      return;
    }

    const saved =
      saveCustomerAccountProfile(profile);

    setProfile(saved);
    setSavedMessage("Profile saved");

    window.setTimeout(
      () => setSavedMessage(null),
      1_500,
    );
  }

  function handleDailyCheckIn() {
    if (!address) {
      return;
    }

    const result =
      performDailyCheckIn(address);

    setCheckIn(result.state);

    setSavedMessage(
      result.alreadyCheckedIn
        ? "Already checked in today"
        : result.bonusAwarded
          ? `Day 7 complete: +${result.awardedPoints} points`
          : `Day ${result.checkedInDay}: +${result.awardedPoints} points`,
    );

    window.setTimeout(
      () => setSavedMessage(null),
      2_000,
    );
  }

  function addAddress() {
    if (!profile) {
      return;
    }

    setProfile({
      ...profile,
      addresses: [
        ...profile.addresses,
        createBlankAddress(profile),
      ],
    });
  }

  function updateAddress(
    id: string,
    patch: Partial<SavedAccountAddress>,
  ) {
    if (!profile) {
      return;
    }

    setProfile({
      ...profile,
      addresses:
        profile.addresses.map((item) => {
          if (item.id !== id) {
            if (patch.defaultShipping) {
              return {
                ...item,
                defaultShipping: false,
              };
            }

            if (patch.defaultBilling) {
              return {
                ...item,
                defaultBilling: false,
              };
            }

            return item;
          }

          return {
            ...item,
            ...patch,
          };
        }),
    });
  }

  function removeAddress(id: string) {
    if (!profile) {
      return;
    }

    setProfile({
      ...profile,
      addresses:
        profile.addresses.filter(
          (item) => item.id !== id,
        ),
    });
  }

  function addSavedWallet() {
    if (!profile) {
      return;
    }

    const walletAddress =
      newWalletAddress.trim();

    if (
      !/^0x[a-fA-F0-9]{40}$/.test(
        walletAddress,
      )
    ) {
      setSavedMessage(
        "Enter a full 42-character EVM wallet address beginning with 0x",
      );
      return;
    }

    if (
      profile.wallets.some(
        (wallet) =>
          wallet.address.toLowerCase() ===
          walletAddress.toLowerCase(),
      )
    ) {
      setSavedMessage(
        "That wallet is already saved",
      );
      return;
    }

    const updatedProfile: CustomerAccountProfile = {
      ...profile,
      wallets: [
        ...profile.wallets,
        {
          id: createSavedWalletId(),
          label:
            newWalletLabel.trim() ||
            "Saved wallet",
          address: walletAddress,
          primary: false,
          connected: false,
          addedAt: new Date().toISOString(),
        },
      ],
    };

    const savedProfile =
      saveCustomerAccountProfile(
        updatedProfile,
      );

    setProfile(savedProfile);
    setNewWalletLabel("");
    setNewWalletAddress("");
    setSavedMessage(
      "Wallet saved to My Account",
    );
  }

  if (!isConnected || !address) {
    return (
      <section className="section-shell py-20 sm:py-24">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <WalletCards className="h-6 w-6 text-zinc-700" />
          </span>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            Connect your wallet to open My Account.
          </h1>

          <p className="mt-4 text-sm leading-7 text-zinc-600">
            TrustVault uses the connected wallet to load your locally saved
            profile, Marketplace orders, receipts and rewards.
          </p>
        </div>
      </section>
    );
  }

  if (authenticatedAddress?.toLowerCase() !== address.toLowerCase()) {
    return (
      <section className="section-shell py-20 sm:py-24">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[var(--tv-shadow-md)] sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">Authenticate My Account</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600">
            Sign the exact TrustVault challenge with your connected, qualified wallet on Arc Testnet. This does not submit a transaction or move funds.
          </p>
          <p className="mt-3 font-mono text-xs text-zinc-500">{shortenAddress(address)}</p>
          {authenticationError && (
            <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-800">{authenticationError}</div>
          )}
          <button type="button" disabled={authenticating || transactionReadiness.status !== "TRANSACTION_READY"} onClick={() => void authenticateWallet()} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {authenticating && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {authenticating ? "Waiting for wallet…" : "Sign in with wallet"}
          </button>
          {transactionReadiness.status !== "TRANSACTION_READY" && (
            <p className="mt-4 text-xs leading-5 text-amber-700">{transactionReadiness.reasons[0] ?? "Select and qualify your wallet on Arc Testnet first."}</p>
          )}
        </div>
      </section>
    );
  }

  if (loading && !snapshot) {
    return (
      <section className="section-shell py-24">
        <div className="flex items-center justify-center gap-3 text-sm font-semibold text-zinc-600">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading customer accountÃ¢â‚¬Â¦
        </div>
      </section>
    );
  }

  if (error || !snapshot || !profile || !checkIn) {
    return (
      <section className="section-shell py-20">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-rose-50 p-8">
          <CircleAlert className="h-6 w-6 text-rose-700" />
          <h1 className="mt-4 text-2xl font-semibold text-rose-950">
            Account unavailable
          </h1>
          <p className="mt-3 text-sm leading-7 text-rose-800">
            {error ?? "TrustVault could not load this account."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-10 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-zinc-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
              TrustVault customer account
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 sm:text-5xl">
              {profile.displayName
                ? `Welcome, ${profile.displayName}.`
                : "Welcome to My Account."}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-600">
              Manage your profile, addresses, wallets, purchases, receipts and
              TrustVault activity from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              Arc Testnet
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-zinc-700">
              {shortenAddress(address)}
            </span>
          </div>
        </div>

        {savedMessage && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            {savedMessage}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside>
            <div className="sticky top-28 space-y-2 rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
              <TabButton
                icon={UserRound}
                label="Overview"
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              />
              <TabButton
                icon={Package}
                label="Order history"
                active={activeTab === "orders"}
                onClick={() => setActiveTab("orders")}
              />
              <TabButton
                icon={ReceiptText}
                label="Saved receipts"
                active={activeTab === "receipts"}
                onClick={() => setActiveTab("receipts")}
              />
              <TabButton
                icon={WalletCards}
                label="Saved wallets"
                active={activeTab === "wallets"}
                onClick={() => setActiveTab("wallets")}
              />
              <TabButton
                icon={Settings}
                label="Profile settings"
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              />
            </div>
          </aside>

          <main>
            {activeTab === "overview" && (
              <OverviewTab
                snapshot={snapshot}
                profile={profile}
                checkIn={checkIn}
                totalVisiblePoints={totalVisiblePoints}
                confirmedMarketplacePoints={confirmedMarketplacePoints}
                trustScore={trustScore}
                canCheckIn={canCheckInToday(checkIn)}
                onCheckIn={handleDailyCheckIn}
              />
            )}

            {activeTab === "orders" && (
              <OrdersTab snapshot={snapshot} />
            )}

            {activeTab === "receipts" && (
              <ReceiptsTab receipts={receipts} />
            )}

            {activeTab === "wallets" && (
              <WalletsTab
                profile={profile}
                newWalletLabel={newWalletLabel}
                newWalletAddress={newWalletAddress}
                onLabelChange={setNewWalletLabel}
                onAddressChange={setNewWalletAddress}
                onAdd={addSavedWallet}
                onProfileChange={setProfile}
              />
            )}

            {activeTab === "profile" && (
              <ProfileTab
                profile={profile}
                onChange={setProfile}
                onSave={saveProfileChanges}
                onAddAddress={addAddress}
                onUpdateAddress={updateAddress}
                onRemoveAddress={removeAddress}
              />
            )}
          </main>
        </div>
      </div>
    </section>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-zinc-950 text-white"
          : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function OverviewTab({
  snapshot,
  profile,
  checkIn,
  totalVisiblePoints,
  confirmedMarketplacePoints,
  trustScore,
  canCheckIn,
  onCheckIn,
}: {
  snapshot: CustomerAccountSnapshot;
  profile: CustomerAccountProfile;
  checkIn: DailyCheckInState;
  totalVisiblePoints: number;
  confirmedMarketplacePoints: number;
  trustScore: ReturnType<typeof calculateTrustScore> | null;
  canCheckIn: boolean;
  onCheckIn: () => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => index + 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Orders"
          value={String(snapshot.totals.orderCount)}
          detail={`${snapshot.totals.confirmedOrderCount} confirmed`}
        />
        <MetricCard
          label="Receipts"
          value={String(snapshot.totals.receiptCount)}
          detail="Saved transaction records"
        />
        <MetricCard
          label="Marketplace spend"
          value={`${snapshot.totals.lifetimeSpendUsdc} USDC`}
          detail="Confirmed purchases"
        />
        <MetricCard
          label="TrustPoints"
          value={String(totalVisiblePoints)}
          detail={`${confirmedMarketplacePoints} Marketplace + ${checkIn.totalCheckInPoints} check-in`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="daily-check-in" className="scroll-mt-28 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
                Daily check-in
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                Seven-day reward cycle
              </h2>
            </div>
            <CalendarCheck2 className="h-6 w-6 text-violet-600" />
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2">
            {days.map((day) => {
              const complete =
                day <= checkIn.currentCycleDay;

              return (
                <div
                  key={day}
                  className={`rounded-2xl border px-2 py-3 text-center ${
                    complete
                      ? "border-violet-200 bg-violet-50"
                      : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <p className="text-[11px] font-semibold text-zinc-500">
                    Day {day}
                  </p>
                  <p className={`mt-2 text-sm font-bold ${
                    complete
                      ? "text-violet-700"
                      : "text-zinc-700"
                  }`}>
                    {day === 7 ? "+30" : "+5"}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-6 text-zinc-500">
            Days 1Ã¢â‚¬â€œ6 award 5 points. Day 7 awards 5 points plus a 25-point
            streak bonus. Missing a day restarts the cycle at Day 1.
          </p>

          <button
            type="button"
            disabled={!canCheckIn}
            onClick={onCheckIn}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Sparkles className="h-4 w-4" />
            {canCheckIn
              ? "Check in today"
              : "Checked in today"}
          </button>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Trust Score
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                TrustVault activity profile
              </h2>
            </div>
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
          </div>

          {trustScore && (
            <>
              <div className="mt-6 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-[-0.06em] text-zinc-950">
                  {trustScore.score}
                </span>
                <span className="pb-1 text-sm font-semibold text-zinc-500">
                  / {trustScore.maximum} Ã‚Â· {trustScore.label}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {trustScore.factors.map((factor) => (
                  <div key={factor.id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-zinc-700">
                        {factor.label}
                      </span>
                      <span className="text-zinc-500">
                        {Math.round(factor.earned)}/{factor.maximum}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-950"
                        style={{
                          width: `${Math.min(
                            100,
                            (factor.earned / factor.maximum) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-6 text-zinc-600">
                This is a transparent TrustVault activity score for this
                prototype. It is not a credit score, financial risk rating or
                identity-verification result.
              </p>
            </>
          )}
        </section>
      </div>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Account profile
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-950">
              {profile.customerId}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Member since {formatDate(profile.memberSince)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
            >
              Shop Marketplace
            </Link>
            <Link
              href="/receipts"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800"
            >
              Receipt Center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {detail}
      </p>
    </div>
  );
}

function OrdersTab({
  snapshot,
}: {
  snapshot: CustomerAccountSnapshot;
}) {
  if (snapshot.orders.length === 0) {
    return <EmptyState title="No orders yet" description="Your Marketplace order history will appear here." />;
  }

  return (
    <div className="space-y-4">
      {snapshot.orders.map((order) => (
        <div
          key={order.id}
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {order.orderNumber}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                {order.items[0]?.snapshot.title ?? "Marketplace order"}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                {order.payment.amount.amount} USDC Ã‚Â· {formatDate(order.createdAt)}
              </p>
            </div>

            <span className="self-start rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold capitalize text-zinc-700">
              {order.status.replaceAll("-", " ")}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/orders/${encodeURIComponent(order.id)}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
            >
              View order
              <ChevronRight className="h-4 w-4" />
            </Link>

            {order.receipt && (
              <Link
                href={order.receipt.receiptPath}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800"
              >
                Receipt
                <ReceiptText className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceiptsTab({
  receipts,
}: {
  receipts: StoredReceipt[];
}) {
  if (receipts.length === 0) {
    return <EmptyState title="No receipts yet" description="Successful TrustVault transactions will appear here." />;
  }

  return (
    <div className="space-y-4">
      {receipts.map(({ receipt }) => (
        <div
          key={receipt.id}
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold text-zinc-500">
                {receipt.displayId || receipt.id}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                {receipt.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                {receipt.amount} {receipt.asset} Ã‚Â· {receipt.network}
              </p>
            </div>

            <Link
              href={`/receipt/${encodeURIComponent(receipt.id)}`}
              className="inline-flex min-h-10 items-center gap-2 self-start rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white"
            >
              Open receipt
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function WalletsTab({
  profile,
  newWalletLabel,
  newWalletAddress,
  onLabelChange,
  onAddressChange,
  onAdd,
  onProfileChange,
}: {
  profile: CustomerAccountProfile;
  newWalletLabel: string;
  newWalletAddress: string;
  onLabelChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onAdd: () => void;
  onProfileChange: (profile: CustomerAccountProfile) => void;
}) {
  const [editingWalletId, setEditingWalletId] =
    useState<string | null>(null);
  const [editingWalletLabel, setEditingWalletLabel] =
    useState("");
  const [walletMessage, setWalletMessage] =
    useState<string | null>(null);

  function showWalletMessage(message: string) {
    setWalletMessage(message);

    window.setTimeout(
      () => setWalletMessage(null),
      1_800,
    );
  }

  function persistWalletProfile(
    updatedProfile: CustomerAccountProfile,
    message: string,
  ) {
    const savedProfile =
      saveCustomerAccountProfile(
        updatedProfile,
      );

    onProfileChange(savedProfile);
    showWalletMessage(message);
  }

  function makeDefaultWallet(walletId: string) {
    const selectedWallet =
      profile.wallets.find(
        (wallet) => wallet.id === walletId,
      );

    if (!selectedWallet || selectedWallet.primary) {
      return;
    }

    persistWalletProfile(
      {
        ...profile,
        wallets: profile.wallets.map(
          (wallet) => ({
            ...wallet,
            primary:
              wallet.id === walletId,
          }),
        ),
      },
      `${selectedWallet.label} is now your default wallet`,
    );
  }

  function beginRenameWallet(
    walletId: string,
    currentLabel: string,
  ) {
    setEditingWalletId(walletId);
    setEditingWalletLabel(currentLabel);
  }

  function cancelRenameWallet() {
    setEditingWalletId(null);
    setEditingWalletLabel("");
  }

  function saveWalletLabel(walletId: string) {
    const nextLabel =
      editingWalletLabel.trim();

    if (!nextLabel) {
      showWalletMessage(
        "Wallet label cannot be empty",
      );
      return;
    }

    const selectedWallet =
      profile.wallets.find(
        (wallet) => wallet.id === walletId,
      );

    if (!selectedWallet) {
      return;
    }

    persistWalletProfile(
      {
        ...profile,
        wallets: profile.wallets.map(
          (wallet) =>
            wallet.id === walletId
              ? {
                  ...wallet,
                  label: nextLabel,
                }
              : wallet,
        ),
      },
      "Wallet nickname updated",
    );

    cancelRenameWallet();
  }

  function removeWallet(walletId: string) {
    const selectedWallet =
      profile.wallets.find(
        (wallet) => wallet.id === walletId,
      );

    if (
      !selectedWallet ||
      selectedWallet.primary ||
      selectedWallet.connected
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${selectedWallet.label}" from Saved wallets? This only removes the saved TrustVault reference. It does not affect the wallet itself or any funds.`,
    );

    if (!confirmed) {
      return;
    }

    persistWalletProfile(
      {
        ...profile,
        wallets: profile.wallets.filter(
          (wallet) =>
            wallet.id !== walletId,
        ),
      },
      "Wallet reference removed",
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Wallet management
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
              Saved wallets
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
              Save wallet references for easier account management. TrustVault
              never receives signing authority, private keys or seed phrases
              when a wallet is saved here.
            </p>
          </div>

          <div className="self-start rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Saved
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-950">
              {profile.wallets.length}
            </p>
          </div>
        </div>

        {walletMessage && (
          <div
            role="status"
            className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {walletMessage}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {profile.wallets.map((wallet) => {
            const editing =
              editingWalletId === wallet.id;

            return (
              <div
                key={wallet.id}
                className={`rounded-3xl border p-4 transition sm:p-5 ${
                  wallet.primary
                    ? "border-zinc-300 bg-zinc-50 shadow-sm"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {editing ? (
                        <input
                          autoFocus
                          value={editingWalletLabel}
                          onChange={(event) =>
                            setEditingWalletLabel(
                              event.target.value,
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              saveWalletLabel(wallet.id);
                            }

                            if (event.key === "Escape") {
                              cancelRenameWallet();
                            }
                          }}
                          aria-label={`Nickname for ${wallet.address}`}
                          className="min-h-10 w-full max-w-xs rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-zinc-950">
                          {wallet.label}
                        </p>
                      )}

                      {wallet.primary && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          Default
                        </span>
                      )}

                      {wallet.connected && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                          Connected
                        </span>
                      )}
                    </div>

                    <p className="mt-2 break-all font-mono text-xs leading-5 text-zinc-500">
                      {wallet.address}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {wallet.primary
                        ? "Used as your default TrustVault wallet reference."
                        : wallet.connected
                          ? "This wallet is currently connected to TrustVault."
                          : "Saved account reference."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            saveWalletLabel(wallet.id)
                          }
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save name
                        </button>

                        <button
                          type="button"
                          onClick={cancelRenameWallet}
                          className="inline-flex min-h-10 items-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {!wallet.primary && (
                          <button
                            type="button"
                            onClick={() =>
                              makeDefaultWallet(
                                wallet.id,
                              )
                            }
                            className="inline-flex min-h-10 items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            Make default
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            beginRenameWallet(
                              wallet.id,
                              wallet.label,
                            )
                          }
                          className="inline-flex min-h-10 items-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Rename
                        </button>

                        {!wallet.primary &&
                          !wallet.connected && (
                            <button
                              type="button"
                              onClick={() =>
                                removeWallet(wallet.id)
                              }
                              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-6 text-zinc-600">
          <span className="font-semibold text-zinc-800">
            Default vs connected:
          </span>{" "}
          your default wallet is the account reference TrustVault prefers for
          supported account experiences. The connected wallet is the wallet
          currently active in your browser wallet connection. They can be
          different.
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <h3 className="text-lg font-semibold text-zinc-950">
          Add wallet reference
        </h3>

        <p className="mt-3 max-w-2xl text-xs leading-6 text-zinc-500">
          Add a complete 42-character EVM wallet address. This stores only an
          address reference in your local TrustVault account profile.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Wallet nickname"
            value={newWalletLabel}
            placeholder="Savings wallet"
            onChange={onLabelChange}
          />
          <Field
            label="Wallet address"
            value={newWalletAddress}
            placeholder="0x..."
            onChange={onAddressChange}
          />
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-zinc-950 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add & save wallet
          </button>

          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Wallet references save immediately. No additional save step is
            required.
          </p>
        </div>
      </section>
    </div>
  );
}
function ProfileTab({
  profile,
  onChange,
  onSave,
  onAddAddress,
  onUpdateAddress,
  onRemoveAddress,
}: {
  profile: CustomerAccountProfile;
  onChange: (profile: CustomerAccountProfile) => void;
  onSave: () => void;
  onAddAddress: () => void;
  onUpdateAddress: (
    id: string,
    patch: Partial<SavedAccountAddress>,
  ) => void;
  onRemoveAddress: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Personal details
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
              Profile settings
            </h2>
          </div>
          <UserRound className="h-6 w-6 text-zinc-500" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            value={profile.displayName}
            onChange={(value) =>
              onChange({
                ...profile,
                displayName: value,
              })
            }
          />
          <Field
            label="Email"
            value={profile.email}
            onChange={(value) =>
              onChange({
                ...profile,
                email: value,
              })
            }
          />
          <Field
            label="Phone"
            value={profile.phone}
            onChange={(value) =>
              onChange({
                ...profile,
                phone: value,
              })
            }
          />
          <Field
            label="City"
            value={profile.city}
            onChange={(value) =>
              onChange({
                ...profile,
                city: value,
              })
            }
          />
          <Field
            label="State"
            value={profile.state}
            onChange={(value) =>
              onChange({
                ...profile,
                state: value,
              })
            }
          />
          <Field
            label="Country"
            value={profile.country}
            onChange={(value) =>
              onChange({
                ...profile,
                country: value,
              })
            }
          />
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={profile.preferences.emailReceipts}
            onChange={(event) =>
              onChange({
                ...profile,
                preferences: {
                  ...profile.preferences,
                  emailReceipts: event.target.checked,
                },
              })
            }
          />
          Email receipt preference
        </label>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Address book
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
              Saved addresses
            </h2>
          </div>

          <button
            type="button"
            onClick={onAddAddress}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add address
          </button>
        </div>

        {profile.addresses.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <MapPin className="mx-auto h-5 w-5 text-zinc-500" />
            <p className="mt-3 text-sm font-semibold text-zinc-800">
              No saved addresses yet
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {profile.addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Label"
                    value={address.label}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        label: value,
                      })
                    }
                  />
                  <Field
                    label="Full name"
                    value={address.fullName}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        fullName: value,
                      })
                    }
                  />
                  <Field
                    label="Address line 1"
                    value={address.addressLine1}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        addressLine1: value,
                      })
                    }
                  />
                  <Field
                    label="Address line 2"
                    value={address.addressLine2 ?? ""}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        addressLine2: value,
                      })
                    }
                  />
                  <Field
                    label="City"
                    value={address.city}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        city: value,
                      })
                    }
                  />
                  <Field
                    label="State"
                    value={address.state ?? ""}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        state: value,
                      })
                    }
                  />
                  <Field
                    label="Postal code"
                    value={address.postalCode}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        postalCode: value,
                      })
                    }
                  />
                  <Field
                    label="Country"
                    value={address.country}
                    onChange={(value) =>
                      onUpdateAddress(address.id, {
                        country: value,
                      })
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-zinc-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={address.defaultShipping}
                      onChange={(event) =>
                        onUpdateAddress(address.id, {
                          defaultShipping: event.target.checked,
                        })
                      }
                    />
                    Default shipping
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={address.defaultBilling}
                      onChange={(event) =>
                        onUpdateAddress(address.id, {
                          defaultBilling: event.target.checked,
                        })
                      }
                    />
                    Default billing
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      onRemoveAddress(address.id)
                    }
                    className="ml-auto inline-flex items-center gap-2 text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onSave}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white"
        >
          <Save className="h-4 w-4" />
          Save profile
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold text-zinc-700">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
      />
    </label>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
      <Package className="mx-auto h-6 w-6 text-zinc-500" />
      <h2 className="mt-4 text-xl font-semibold text-zinc-950">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        {description}
      </p>
    </div>
  );
}
