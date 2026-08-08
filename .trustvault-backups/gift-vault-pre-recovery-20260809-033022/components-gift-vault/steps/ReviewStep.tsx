import { ShieldCheck } from "lucide-react";

import type { GiftData } from "@/components/gift-vault/types";
import { EstimateCard } from "@/components/gift-vault/review/EstimateCard";
import { ReviewSummary } from "@/components/gift-vault/review/ReviewSummary";
import { WalletVerification } from "@/components/gift-vault/review/WalletVerification";
import { TRUSTVAULT_GIFT_VAULT_ADDRESS } from "@/lib/gift-vault/contract";

export function ReviewStep({
  data,
}: {
  data: GiftData;
}) {
  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
        <ShieldCheck
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Review
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
        Check every detail before locking the gift.
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
        TrustVault verifies the connected wallet and
        Arc Testnet, then uses the deployed timed Gift
        Vault contract to hold USDC until the exact
        unlock timestamp.
      </p>

      <ReviewSummary data={data} />
      <WalletVerification />
      <EstimateCard data={data} />

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        <p className="font-semibold">
          Two wallet confirmations may be required.
        </p>
        <p className="mt-1">
          If the vault does not already have enough
          USDC allowance, the wallet first approves
          the exact gift amount. A second confirmation
          then creates the timed gift on Arc Testnet.
        </p>
        <p className="mt-3 break-all font-mono text-[11px] text-amber-900/80">
          Vault: {TRUSTVAULT_GIFT_VAULT_ADDRESS}
        </p>
      </div>
    </div>
  );
}
