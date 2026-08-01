"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { arcTestnet } from "viem/chains";
import { useAccount } from "wagmi";

const statusItems = [
  {
    label: "Settlement asset",
    value: "USDC",
  },
  {
    label: "Transaction finality",
    value: "Deterministic",
  },
];

export function BuiltOnArc() {
  const { chainId, isConnected } = useAccount();

  const isArc = chainId === arcTestnet.id;
  const walletStatus = isConnected
    ? isArc
      ? "Connected"
      : "Wrong network"
    : "Not connected";

  return (
    <section className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="section-shell">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-950 px-6 py-12 text-white shadow-[var(--tv-shadow-lg)] sm:px-10 lg:px-14 lg:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6b78]">
                Programmable finance
              </p>

              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
                Programmable Money.
                <span className="block text-zinc-300">
                  Built for the Stablecoin Economy.
                </span>
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                TrustVault is a programmable finance platform built on Arc,
                bringing together gifting, escrow-protected marketplace
                payments, shared expenses and AI-powered financial assistance
                through one seamless USDC-native experience.
              </p>
            </div>

            <div
              className="flex min-h-40 min-w-64 flex-col items-center justify-center rounded-[1.75rem] border border-white/10 bg-white p-8"
              aria-label="Built on Arc"
            >
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Built on
              </p>

              <Image
                src="/brand/arc/logo-navy.svg"
                alt="Arc"
                width={180}
                height={70}
                className="h-[50px] w-auto"
              />
            </div>
          </div>

          <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-white/[0.05] p-4">
              <p className="text-xs text-zinc-500">Network</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">
                Arc Testnet
              </p>
            </div>

            {statusItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/[0.05] p-4"
              >
                <p className="text-xs text-zinc-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">
                  {item.value}
                </p>
              </div>
            ))}

            <div className="rounded-2xl bg-white/[0.05] p-4">
              <p className="text-xs text-zinc-500">Wallet status</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    isConnected && isArc
                      ? "bg-emerald-400"
                      : isConnected
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                  }`}
                />
                <p className="text-sm font-semibold text-zinc-100">
                  {walletStatus}
                </p>
              </div>
            </div>

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
          TrustVault currently operates on Arc Testnet for development and
          validation. Testnet assets have no real-world value.
        </p>
      </div>
    </section>
  );
}
