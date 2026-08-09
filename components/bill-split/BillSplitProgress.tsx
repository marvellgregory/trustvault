const steps = [
  "Bill details",
  "Participants",
  "Split method",
  "Review",
];

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
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Progress
      </p>

      <div className="mt-5 space-y-3">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const complete = number < maxStepReached;
          const available = number <= maxStepReached;
          const disabled = !available || navigationDisabled;

          return (
            <button
              type="button"
              key={label}
              onClick={() => onStepSelect(number)}
              disabled={disabled}
              aria-current={active ? "step" : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                active
                  ? "bg-zinc-950 text-white"
                  : complete
                    ? "cursor-pointer text-zinc-700 hover:bg-zinc-100"
                    : available
                      ? "cursor-pointer text-zinc-700 hover:bg-zinc-100"
                      : "cursor-not-allowed text-zinc-400 opacity-65"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-white text-zinc-950"
                    : complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {number}
              </span>

              <span className="text-sm font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-5 text-zinc-500">
        Select any step you have already reached to edit it without rebuilding
        the Bill Split.
      </p>
    </div>
  );
}
