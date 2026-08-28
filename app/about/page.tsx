import type { Metadata } from "next";
import Image from "next/image";
import {
  FaGithub,
  FaLinkedinIn,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "About TrustVault",
  description:
    "What TrustVault is building across Marketplace, Gift Vault, Bill Split, wallet controlled transaction review and verifiable Arc Testnet activity.",
};

const builderLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/marvell-darlyn-gregory-b69ba71bb/",
    icon: FaLinkedinIn,
  },
  {
    label: "X",
    href: "https://x.com/YoungestGrandad",
    icon: FaXTwitter,
  },
  {
    label: "GitHub",
    href: "https://github.com/marvellgregory",
    icon: FaGithub,
  },
] as const;

const sections = [
  {
    title: "What TrustVault is",
    paragraphs: [
      "TrustVault is a consumer focused application that brings gifting, Marketplace commerce, shared payments and transaction verification into one connected experience.",
      "The current blockchain transaction environment is Arc Testnet, with USDC used by the supported payment and gifting experiences shown in the application.",
    ],
  },
  {
    title: "Gift. Shop. Split. Verify.",
    paragraphs: [
      "TrustVault is organized around a simple customer journey: prepare a gift, shop through the Marketplace, split shared expenses and verify supported transaction activity.",
    ],
    bullets: [
      "Gift Vault supports direct USDC gifting and timed gift experiences.",
      "Marketplace supports product discovery, Wishlist, Cart, checkout, payment review, orders and receipts.",
      "Bill Split helps organizers create shared payment obligations and participants review their exact share before supported settlement.",
      "Receipts and activity surfaces help customers follow supported transaction state and public onchain evidence where available.",
    ],
  },
  {
    title: "Customer controlled wallet actions",
    paragraphs: [
      "TrustVault is designed around customer controlled wallets. Connecting a wallet establishes wallet context but does not by itself move funds.",
      "When a supported transaction requires approval, the connected wallet remains responsible for presenting the action for customer review and authorization.",
    ],
    bullets: [
      "Review wallet addresses before money actions.",
      "Review recipient, amount and network details before approval.",
      "TrustVault does not require private keys, seed phrases or recovery phrases.",
    ],
  },
  {
    title: "Application records and blockchain evidence",
    paragraphs: [
      "TrustVault keeps application records such as customer information, orders, receipts, notifications, Gift Vault records and Bill Split records separate from blockchain settlement evidence.",
      "Where an action is confirmed onchain, the transaction hash and applicable Arc Testnet explorer information can provide public evidence of that settlement.",
    ],
  },
  {
    title: "About the Builder",
    content: (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-10">
        <div className="mx-auto w-full max-w-[17rem] sm:max-w-[19rem] lg:mx-0 lg:max-w-sm">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
            <Image
              src="/images/builder/marvell-darlyn-gregory.png"
              alt="Portrait of Marvell Darlyn Gregory, builder of TrustVault"
              fill
              sizes="(max-width: 1024px) 384px, 320px"
              className="object-cover object-top"
            />
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-3xl">
            Marvell Darlyn Gregory
          </p>

          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
            Builder of TrustVault
          </p>

          <div className="mt-6 space-y-4 text-[15px] leading-7 text-zinc-600">
            <p>
              Marvell brings more than two decades of experience across Sales, Go to Market Strategy, Business Development, Customer Success and Operations, helping technology businesses grow through customer focused execution and long term partnerships.
            </p>

            <p>
              Today, that commercial experience is being combined with Web3 product development through TrustVault.
            </p>

            <p>
              TrustVault is being built as an exploration of how programmable money can make everyday financial interactions simpler, clearer and more useful. Built on Arc Testnet and designed around USDC, the product brings together practical experiences including commerce, USDC gifting, bill splitting and verifiable transaction records.
            </p>

            <p>
              The goal is simple: take technologies that often feel complex and turn them into financial experiences that ordinary people can understand and use.
            </p>

            <p>
              His interests span programmable money, stablecoins, blockchain payments, AI powered financial applications, SaaS growth and product development at the intersection of fintech, AI and Web3.
            </p>
          </div>

          <nav
            aria-label="Marvell Darlyn Gregory social links"
            className="mt-7 flex flex-wrap items-center gap-2"
          >
            {builderLinks.map(
              ({
                label,
                href,
                icon: Icon,
              }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Marvell Darlyn Gregory on ${label}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                >
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4"
                  />

                  <span>{label}</span>
                </a>
              ),
            )}
          </nav>
        </div>
      </div>
    ),
  },
  {
    title: "Current product stage",
    paragraphs: [
      "TrustVault is currently a staged Arc Testnet product build. Features marked preview, testnet or coming soon should not be interpreted as production financial services or guaranteed future functionality.",
      "Production and mainnet decisions depend on verified technical, wallet, network and customer readiness rather than a fixed public launch date.",
    ],
  },
  {
    title: "Product direction",
    paragraphs: [
      "The product focus is completion, validation and production readiness across the existing TrustVault experience rather than adding more unrelated core features.",
      "Future direction and shipped work are kept separate through the Roadmap and Release Notes.",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <InformationPage
      eyebrow="About TrustVault"
      title="Built around clear customer actions."
      description="One connected experience for gifting, Marketplace commerce, shared payments and verifiable transaction state."
      sections={sections}
      updated="25 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}