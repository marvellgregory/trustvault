import {
  ArrowRight,
  Gift,
  LockKeyhole,
  ShoppingBag,
  Split,
  WalletCards,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Connect your wallet",
    description:
      "Start with a user-controlled wallet and review the network before any money action.",
    icon: WalletCards,
  },
  {
    number: "02",
    title: "Choose what you want to do",
    description:
      "Gift USDC, explore the marketplace, or divide a shared expense with clear next steps.",
    icon: ShoppingBag,
  },
  {
    number: "03",
    title: "Review the rules",
    description:
      "Confirm the recipient, amount, network, and any programmable conditions before signing.",
    icon: LockKeyhole,
  },
  {
    number: "04",
    title: "Complete on Arc Testnet",
    description:
      "Sign the transaction and follow its pending, successful, or failed state transparently.",
    icon: Gift,
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-950 py-20 text-white sm:py-24 lg:py-32">
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
              How TrustVault works
            </p>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              One guided flow from intent to confirmation.
            </h2>
            <p className="mt-6 text-pretty text-base leading-8 text-zinc-400">
              TrustVault is being designed to make important money actions feel
              understandable. Every step shows what is happening, what the user
              controls, and what still needs approval.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Arc Testnet prototype
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

                <h3 className="mt-10 text-xl font-semibold tracking-[-0.03em]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {description}
                </p>

                <ArrowRight
                  aria-hidden="true"
                  className="mt-8 h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-white"
                />
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-xs leading-5 text-zinc-500">
          The interface describes the intended user journey. Transaction steps
          will be marked live only after the Arc Testnet integration is verified.
        </p>
      </div>
    </section>
  );
}
