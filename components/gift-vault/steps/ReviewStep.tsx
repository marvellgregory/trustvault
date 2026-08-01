import { ShieldCheck } from "lucide-react";
import type { GiftData } from "@/components/gift-vault/types";
import { EstimateCard } from "@/components/gift-vault/review/EstimateCard";
import { ReviewSummary } from "@/components/gift-vault/review/ReviewSummary";
import { WalletVerification } from "@/components/gift-vault/review/WalletVerification";

type ReviewStepProps = {
  data: GiftData;
};

export function ReviewStep({ data }: ReviewStepProps) {
  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[var(--tv-brand)]">
        <ShieldCheck aria-hidden="true" className="h-5 w-5" />
      </span>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Review
      </p>

      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-4xl">
        Check every detail before creating the draft.
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-600">
        TrustVault verifies your wallet and network, then uses Circle App Kit to
        estimate the Arc network fee before any transaction is created.
      </p>

      <ReviewSummary data={data} />
      <WalletVerification />
      <EstimateCard data={data} />

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        Estimating does not move USDC. Wallet signing, transaction status,
        explorer proof and the final digital receipt are added in the next
        milestones.
      </div>
    </div>
  );
}
