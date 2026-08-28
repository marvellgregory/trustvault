import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "The future TrustVault work that remains after the currently shipped Arc Testnet experience.",
};

const sections = [
  {
    title: "How to read this roadmap",
    paragraphs: [
      "The TrustVault Roadmap contains future work only. Features that have already shipped belong in Release Notes instead.",
      "Roadmap items describe direction rather than guaranteed delivery dates. Production and mainnet decisions depend on verified technical readiness, wallet behavior, network support and customer safety.",
    ],
  },
  {
    title: "Production readiness",
    paragraphs: [
      "TrustVault currently operates supported blockchain transaction flows on Arc Testnet. Moving beyond the current testnet environment requires verified readiness rather than a calendar commitment.",
    ],
    bullets: [
      "Complete production readiness checks for customer transaction flows.",
      "Validate network, wallet, settlement and receipt behavior against the production environment when the required Arc infrastructure is available and verified.",
      "Preserve explicit customer review and wallet approval for money actions.",
      "Complete mobile browser and installed application regression testing before production rollout.",
    ],
  },
  {
    title: "Wallet qualification expansion",
    paragraphs: [
      "TrustVault will continue qualifying wallet providers individually instead of treating every detected injected wallet as automatically supported.",
    ],
    bullets: [
      "Enable additional wallet providers only after provider identity, Arc compatibility, account continuity and transaction behavior are tested.",
      "Keep unavailable or unqualified wallet providers clearly distinguished from supported wallets.",
      "Revalidate wallet readiness when provider, account or network evidence changes.",
    ],
  },
  {
    title: "Marketplace completion and seller operations",
    paragraphs: [
      "Future Marketplace work is focused on production readiness, seller operations and customer clarity rather than expanding the core TrustVault feature set.",
    ],
    bullets: [
      "Complete the remaining seller-facing operational experience.",
      "Continue mobile Marketplace refinement and clearer customer information.",
      "Keep order, payment, receipt and activity states consistent across customer surfaces.",
      "Preserve onchain settlement evidence separately from application records.",
    ],
  },
  {
    title: "Cross-device customer persistence",
    paragraphs: [
      "Some customer experiences currently use local device persistence. Future authenticated persistence can extend selected customer data across devices where doing so is appropriate.",
    ],
    bullets: [
      "Add authenticated cross-device Wishlist synchronization using safe merge behavior.",
      "Preserve local Wishlist items when a customer signs in, signs out or disconnects a wallet.",
      "Continue durable customer, order, receipt, notification, Gift Vault and Bill Split records without storing wallet private keys or recovery secrets.",
    ],
  },
  {
    title: "Atlas",
    paragraphs: [
      "Atlas is planned as a staged TrustVault assistant rather than an autonomous money mover.",
    ],
    bullets: [
      "Stage one: read-only product guidance grounded in TrustVault documentation and current application state.",
      "Later stages may prepare transaction information for customer review.",
      "Any money action must remain subject to explicit human review and wallet approval.",
      "Atlas must not independently move customer funds.",
    ],
  },
  {
    title: "Swap",
    paragraphs: [
      "Swap remains a coming soon product area. TrustVault does not currently provide customer swap execution, liquidity routing or a customer swap contract through the Swap interface.",
      "Any future Swap implementation must be introduced only after the required transaction review, pricing, routing, wallet and network behavior has been verified.",
    ],
  },
  {
    title: "Release criteria",
    paragraphs: [
      "A roadmap item is not considered shipped merely because code or a preview exists. Customer-visible release status requires the applicable implementation, validation and customer regression checks to pass.",
      "Once an item is shipped, it moves out of the Roadmap and into Release Notes.",
    ],
  },
] as const;

export default function RoadmapPage() {
  return (
    <InformationPage
      eyebrow="Future direction"
      title="Roadmap"
      description="What remains ahead for TrustVault, separated clearly from functionality that is already available."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}