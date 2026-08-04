import type { Metadata } from "next";

import { PaymentReviewPage } from "@/components/marketplace/payment-review/PaymentReviewPage";

type PaymentReviewRouteProps = {
  searchParams: Promise<{
    orderId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Payment Review | TrustVault",
  description:
    "Review wallet, network, order, escrow and payment details before approving a TrustVault Marketplace transaction.",
};

export default async function PaymentReviewRoute({
  searchParams,
}: PaymentReviewRouteProps) {
  const { orderId } = await searchParams;

  return (
    <main className="min-h-screen bg-zinc-50">
      <PaymentReviewPage
        orderId={
          typeof orderId === "string"
            ? orderId
            : undefined
        }
      />
    </main>
  );
}
