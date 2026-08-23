import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Refunds and Disputes",
  description:
    "Information about transaction issues, refunds and Marketplace disputes.",
};

const sections = [
  {
    title: "Blockchain transactions",
    paragraphs: [
      "A confirmed blockchain payment is not automatically reversible. TrustVault cannot promise that a completed onchain transaction can be cancelled or recovered.",
    ],
  },
  {
    title: "Marketplace issues",
    paragraphs: [
      "Marketplace product, fulfillment or seller issues should be reviewed using the support and transaction information available for the relevant order.",
    ],
  },
  {
    title: "Escrow based flows",
    paragraphs: [
      "Where an order actually uses an implemented escrow flow, the relevant smart contract conditions and transaction state determine what actions are technically available.",
      "Escrow eligibility does not itself guarantee a refund or a particular dispute outcome.",
    ],
  },
  {
    title: "Evidence",
    bullets: [
      "Keep the TrustVault order ID and receipt.",
      "Keep the relevant transaction hash.",
      "Keep seller or participant communications where applicable.",
      "Do not share private keys, seed phrases or recovery phrases as support evidence.",
    ],
  },
] as const;

export default function RefundsDisputesPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Refunds and Disputes"
      description="How TrustVault customers should understand transaction issues and available resolution paths."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}