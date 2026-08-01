import { BillSplitPreview } from "@/components/home/BillSplitPreview";
import { BuiltOnArc } from "@/components/home/BuiltOnArc";
import { Capabilities } from "@/components/home/Capabilities";
import { FeaturedMarketplace } from "@/components/home/FeaturedMarketplace";
import { FinalCta } from "@/components/home/FinalCta";
import { GiftVaultPreview } from "@/components/home/GiftVaultPreview";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TrustIndicators } from "@/components/home/TrustIndicators";

export default function Home() {
  return (
    <main>
      <Hero />
      <TrustIndicators />
      <Capabilities />
      <HowItWorks />
      <FeaturedMarketplace />
      <GiftVaultPreview />
      <BillSplitPreview />
      <BuiltOnArc />
      <FinalCta />
    </main>
  );
}
