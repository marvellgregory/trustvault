import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ShoppingBag,
  WalletCards,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Connect your wallet",
    description:
      "Start with a user-controlled wallet and verify the active network before a money action.",
    icon: WalletCards,
  },
  {
    number: "02",
    title: "Choose your flow",
    description:
      "Send or lock a gift, shop the Marketplace, or create and settle a shared expense.",
    icon: ShoppingBag,
  },
  {
    number: "03",
    title: "Review before signing",
    description:
      "Confirm the recipient, amount, Arc Testnet network and transaction details before wallet approval.",
    icon: LockKeyhole,
  },
  {
    number: "04",
    title: "Verify the result",
    description:
      "Follow transaction state, receipts and ArcScan links wherever TrustVault has verifiable onchain data.",
    icon: CheckCircle2,
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-950 py-18 text-white sm:py-20 lg:py-24">
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
              How TrustVault works
            </p>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              One guided flow from intent to verification.
            </h2>
            <p className="mt-6 text-pretty text-base leading-8 text-zinc-400">
              TrustVault keeps important money actions understandable by showing
              what the user controls, what the wallet must approve and what the
              network has actually confirmed.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Working on Arc Testnet
            </div>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <li
                key={number}
                className="group rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold tracking-[0.18em] text-zinc-500">
                    {number}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>

                <h3 className="mt-10 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{description}</p>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-8 h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-white"
                />
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-xs leading-5 text-zinc-500">
          TrustVault is a testnet build. Only states backed by the current
          application repositories or Arc Testnet data are presented as verified.
        </p>
      </div>
    </section>
  );
}
