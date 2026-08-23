import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description:
    "Important information about wallet, blockchain and product risks.",
};

const sections = [
  {
    title: "Digital asset and blockchain risk",
    paragraphs: [
      "Digital asset transactions involve technical and financial risk. Transaction values, network conditions and third party services may change or become unavailable.",
      "A transaction submitted to a blockchain may be irreversible once confirmed.",
    ],
  },
  {
    title: "Wallet responsibility",
    paragraphs: [
      "Customers remain responsible for wallet access, device security, transaction review and safeguarding wallet credentials.",
      "TrustVault cannot recover a lost private key, seed phrase or recovery phrase.",
    ],
  },
  {
    title: "Testnet and staged functionality",
    paragraphs: [
      "Some TrustVault functionality may operate on Arc Testnet or another non-production environment during development and validation.",
      "Testnet assets do not represent guaranteed real world value and testnet behavior should not be treated as proof that future production functionality will behave identically.",
    ],
  },
  {
    title: "Smart contract and infrastructure risk",
    paragraphs: [
      "Smart contracts, wallet providers, RPC providers, blockchain infrastructure and third party software may contain defects, experience outages or behave unexpectedly.",
    ],
  },
  {
    title: "No guaranteed outcome",
    paragraphs: [
      "TrustVault does not guarantee that every transaction, purchase, gift, payment request, receipt, seller interaction or future feature will complete successfully.",
    ],
  },
] as const;

export default function RiskDisclosurePage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Risk Disclosure"
      description="Important risks to understand before using wallet based and blockchain functionality."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}