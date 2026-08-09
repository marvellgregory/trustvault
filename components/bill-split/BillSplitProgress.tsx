import {
  Check,
  ListChecks,
  ReceiptText,
  Split,
  UsersRound,
} from "lucide-react";

const steps = [
  { id: 1, label: "Bill details", icon: ReceiptText },
  { id: 2, label: "Participants", icon: UsersRound },
  { id: 3, label: "Split method", icon: Split },
  { id: 4, label: "Review", icon: ListChecks },
] as const;

export function BillSplitProgress({
  step,
  maxStepReached,
  onStepSelect,
  navigationDisabled = false,
}: {
  step: number;
  maxStepReached: number;
  onStepSelect: (step: number) => void;
  navigationDisabled?: boolean;
}) {
  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Progress
        </p>

        <ol className="mt-6 space-y-3">
          {steps.map(({ id, label, icon: Icon }) => {
            const isCurrent = step === id;
            const isComplete = maxStepReached > id;
            const isAvailable = id <= maxStepReached;
            const disabled = !isAvailable || navigationDisabled;

            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onStepSelect(id)}
                  disabled={disabled}
                  aria-current={isCurrent ? "step" : undefined}
                  title={
                    disabled
                      ? "Complete the earlier steps first"
                      : isCurrent
                        ? `${label} is currently open`
                        : `Edit ${label.toLowerCase()}`
                  }
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    isCurrent
                      ? "bg-zinc-950 text-white"
                      : isComplete
                        ? "cursor-pointer bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : isAvailable
                          ? "cursor-pointer text-zinc-700 hover:bg-zinc-100"
                          : "cursor-not-allowed text-zinc-400 opacity-60"
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isCurrent
                        ? "bg-white/10"
                        : isComplete
                          ? "bg-white"
                          : "bg-zinc-100"
                    }`}
                  >
                    {isComplete ? (
                      <Check aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Icon aria-hidden="true" className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
                      Step {id}
                    </p>
                    <p className="truncate text-sm font-semibold">{label}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-[11px] leading-5 text-zinc-500">
          Select any step you have already reached to review or edit it. Your
          entered details stay in place.
        </p>

        <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">
          Changes made to earlier steps are carried forward automatically when
          you return to Review.
        </div>
      </div>
    </aside>
  );
}
