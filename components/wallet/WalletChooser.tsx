"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  WalletCards,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
} from "react";

import { WalletProviderRow } from "@/components/wallet/WalletProviderRow";
import { WalletQualificationLab } from "@/components/wallet/WalletQualificationLab";
import { WalletSecurityNotice } from "@/components/wallet/WalletSecurityNotice";
import { useSelectedProviderConnection } from "@/components/wallet/useSelectedProviderConnection";
import { useWalletTransactionReadiness } from "@/components/wallet/useWalletTransactionReadiness";
import { useWalletIdentityReconciliation } from "@/components/wallet/useWalletIdentityReconciliation";
import {
  CANDIDATE_WALLET_CATALOGUE,
} from "@/lib/wallet/candidate-wallet-catalogue";
import {
  CUSTOMER_SUPPORTED_WALLET_KEYS,
  getWalletLogoSrc,
} from "@/lib/wallet/wallet-branding";
import type { SerializableProviderIdentity } from "@/lib/wallet/provider-types";

export function WalletChooser({
  open,
  onClose,
  onProviderSelected,
}: {
  open: boolean;
  onClose: () => void;
  onProviderSelected: (
    identity: SerializableProviderIdentity | null,
  ) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const {
    providers,
    selectProvider,
    clearSelection,
    binding,
    connectSelected,
  } = useSelectedProviderConnection();
  const transactionReadiness =
    useWalletTransactionReadiness();

  const identityReconciliation =
    useWalletIdentityReconciliation();

  const selectedItem =
    providers.find((item) => item.selected);

  const visibleProviders =
  process.env.NODE_ENV === "development" ? providers
  : providers.filter(
      (item) => item.productionActionable,
    );

  const detectedCandidateNames = new Set(
    providers.flatMap((item) =>
      item.family ? [item.family.key] : [],
    ),
  );
  const supportedCandidates =
    CUSTOMER_SUPPORTED_WALLET_KEYS.flatMap(
      (key) => {
        const candidate =
          CANDIDATE_WALLET_CATALOGUE.find(
            (item) => item.key === key,
          );

        return candidate ? [candidate] : [];
      },
    );

  function detectedProviderFor(
    walletKey: string,
  ) {
    if (!detectedCandidateNames.has(walletKey)) {
      return undefined;
    }

    return providers.find(
      (item) =>
        item.productionActionable &&
        item.family?.key === walletKey,
    );
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    closeButtonRef.current?.focus();

    const closeOnEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [onClose, open]);

  if (!open) return null;

  const selectedDisplayName =
    selectedItem?.family?.displayName ??
    selectedItem?.identity.name ??
    "wallet";

  const connected =
    binding.phase === "CONNECTED" ||
    binding.phase === "ARC_READY";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close wallet chooser"
        className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-slate-950/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Wallet connection
            </p>

            <h2
              id={titleId}
              className="mt-2 text-2xl font-semibold tracking-[-0.035em]"
            >
              Connect wallet
            </h2>

            <p
              id={descriptionId}
              className="mt-2 text-sm leading-6 text-slate-400"
            >
              Choose a supported wallet to
              continue with TrustVault.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close wallet chooser"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <X
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <section
            aria-labelledby={`${titleId}-wallets`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id={`${titleId}-wallets`}
                className="text-sm font-semibold text-slate-200"
              >
                Supported and tested
              </h3>

              <span className="text-xs text-slate-500">
                {supportedCandidates.length} supported
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {supportedCandidates.map(
                (candidate) => {
                  const provider =
                    detectedProviderFor(
                      candidate.key,
                    );

                  if (provider) {
                    return (
                      <WalletProviderRow
                        key={candidate.key}
                        item={provider}
                        onSelect={(providerId) => onProviderSelected(selectProvider(providerId))}
                      />
                    );
                  }

                  const logo =
                    getWalletLogoSrc(
                      candidate.key,
                    );

                  return (
                    <div
                      key={candidate.key}
                      aria-disabled="true"
                      className="flex min-h-20 w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 opacity-70"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
                        {logo ? (
                          <Image
                            src={logo}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <WalletCards
                            aria-hidden="true"
                            className="h-5 w-5 text-slate-500"
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-200">
                          {
                            candidate.displayName
                          }
                        </span>

                        <span className="mt-1.5 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Not detected
                        </span>
                      </span>

                      <span className="text-xs font-medium text-slate-600">
                        Unavailable
                      </span>
                    </div>
                  );
                },
              )}
            </div>

            <p className="mt-4 text-center text-xs font-medium text-slate-500">
              More wallets as they are qualified
            </p>

            <div
              className="mt-3 flex flex-wrap justify-center gap-2"
              aria-label="Future qualification candidates"
            >
              {CANDIDATE_WALLET_CATALOGUE.map(
                (candidate) => {
                  if (
                    candidate.productionAvailability ===
                    "ENABLED"
                  ) {
                    return null;
                  }

                  return (
                    <span
                      key={candidate.key}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500"
                    >
                      {candidate.displayName} ·{" "}
                      {candidate.userFacingReason}
                    </span>
                  );
                },
              )}
            </div>

            {selectedItem && (
              <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                {connected ? (
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Connected with{" "}
                      {selectedDisplayName}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      TrustVault is using the
                      wallet you selected.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedDisplayName}{" "}
                      selected
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      TrustVault will request
                      access only from this
                      wallet.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      This does not authorize an account until you continue.
                    </p>
                  </div>
                )}                {connected && (
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {identityReconciliation.status === "IDENTITY_VERIFIED"
                      ? "Selected provider identity verified."
                      : "Connected account identity verification is pending."}
                  </p>
                )}

                <p
                  className={`mt-3 text-xs font-semibold ${
                    transactionReadiness.status === "TRANSACTION_READY"
                      ? "text-emerald-200"
                      : "text-amber-200"
                  }`}
                >
                  {transactionReadiness.status === "TRANSACTION_READY"
                    ? "Qualification passed / Transaction ready"
                    : transactionReadiness.status === "TEST_REQUIRED"
                      ? "Qualification required"
                      : "Transaction readiness pending"}
                </p>


                <button
                  type="button"
                  aria-label="Connect selected wallet"
                  disabled={
                    binding.phase ===
                      "CONNECTING" ||
                    connected ||
                    !selectedItem.selectable
                  }
                  onClick={() => void connectSelected()}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-100 px-5 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {binding.phase ===
                  "CONNECTING"
                    ? "Connecting..."
                    : connected
                      ? "Connected"
                      : `Continue with ${selectedDisplayName}`}
                </button>

                {(binding.phase ===
                  "REJECTED" ||
                  binding.phase ===
                    "FAILED" ||
                  binding.phase ===
                    "INVALIDATED") && (
                  <p
                    role="alert"
                    className="mt-2 text-xs leading-5 text-amber-200"
                  >
                    {
                      binding.failure
                        ?.message
                    }
                  </p>
                )}
              </div>
            )}
          </section>

          <WalletSecurityNotice />

          {process.env.NODE_ENV === "development" ? (
            <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                Developer diagnostics
              </summary>

              <p className="mt-3 text-xs leading-5 text-slate-500">
  {visibleProviders.length} provider
  {visibleProviders.length === 1 ? "" : "s"} visible
  to development diagnostics. Production connection
  rules remain unchanged.
</p>

              <p className="mt-3 text-[11px] leading-5 text-slate-600">
                Transaction readiness pending until provider qualification and connection checks complete.
              </p>

              <p className="mt-2 text-[11px] leading-5 text-slate-600">
                Selected provider identity verified after the active wallet matches the deliberate provider selection.
              </p>

              <p className="mt-2 text-[11px] leading-5 text-slate-600">
                Detection and catalogue presence do not mean a wallet is supported until qualification is complete.
              </p>

              <div className="mt-4">
                <WalletQualificationLab />
              </div>
            </details>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={() => {
                clearSelection();
                onProviderSelected(null);
              }}
              className="text-xs font-semibold text-slate-400 underline decoration-slate-700 underline-offset-4 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Clear selection
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Done
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}