import { CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";

const indicators = [
  {
    title: "User-controlled wallet",
    description: "The user reviews and signs wallet actions.",
    icon: WalletCards,
  },
  {
    title: "Clear testnet labelling",
    description: "Prototype states are presented honestly and visibly.",
    icon: CheckCircle2,
  },
  {
    title: "Transparent transaction states",
    description: "Pending, successful and failed actions are designed to be clear.",
    icon: ShieldCheck,
  },
];

export function TrustIndicators() {
  return (
    <section
      aria-label="TrustVault product principles"
      className="border-b border-zinc-200 bg-zinc-50"
    >
      <div className="section-shell grid gap-px overflow-hidden border-x border-zinc-200 bg-zinc-200 sm:grid-cols-3">
        {indicators.map(({ title, description, icon: Icon }) => (
          <article key={title} className="bg-zinc-50 px-6 py-7 sm:px-7">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200">
                <Icon aria-hidden="true" className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
