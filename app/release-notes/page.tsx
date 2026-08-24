import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Release Notes",
  description:
    "A factual record of customer-facing TrustVault functionality that has shipped in the current Arc Testnet build.",
};

const sections = [
  {
    title: "24 August 2026: Trust Center",
    paragraphs: [
      "TrustVault added a customer-facing Trust Center describing wallet control, transaction review, Arc Testnet verification, public transaction proof and product-status boundaries.",
    ],
    bullets: [
      "Added the /trust-center customer route.",
      "Connected the Footer Trust Center link to the live page.",
      "Connected the homepage Trust Center verification action to the live page.",
      "Documented the distinction between wallet connection, transaction preparation and customer wallet approval.",
      "Clarified that Swap is not currently an active transaction feature.",
    ],
  },
  {
    title: "24 August 2026: Help and Documentation",
    paragraphs: [
      "TrustVault added customer Help and Documentation pages for the currently implemented Marketplace, Gift Vault, Bill Split, wallet, receipt and Arc Testnet experiences.",
    ],
    bullets: [
      "Added /help and /documentation.",
      "Documented wallet and network checks before transaction approval.",
      "Documented Marketplace, Wishlist, Gift Vault, Bill Split and receipt behavior.",
      "Documented the distinction between application records and onchain settlement evidence.",
    ],
  },
  {
    title: "24 August 2026: Legal and policy center",
    paragraphs: [
      "TrustVault added a dedicated Legal center containing customer-facing policies and product disclosures for the current staged product environment.",
    ],
    bullets: [
      "Added Terms and Privacy pages.",
      "Added Risk Disclosure and Acceptable Use pages.",
      "Added Marketplace, Gift Vault and Bill Split product terms.",
      "Added Swap disclosures and Refunds & Disputes information.",
    ],
  },
  {
    title: "Customer Wishlist",
    paragraphs: [
      "Marketplace customers can save products to a Wishlist without requiring a wallet or authenticated account.",
    ],
    bullets: [
      "Wishlist items persist on the current device using local customer storage.",
      "Signing out or disconnecting a wallet does not intentionally erase the local Wishlist.",
      "Products can be added to Cart from Wishlist without automatically removing the saved item.",
    ],
  },
  {
    title: "Installable TrustVault experience",
    paragraphs: [
      "TrustVault added the foundation for installation as a progressive web application on supported browsers and devices.",
    ],
    bullets: [
      "Added the TrustVault web app manifest.",
      "Added application install icons and Apple home-screen branding.",
      "Added the TrustVault install experience.",
      "Kept the browser favicon and installed application branding as separate product assets.",
    ],
  },
  {
    title: "Customer notifications",
    paragraphs: [
      "TrustVault added customer notification surfaces and authenticated notification read behavior.",
    ],
    bullets: [
      "Added the customer notification inbox.",
      "Added authenticated notification retrieval and read lifecycle behavior.",
      "Improved access to notifications on mobile.",
      "Added Bill Split notifications for request and confirmed-payment events.",
    ],
  },
  {
    title: "Current transaction environment",
    paragraphs: [
      "The functionality described in these Release Notes belongs to the current TrustVault build. Supported blockchain transaction experiences presently use Arc Testnet and USDC where shown by the application.",
      "Testnet availability does not imply production or mainnet availability, and testnet assets should not be treated as guaranteed real world value.",
    ],
  },
] as const;

export default function ReleaseNotesPage() {
  return (
    <InformationPage
      eyebrow="What shipped"
      title="Release Notes"
      description="A factual record of customer-facing TrustVault improvements that are already part of the current build."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}