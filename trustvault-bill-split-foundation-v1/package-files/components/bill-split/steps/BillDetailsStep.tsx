import type { BillSplitDraft } from "@/components/bill-split/types";

export function BillDetailsStep({
  draft,
  organizerAddress,
  updateField,
}: {
  draft: BillSplitDraft;
  organizerAddress?: string;
  updateField: <K extends keyof BillSplitDraft>(
    key: K,
    value: BillSplitDraft[K],
  ) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
        Step 1
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        What are you splitting?
      </h2>

      <div className="mt-8 grid gap-5">
        <label>
          <span className="text-sm font-semibold text-zinc-700">Bill title</span>
          <input
            value={draft.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Dinner at Toit"
            className="mt-2 min-h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-950"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-zinc-700">
            Total amount (USDC)
          </span>
          <input
            inputMode="decimal"
            value={draft.totalAmount}
            onChange={(event) =>
              updateField("totalAmount", event.target.value)
            }
            placeholder="90.00"
            className="mt-2 min-h-12 w-full rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-950"
          />
        </label>

        <label>
          <span className="text-sm font-semibold text-zinc-700">
            Note (optional)
          </span>
          <textarea
            value={draft.note}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Team dinner"
            className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
          />
        </label>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Organizer settlement wallet
          </p>
          <p className="mt-2 break-all font-mono text-xs font-semibold text-zinc-800">
            {organizerAddress || "Connect wallet to continue"}
          </p>
        </div>
      </div>
    </div>
  );
}
