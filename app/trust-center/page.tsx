import type { Metadata } from "next";

import { InformationPage } from "@/components/information/InformationPage";

export const metadata: Metadata = {
  title: "Trust Center",
  description:
    "How TrustVault approaches wallet control, transaction review, network verification, public proof and product transparency.",
};

const sections = [
  {
    title: "Customer controlled wallet actions",
    paragraphs: [
      "TrustVault is designed around customer controlled wallets. Connecting a wallet establishes wallet context but does not by itself move funds.",
      "When a supported transaction requires authorization, the connected wallet presents the request and the customer decides whether to approve or reject it.",
    ],
    bullets: [
      "TrustVault does not require customers to provide private keys, seed phrases or recovery phrases.",
      "Customers should verify the connected wallet address before approving a money action.",
      "A wallet request should not be approved when the recipient, amount, network or transaction details are unexpected.",
    ],
  },
  {
    title: "Wallet identity and readiness",
    paragraphs: [
      "TrustVault does not treat every detected wallet provider as automatically ready for transaction use.",
      "The wallet architecture can evaluate provider identity, provider conflicts, connected account consistency, Arc network readiness and other transaction requirements before a supported money action proceeds.",
    ],
    bullets: [
      "A detected provider may still require explicit customer selection.",
      "Conflicting or unavailable provider information can invalidate wallet readiness.",
      "A changed account, provider or network can invalidate previously established readiness.",
      "Wallet qualification is based on current runtime evidence rather than wallet branding alone.",
    ],
  },
  {
    title: "Arc Testnet verification",
    paragraphs: [
      "Current supported blockchain transaction flows in TrustVault use Arc Testnet.",
      "Where a flow requires Arc Testnet, TrustVault checks the active network before transaction approval. A wallet on another network is not treated as transaction ready for that flow.",
    ],
    bullets: [
      "The customer can review the displayed network before signing.",
      "Some supported flows provide a network switch action when the wallet permits it.",
      "Testnet assets should not be treated as guaranteed real world value.",
    ],
  },
  {
    title: "Transaction review before approval",
    paragraphs: [
      "TrustVault separates product preparation from wallet authorization. Browsing, saving a product, adding an item to cart or creating application data does not by itself authorize a blockchain payment.",
      "Supported money actions use review steps so relevant transaction information can be checked before the connected wallet is asked to sign.",
    ],
    bullets: [
      "Marketplace review can include order total, buyer wallet, seller settlement wallet, network and estimated fee information.",
      "Gift Vault review can include recipient, USDC amount, connected wallet and, for timed gifts, unlock schedule information.",
      "Bill Split participants review their requested payment before authorizing their own wallet transaction.",
    ],
  },
  {
    title: "Receipts and public verification",
    paragraphs: [
      "TrustVault can create customer facing receipts containing application and transaction information.",
      "Where confirmed onchain data is available, TrustVault may provide an ArcScan link or QR path so the public blockchain transaction can be inspected independently.",
    ],
    bullets: [
      "A transaction hash provides a reference to public blockchain data where available.",
      "An ArcScan QR code can expose public transaction information but does not provide access to a customer's wallet.",
      "Application receipt data and public onchain transaction data serve different purposes.",
    ],
  },
  {
    title: "Application records and onchain settlement",
    paragraphs: [
      "TrustVault can maintain application records such as customer information, Marketplace orders, receipts, notifications, Gift Vault records and Bill Split records separately from blockchain settlement.",
      "For supported blockchain actions, confirmed onchain transaction state remains the evidence of what was actually settled on the network.",
    ],
  },
  {
    title: "Marketplace protection boundaries",
    paragraphs: [
      "TrustVault may identify a Marketplace product or transaction path as escrow eligible where an applicable escrow flow is available.",
      "Escrow eligibility is not a promise that every order enters escrow and is not a guarantee of a refund, dispute outcome or seller performance.",
    ],
    bullets: [
      "Customers should review product, seller, price, quantity and delivery information before checkout.",
      "Where an order actually uses an implemented escrow flow, the applicable transaction and smart contract conditions determine the actions technically available.",
      "A confirmed blockchain payment is not automatically reversible.",
    ],
  },
  {
    title: "Product status transparency",
    paragraphs: [
      "TrustVault distinguishes between functionality that is currently available and product areas that are still being developed or validated.",
      "Features marked testnet, preview or coming soon should not be interpreted as production financial services or guaranteed future functionality.",
    ],
    bullets: [
      "Swap remains a coming soon area.",
      "TrustVault does not currently provide customer swap execution, liquidity routing or a customer swap contract through the Swap interface.",
      "Wallet capability and qualification can vary by provider and runtime conditions.",
    ],
  },
  {
    title: "What the Trust Center does not claim",
    paragraphs: [
      "This Trust Center describes controls and behavior that are represented in the current TrustVault product. It does not represent a certification, independent security audit, insurance policy, regulatory approval or guarantee that software and blockchain systems cannot fail.",
      "Customers should review the Risk Disclosure and relevant product terms before using wallet based or blockchain functionality.",
    ],
  },
] as const;

export default function TrustCenterPage() {
  return (
    <InformationPage
      eyebrow="Trust & transparency"
      title="Trust Center"
      description="A clear view of what TrustVault verifies, what the customer controls and what the blockchain can independently prove."
      sections={sections}
      updated="24 August 2026"
      backHref="/"
      backLabel="Back to TrustVault"
    />
  );
}