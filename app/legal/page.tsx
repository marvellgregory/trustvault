import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  FileText,
  Scale,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "TrustVault legal information, product terms, disclosures and policies.",
};

const legalResources = [
  {
    title: "Terms of Use",
    description:
      "The general terms governing access to and use of TrustVault.",
    href: "/legal/terms",
  },
  {
    title: "Privacy Policy",
    description:
      "How TrustVault handles customer information and privacy.",
    href: "/legal/privacy",
  },
  {
    title: "Risk Disclosure",
    description:
      "Important information about wallets, digital assets, blockchain transactions and product risks.",
    href: "/legal/risk-disclosure",
  },
  {
    title: "Marketplace Terms",
    description:
      "Terms relevant to Marketplace purchases, sellers, orders and transaction records.",
    href: "/legal/marketplace",
  },
  {
    title: "Gift Vault Terms",
    description:
      "Terms relevant to programmable gifting, recipients and release conditions.",
    href: "/legal/gift-vault",
  },
  {
    title: "Bill Split Terms",
    description:
      "Terms relevant to shared payment requests, participants and settlement records.",
    href: "/legal/bill-split",
  },
  {
    title: "Swap Terms",
    description:
      "Disclosures and conditions applicable when swap functionality becomes available.",
    href: "/legal/swap",
  },
  {
    title: "Refunds & Disputes",
    description:
      "Information about transaction issues, Marketplace disputes and available support paths.",
    href: "/legal/refunds-disputes",
  },
  {
    title: "Acceptable Use",
    description:
      "Rules designed to protect customers, participants and the TrustVault ecosystem.",
    href: "/legal/acceptable-use",
  },
] as const;

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="border-b border-zinc-200 bg-white">
        <div className="section-shell py-14 sm:py-20">
          <div className="max-w-4xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <Scale
                aria-hidden="true"
                className="h-5 w-5"
              />
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-red)]">
              TrustVault information
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-5xl lg:text-6xl">
              Legal and product policies
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-600 sm:text-lg">
              Find the terms, disclosures and policies that apply
              across TrustVault and its individual product experiences.
            </p>
          </div>
        </div>
      </section>

      <section className="section-shell py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {legalResources.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="group flex min-h-64 flex-col rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[var(--tv-shadow-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950">
                <FileText
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </span>

              <h2 className="mt-7 text-xl font-semibold tracking-[-0.025em] text-zinc-950">
                {resource.title}
              </h2>

              <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600">
                {resource.description}
              </p>

              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950">
                Read policy

                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition group-hover:translate-x-1"
                />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-red)]"
          />

          <div>
            <h2 className="font-semibold text-zinc-950">
              Product status matters
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">
              TrustVault is being developed progressively. A policy
              page describing a planned capability does not mean that
              capability is currently available. Product interfaces
              and transaction review screens should be used to confirm
              what is available at the time of use.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
