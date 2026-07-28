import { HeroNarte } from "@/components/marketing/HeroNarte";
import { AboutBlock } from "@/components/marketing/AboutBlock";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { StarsSection } from "@/components/marketing/StarsSection";
import { EventsSection } from "@/components/marketing/EventsSection";
import { CollaborationsSection } from "@/components/marketing/CollaborationsSection";
import { BlogSection } from "@/components/marketing/BlogSection";
import { EventRequestSection } from "@/components/marketing/EventRequestSection";
import { PricingSection } from "@/components/marketing/PricingSection";

export default function HomePage() {
  return (
    <>
      <HeroNarte />
      <AboutBlock />
      <HowItWorks />
      <StarsSection />
      <EventsSection />
      <CollaborationsSection />
      <PricingSection />
      <EventRequestSection />
      <BlogSection />
    </>
  );
}
