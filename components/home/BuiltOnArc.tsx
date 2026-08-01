import Image from "next/image";

export function BuiltOnArc() {
  return (
    <section className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="section-shell">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-950 px-6 py-12 text-white shadow-[var(--tv-shadow-lg)] sm:px-10 lg:px-14 lg:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Network foundation
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
                TrustVault is being built on Arc.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
                The hackathon MVP is focused on an honest Arc Testnet experience
                for programmable USDC gifting and shared payments. Integration
                claims will be updated only after each flow is verified.
              </p>
            </div>

            <div
              className="flex min-h-32 min-w-56 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white p-8"
              aria-label="Arc logo with required surrounding clear space"
            >
              <Image
                src="/brand/arc/logo-navy.svg"
                alt="Arc"
                width={180}
                height={70}
                className="h-[50px] w-auto"
              />
            </div>
          </div>

          <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-3">
            {[
              ["Environment", "Arc Testnet"],
              ["Core payment asset", "USDC"],
              ["Current status", "MVP in development"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          Arc is referenced as the network used by the prototype. This does not
          imply endorsement, certification or a formal partnership.
        </p>
      </div>
    </section>
  );
}
