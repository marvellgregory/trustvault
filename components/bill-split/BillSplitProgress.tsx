const steps = [
  "Bill details",
  "Participants",
  "Split method",
  "Review",
];

export function BillSplitProgress({ step }: { step: number }) {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Progress
      </p>

      <div className="mt-5 space-y-3">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const complete = number < step;

          return (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                active ? "bg-zinc-950 text-white" : "text-zinc-600"
              }`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
