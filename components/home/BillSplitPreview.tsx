import Link from "next/link";
import { ArrowRight, CheckCircle2, ReceiptText } from "lucide-react";

const participants = [
  { name: "You", amount: "30.00", status: "Ready" },
  { name: "Friend 01", amount: "30.00", status: "Pending" },
  { name: "Friend 02", amount: "30.00", status: "Pending" },
];

export function BillSplitPreview() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-20 sm:py-24 lg:py-32">
      <div className="section-shell grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="order-2 lg:order-1">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[var(--tv-shadow-md)] sm:p-7">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Dinner split preview
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  90.00 USDC
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
                <ReceiptText aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.name}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{participant.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {participant.amount} USDC
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      participant.status === "Ready"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {participant.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm text-white">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Equal split calculated: 30.00 USDC each
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="section-kicker">Bill Split</p>
          <h2 className="section-title mt-4">
            Shared expenses without the awkward follow-up.
          </h2>
          <p className="section-copy mt-6">
            Start with a total, add participants and make every share, payment
            state and next action easy to understand.
          </p>

          <Link
            href="/bill-split"
            className="group mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
          >
            Explore Bill Split
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
