"use client";

import {
  CheckCircle2,
  CircleAlert,
  Copy,
  LoaderCircle,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { arcTestnet } from "viem/chains";
import { useAccount } from "wagmi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletVerification() {
  const { address, chainId, isConnected, status } = useAccount();
  const [copied, setCopied] = useState(false);

  const isReconnecting = status === "reconnecting";
  const isArc = chainId === arcTestnet.id;

  async function copyAddress() {
    if (!address) return;

    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  if (isReconnecting) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex items-center gap-3">
          <LoaderCircle
            aria-hidden="true"
            className="h-5 w-5 animate-spin text-zinc-500"
          />
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Restoring wallet connection
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              TrustVault is checking your previously connected browser wallet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
          />
          <div>
            <p className="text-sm font-semibold text-amber-950">
              Wallet not connected
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Connect your wallet from the header before TrustVault can estimate
              the network fee or prepare an App Kit transaction.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Wallet connected
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="truncate font-mono text-sm font-semibold text-zinc-950">
              {shortenAddress(address)}
            </p>

            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy connected wallet address"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {copied ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Copy aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`rounded-2xl border bg-white p-4 ${
            isArc ? "border-emerald-200" : "border-amber-200"
          }`}
        >
          <div
            className={`flex items-center gap-2 ${
              isArc ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {isArc ? (
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <CircleAlert aria-hidden="true" className="h-4 w-4" />
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Network {isArc ? "verified" : "requires attention"}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <WalletCards aria-hidden="true" className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-950">
              {isArc ? "Arc Testnet" : "Switch to Arc Testnet"}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-zinc-500">
        This verification reads only your public wallet state. No funds move and
        no transaction request is created.
      </p>
    </div>
  );
}
