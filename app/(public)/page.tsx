import { HeroNarte } from "@/components/marketing/HeroNarte";
import { AboutBlock } from "@/components/marketing/AboutBlock";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { StarsSection } from "@/components/marketing/StarsSection";
import { EventsSection } from "@/components/marketing/EventsSection";
import { CollaborationsSection } from "@/components/marketing/CollaborationsSection";
import { PressSection } from "@/components/marketing/PressSection";
import { EventRequestSection } from "@/components/marketing/EventRequestSection";

export default function HomePage() {
  return (
    <>
      <HeroNarte />
      <AboutBlock />
      <HowItWorks />
      <StarsSection />
      <EventsSection />
      <CollaborationsSection />
      <PressSection />
      <EventRequestSection />
    </>
  );
}
