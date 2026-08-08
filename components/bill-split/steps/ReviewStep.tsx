import type { BillSplitDraft } from "@/components/bill-split/types";
import type { CalculatedParticipantShare } from "@/lib/bill-split/split-calculator";

export function ReviewStep({
  draft,
  organizerAddress,
  calculatedShares,
}: {
  draft: BillSplitDraft;
  organizerAddress?: string;
  calculatedShares: CalculatedParticipantShare[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
        Step 4
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        Review the Bill Split.
      </h2>

      <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">{draft.title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {draft.splitMethod === "equal" ? "Equal split" : "Custom split"}
            </p>
          </div>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
            {draft.totalAmount} USDC
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {draft.participants.map((participant) => {
            const share = calculatedShares.find(
              (row) => row.id === participant.id,
            );

            return (
              <div
                key={participant.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    {participant.name}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                    {participant.walletAddress}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-zinc-950">
                  {share?.amount ?? participant.customAmount} USDC
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-950">
          No USDC moves when this bill is created.
        </p>
        <p className="mt-1 text-xs leading-5 text-blue-800">
          Package 1 stores the Bill Split and participant obligations. Participant
          payment links and real Arc Testnet settlement are added in the next build.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Organizer settlement wallet
        </p>
        <p className="mt-2 break-all font-mono text-xs text-zinc-700">
          {organizerAddress || "Wallet not connected"}
        </p>
      </div>
    </div>
  );
}
