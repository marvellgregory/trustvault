import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "About TrustVault",
  description:
    "What TrustVault is building across Marketplace, Gift Vault, Bill Split, wallet controlled transaction review and verifiable Arc Testnet activity.",
};

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
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}