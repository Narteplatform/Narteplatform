import { HeroNarte } from "@/components/marketing/HeroNarte";
import { AboutBlock } from "@/components/marketing/AboutBlock";
import { StarsSection } from "@/components/marketing/StarsSection";
import { EventsSection } from "@/components/marketing/EventsSection";
import { CollaborationsSection } from "@/components/marketing/CollaborationsSection";
import { EventRequestSection } from "@/components/marketing/EventRequestSection";

export default function HomePage() {
  return (
    <>
      <HeroNarte />
      <AboutBlock />
      <StarsSection />
      <EventsSection />
      <CollaborationsSection />
      <EventRequestSection />
    </>
  );
}
