import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Gift Vault Terms",
  description:
    "Terms relevant to TrustVault Gift Vault functionality.",
};

const sections = [
  {
    title: "Customer initiated gifts",
    paragraphs: [
      "Gift Vault allows customers to prepare supported gifting transactions for a recipient using the available TrustVault flow.",
      "Customers are responsible for verifying recipient addresses, amounts and release conditions before authorizing a transaction.",
    ],
  },
  {
    title: "Timed gifts",
    paragraphs: [
      "Where a gift uses an unlock time, the selected date, time and timezone are converted into the transaction parameters used by the relevant Gift Vault flow.",
      "Customers should review those conditions before wallet approval because confirmed blockchain transactions may not be reversible.",
    ],
  },
  {
    title: "Gift messages",
    paragraphs: [
      "Optional gift messages are application data associated with the gift experience. Customers should avoid including secrets, passwords, private keys, seed phrases or other sensitive credentials.",
    ],
  },
  {
    title: "Recipient claims",
    paragraphs: [
      "Recipient claim functionality depends on the relevant gift conditions, connected wallet, network and onchain state.",
    ],
  },
] as const;

export default function GiftVaultTermsPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Gift Vault Terms"
      description="Important conditions for send now and timed TrustVault gift experiences."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}