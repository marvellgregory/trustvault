"use client";

import {
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Network,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import { arcTestnet } from "viem/chains";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { WalletChooser } from "@/components/wallet/WalletChooser";
import { WalletStatusBadge } from "@/components/wallet/WalletStatusBadge";
import { useWalletIdentityReconciliation } from "@/components/wallet/useWalletIdentityReconciliation";
import type { SerializableProviderIdentity } from "@/lib/wallet/provider-types";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, chainId, isConnected, status } = useAccount();
  const { connectors, connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const identityReconciliation = useWalletIdentityReconciliation();
  const {
    switchChain,
    error: switchError,
    isPending: isSwitching,
  } = useSwitchChain();

  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: {
      enabled: Boolean(address && chainId === arcTestnet.id),
    },
  });

  const [open, setOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<SerializableProviderIdentity | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isArc = chainId === arcTestnet.id;
  const injectedConnector = connectors.find(
    (connector) => connector.type === "injected",
  );

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function copyAddress() {
    if (!address) return;

    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end">
        <button
          type="button"
          disabled={!injectedConnector || isPending}
          onClick={() => {
            if (selectedProvider) {
              setChooserOpen(true);
              return;
            }
            // Generic compatibility bridge remains explicit and is never a fallback.
            if (injectedConnector) {
              connect({ connector: injectedConnector });
            }
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4 sm:px-5"
        >
          {isPending || status === "reconnecting" ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <WalletCards aria-hidden="true" className="h-4 w-4" />
          )}

          <span className="hidden sm:inline">
            {isPending ? "Connecting…" : "Connect wallet"}
          </span>

          <span className="sm:hidden">
            {isPending ? "Wait…" : "Connect"}
          </span>
        </button>

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={chooserOpen}
          onClick={() => setChooserOpen(true)}
          className="mt-1 rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 transition hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          Wallet options
        </button>

        {selectedProvider && (
          <button
            type="button"
            disabled={!injectedConnector || isPending}
            onClick={() => injectedConnector && connect({ connector: injectedConnector })}
            className="max-w-56 truncate rounded px-1 text-[10px] font-semibold text-zinc-500 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
          >
            Use generic compatibility connect instead
          </button>
        )}

        <WalletChooser
          open={chooserOpen}
          onClose={() => setChooserOpen(false)}
          onProviderSelected={setSelectedProvider}
        />

        {connectError && (
          <p
            role="alert"
            className="absolute right-5 top-[4.5rem] max-w-xs rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-rose-700 shadow-lg"
          >
            {connectError.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4 sm:px-4 ${
          isArc
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${
            isArc ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />

        <span>{address ? shortenAddress(address) : "Connected"}</span>

        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Wallet menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl"
        >
          <div className="border-b border-zinc-200 p-5">
            <div className="mb-4">
              <WalletStatusBadge
                status={
                  identityReconciliation.status === "IDENTITY_VERIFIED"
                    ? "CONNECTED"
                    : identityReconciliation.status === "IDENTITY_INVALIDATED"
                      ? "INVALIDATED"
                      : "IDENTITY_UNVERIFIED"
                }
              />
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                {identityReconciliation.status === "IDENTITY_VERIFIED"
                  ? `Selected provider identity verified: ${identityReconciliation.currentProvider?.identity.name ?? "wallet"}.`
                  : identityReconciliation.reason === "SELECTED_PROVIDER_MISMATCH"
                    ? "The connected wallet differs from the selected wallet. A deliberate connection flow will be required before the selection can control Wagmi."
                    : "The account is connected, but its selected provider identity is unverified. Choose the active wallet again in Wallet options to verify it for this page session."}
              </p>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Connected wallet
                </p>

                <p className="mt-2 truncate font-mono text-sm font-semibold text-zinc-950">
                  {address}
                </p>
              </div>

              <span
                className={`mt-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isArc
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isArc ? "Arc Testnet" : "Wrong network"}
              </span>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={copyAddress}
              className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {copied ? (
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>

          {!isArc ? (
            <div className="border-b border-zinc-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-950">
                    Switch to Arc Testnet
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    TrustVault will not enable payment actions until the connected
                    wallet is on Arc Testnet.
                  </p>

                  <button
                    type="button"
                    disabled={isSwitching}
                    onClick={() => switchChain({ chainId: arcTestnet.id })}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-900 px-4 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-900 focus-visible:ring-offset-2"
                  >
                    {isSwitching ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Network aria-hidden="true" className="h-4 w-4" />
                    )}

                    {isSwitching ? "Switching…" : "Switch network"}
                  </button>

                  {switchError && (
                    <p role="alert" className="mt-2 text-xs text-rose-700">
                      {switchError.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-zinc-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Arc gas balance
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                  {isBalanceLoading
                    ? "Loading…"
                    : `${Number(
                        balance
                          ? formatUnits(balance.value, balance.decimals)
                          : "0",
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })} ${balance?.symbol ?? "USDC"}`}
                </p>

                <a
                  href={`${arcTestnet.blockExplorers.default.url}/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 transition hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  ArcScan
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Arc uses USDC for network fees. Testnet funds have no real-world
                value.
              </p>
            </div>
          )}

          <div className="border-b border-zinc-200 p-3">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setChooserOpen(true);
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <WalletCards aria-hidden="true" className="h-4 w-4" />
              Wallet options
            </button>
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              My Account
            </Link>

            <Link
              href="/account#daily-check-in"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="mt-1 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
            >
              <span className="flex items-center gap-3">
                <UserRound aria-hidden="true" className="h-4 w-4" />
                Daily check-in
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                +5
              </span>
            </Link>
          </div>

          <div className="p-3">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Disconnect wallet
            </button>
          </div>
        </div>
      )}
      <WalletChooser
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onProviderSelected={setSelectedProvider}
      />
    </div>
  );
}
