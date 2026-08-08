import type {
  BillSplitDraft,
  BillSplitDraftParticipant,
  BillSplitMethod,
} from "@/components/bill-split/types";
import type { CalculatedParticipantShare } from "@/lib/bill-split/split-calculator";

export function SplitMethodStep({
  draft,
  calculatedShares,
  setSplitMethod,
  updateParticipant,
}: {
  draft: BillSplitDraft;
  calculatedShares: CalculatedParticipantShare[];
  setSplitMethod: (method: BillSplitMethod) => void;
  updateParticipant: (
    id: string,
    patch: Partial<BillSplitDraftParticipant>,
  ) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
        Step 3
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        Choose how the bill should be divided.
      </h2>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(["equal", "custom"] as const).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => setSplitMethod(method)}
            className={`rounded-3xl border p-5 text-left ${
              draft.splitMethod === method
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-950"
            }`}
          >
            <p className="text-sm font-semibold">
              {method === "equal" ? "Equal split" : "Custom split"}
            </p>
            <p className="mt-2 text-xs leading-5 opacity-70">
              {method === "equal"
                ? "TrustVault distributes USDC base units deterministically so the shares sum exactly to the bill total."
                : "Enter a precise USDC amount for each participant."}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {draft.participants.map((participant) => {
          const calculated = calculatedShares.find(
            (share) => share.id === participant.id,
          );

          return (
            <div
              key={participant.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  {participant.name}
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">
                  {participant.walletAddress}
                </p>
              </div>

              {draft.splitMethod === "equal" ? (
                <p className="text-lg font-semibold text-zinc-950">
                  {calculated?.amount ?? "—"} USDC
                </p>
              ) : (
                <input
                  inputMode="decimal"
                  value={participant.customAmount}
                  onChange={(event) =>
                    updateParticipant(participant.id, {
                      customAmount: event.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="min-h-11 w-full rounded-2xl border border-zinc-300 px-4 text-sm sm:w-40"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
