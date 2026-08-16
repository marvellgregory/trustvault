"use client";

import { Info, WalletCards, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { WalletProviderRow } from "@/components/wallet/WalletProviderRow";
import { WalletSecurityNotice } from "@/components/wallet/WalletSecurityNotice";
import { useSelectedProviderConnection } from "@/components/wallet/useSelectedProviderConnection";
import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";
import { CANDIDATE_WALLET_CATALOGUE, isCandidateDetectedByDisplayName } from "@/lib/wallet/candidate-wallet-catalogue";
import type { SerializableProviderIdentity } from "@/lib/wallet/provider-types";

export function WalletChooser({ open, onClose, onProviderSelected }: {
  open: boolean;
  onClose: () => void;
  onProviderSelected: (identity: SerializableProviderIdentity | null) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { providers, selectProvider, clearSelection, binding, connectSelected } = useSelectedProviderConnection();
  const transactionReadiness = useWalletTransactionReadiness();
  const selectedItem = providers.find((item) => item.selected);
  const detectedCandidateNames = new Set(providers.map((item) => item.identity.name.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button type="button" aria-label="Close wallet chooser" className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-slate-950/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Wallet identity</p>
            <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Connect to TrustVault</h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-400">Select a detected provider, then use the separate connect action. Selection is memory-only.</p>
          </div>
          <button ref={closeButtonRef} type="button" aria-label="Close wallet chooser" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 p-5 sm:p-7">
          <section aria-labelledby={`${titleId}-detected`}>
            <div className="flex items-center justify-between gap-3">
              <h3 id={`${titleId}-detected`} className="text-sm font-semibold text-slate-200">Detected on this device</h3>
              <span className="text-xs text-slate-500">{providers.length} {providers.length === 1 ? "provider" : "providers"}</span>
            </div>
            {providers.length > 0 ? (
              <div className="mt-3 space-y-2">
                {providers.map((item) => (
                  <WalletProviderRow key={item.identity.registryId} item={item} onSelect={(providerId) => onProviderSelected(selectProvider(providerId))} />
                ))}
              </div>
            ) : (
              <div className="mt-3 flex gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-5">
                <WalletCards aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">No EIP-6963 wallet detected</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Install or unlock a browser wallet, then reopen this chooser. No wallet prompt has been requested.</p>
                </div>
              </div>
            )}
            {selectedItem && (
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                <p className="text-xs leading-5 text-slate-300">
                  Selected: <span className="font-semibold text-white">{selectedItem.identity.name}</span>. This does not authorize an account until you continue.
                </p>
                <p className={`mt-2 text-xs font-semibold ${transactionReadiness.status === "TRANSACTION_READY" ? "text-emerald-200" : "text-amber-200"}`}>
                  {transactionReadiness.status === "TRANSACTION_READY" ? "Transaction ready" : transactionReadiness.status === "TEST_REQUIRED" ? "Qualification required" : "Transaction readiness pending"}
                </p>
                {(binding.phase === "CONNECTED" || binding.phase === "ARC_READY") && (
                  <p className="mt-2 text-xs font-semibold text-emerald-200">{binding.phase === "ARC_READY" ? "Arc Ready" : "Connected"}</p>
                )}
                <button type="button" disabled={binding.phase === "CONNECTING" || binding.phase === "CONNECTED" || binding.phase === "ARC_READY" || !selectedItem.selectable} onClick={() => void connectSelected()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-100 px-5 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                  {binding.phase === "CONNECTING" ? "Connecting…" : "Connect selected wallet"}
                </button>
                {(binding.phase === "REJECTED" || binding.phase === "FAILED" || binding.phase === "INVALIDATED") && (
                  <p role="alert" className="mt-2 text-xs leading-5 text-amber-200">{binding.failure?.message}</p>
                )}
              </div>
            )}
          </section>
          <section className="border-t border-white/10 pt-5">
            <div className="flex gap-3">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-300">More wallets as they are qualified</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Detection and EVM compatibility do not mean a wallet is supported by TrustVault.</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Future qualification candidates">
              {CANDIDATE_WALLET_CATALOGUE.map((candidate) => {
                const detected = isCandidateDetectedByDisplayName(candidate, [...detectedCandidateNames]);
                return <span key={candidate.key} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500">{candidate.displayName} · {detected ? "Detected above" : "Not detected"}</span>;
              })}
            </div>
          </section>
          <WalletSecurityNotice />
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button type="button" onClick={() => { clearSelection(); onProviderSelected(null); }} className="text-xs font-semibold text-slate-400 underline decoration-slate-700 underline-offset-4 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Clear selection</button>
            <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">Done</button>
          </div>
        </div>
      </section>
    </div>
  );
}
