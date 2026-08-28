import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Swap Terms",
  description:
    "Disclosures applicable to future TrustVault swap functionality.",
};

const sections = [
  {
    title: "Current availability",
    paragraphs: [
      "TrustVault Swap is not currently an active transaction feature.",
      "The TrustVault navigation may display Swap as a coming soon product area, but customers cannot currently execute swaps through TrustVault.",
    ],
  },
  {
    title: "Future functionality",
    paragraphs: [
      "If swap functionality becomes available in the future, additional transaction review, pricing, routing, third party and blockchain disclosures may apply.",
    ],
  },
  {
    title: "No current execution",
    paragraphs: [
      "TrustVault does not currently provide swap execution, liquidity routing or a customer swap contract through this interface.",
    ],
  },
] as const;

export default function SwapTermsPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Swap Terms"
      description="Current disclosures for the TrustVault Swap area while functionality remains coming soon."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}