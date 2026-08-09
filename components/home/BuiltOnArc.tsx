"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { arcTestnet } from "viem/chains";
import { useAccount } from "wagmi";

export function BuiltOnArc() {
  const { chainId, isConnected } = useAccount();
  const isArcNetwork = chainId === arcTestnet.id;

  const walletStatus = !isConnected
    ? "Not connected"
    : isArcNetwork
      ? "Connected"
      : "Switch network";

  return (
    <section className="bg-white py-18 sm:py-20 lg:py-24">
      <div className="section-shell">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-950 px-6 py-12 text-white shadow-[var(--tv-shadow-lg)] sm:px-10 lg:px-14 lg:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                Arc Testnet
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
                Programmable money on Arc Testnet,
                <span className="block text-zinc-300">
                  with verifiable transaction state.
                </span>
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                TrustVault currently uses Arc Testnet and USDC for the
                transaction flows that have been implemented and tested in
                the application, including timed gifting and Bill Split settlement.
              </p>
            </div>

            <div
              className="flex min-h-36 min-w-56 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white p-8"
              aria-label="Arc network logo"
            >
              <Image
                src="/brand/arc/logo-navy.svg"
                alt="Arc"
                width={180}
                height={70}
                className="h-[50px] w-auto"
              />
            </div>
          </div>

          <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard label="Network" value="Arc Testnet" />
            <StatusCard label="Settlement asset" value="USDC" />
            <StatusCard
              label="Wallet status"
              value={walletStatus}
              indicator={
                !isConnected
                  ? "bg-zinc-500"
                  : isArcNetwork
                    ? "bg-emerald-400"
                    : "bg-amber-400"
              }
            />
            <div className="rounded-2xl bg-white/[0.05] p-4">
              <p className="text-xs text-zinc-500">Explorer</p>
              <a
                href={arcTestnet.blockExplorers.default.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-100 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ArcScan
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          Testnet assets have no real-world value. TrustVault does not present
          an action as confirmed until the application has a supported source
          of transaction state.
        </p>
      </div>
    </section>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
  indicator?: string;
};

function StatusCard({ label, value, indicator }: StatusCardProps) {
  return (
    <div className="rounded-2xl bg-white/[0.05] p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {indicator && (
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${indicator}`} />
        )}
        <p className="text-sm font-semibold text-zinc-100">{value}</p>
      </div>
    </div>
  );
}


