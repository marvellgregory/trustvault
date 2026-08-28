import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Bill Split Terms",
  description:
    "Terms relevant to TrustVault Bill Split functionality.",
};

const sections = [
  {
    title: "Shared payment coordination",
    paragraphs: [
      "Bill Split helps an organizer create and share payment requests between participants.",
      "TrustVault does not guarantee that a participant will complete a requested payment.",
    ],
  },
  {
    title: "Organizer responsibility",
    paragraphs: [
      "The organizer is responsible for reviewing participant details, requested amounts and payment information before distributing a Bill Split request.",
    ],
  },
  {
    title: "Participant payments",
    paragraphs: [
      "Each participant remains responsible for reviewing and authorizing their own wallet transaction.",
      "A Bill Split request itself does not transfer funds.",
    ],
  },
  {
    title: "Records and receipts",
    paragraphs: [
      "TrustVault may maintain application records describing Bill Split status while confirmed blockchain transactions remain the settlement record for onchain payments.",
    ],
  },
] as const;

export default function BillSplitTermsPage() {
  return (
    <InformationPage
      eyebrow="Legal"
      title="Bill Split Terms"
      description="Conditions applying to organizers, participants, requests and settlement records."
      sections={sections}
      updated="24 August 2026"
      backHref="/legal"
      backLabel="Back to Legal"
    />
  );
}