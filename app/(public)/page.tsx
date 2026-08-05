import { HeroNarte } from "@/components/marketing/HeroNarte";
import { AboutBlock } from "@/components/marketing/AboutBlock";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { StarsSection } from "@/components/marketing/StarsSection";
import { PastEventsSection } from "@/components/marketing/PastEventsSection";
import { CollaborationsSection } from "@/components/marketing/CollaborationsSection";
import { BlogSection } from "@/components/marketing/BlogSection";
import { EventRequestSection } from "@/components/marketing/EventRequestSection";

/**
 * La home parla a chi cerca un artista: locali, organizzatori, chi mette in
 * piedi una serata. I piani sono un prodotto rivolto agli artisti e vivono
 * sulla loro landing (/candidatura-artista#piani), non qui: in mezzo alla home
 * chiedevano di abbonarsi a un lettore che non deve abbonarsi a niente.
 */
export default function HomePage() {
  return (
    <>
      <HeroNarte />
      <AboutBlock />
      <HowItWorks />
      <StarsSection />
      <PastEventsSection />
      <CollaborationsSection />
      {/* Il blog viene prima del form: chiude la parte "guarda cosa facciamo" e
          lascia a "Parla con noi" l'ultima parola della pagina, che è la
          conversione. Un modulo a metà pagina veniva scavalcato dagli articoli. */}
      <BlogSection />
      <EventRequestSection />
    </>
  );
}
