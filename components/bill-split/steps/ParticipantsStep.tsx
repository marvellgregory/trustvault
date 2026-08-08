import { Plus, Trash2 } from "lucide-react";

import type {
  BillSplitDraft,
  BillSplitDraftParticipant,
} from "@/components/bill-split/types";

export function ParticipantsStep({
  draft,
  updateParticipant,
  addParticipant,
  removeParticipant,
}: {
  draft: BillSplitDraft;
  updateParticipant: (
    id: string,
    patch: Partial<BillSplitDraftParticipant>,
  ) => void;
  addParticipant: () => void;
  removeParticipant: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tv-brand)]">
        Step 2
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
        Add the people who owe a share.
      </h2>

      <div className="mt-8 space-y-4">
        {draft.participants.map((participant, index) => (
          <div
            key={participant.id}
            className="rounded-3xl border border-zinc-200 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-950">
                Participant {index + 1}
              </p>

              <button
                type="button"
                onClick={() => removeParticipant(participant.id)}
                disabled={draft.participants.length <= 2}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                value={participant.name}
                onChange={(event) =>
                  updateParticipant(participant.id, {
                    name: event.target.value,
                  })
                }
                placeholder="Friend name"
                className="min-h-12 rounded-2xl border border-zinc-300 px-4 text-sm outline-none focus:border-zinc-950"
              />

              <input
                value={participant.walletAddress}
                onChange={(event) =>
                  updateParticipant(participant.id, {
                    walletAddress: event.target.value,
                  })
                }
                placeholder="0x recipient wallet"
                className="min-h-12 rounded-2xl border border-zinc-300 px-4 font-mono text-xs outline-none focus:border-zinc-950"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addParticipant}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-950"
        >
          <Plus className="h-4 w-4" />
          Add participant
        </button>
      </div>
    </div>
  );
}
