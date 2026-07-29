import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicEvents } from "@/lib/data/events";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { PageHero } from "@/components/marketing/PageHero";
import { EventCard } from "@/components/marketing/EventCard";
import { LogoMarquee, type CollabLogo } from "@/components/marketing/LogoMarquee";

export const metadata = {
  title: "Collaborazioni — N'arte",
  description:
    "Gli eventi che abbiamo prodotto e le realtà con cui li abbiamo fatti: parchi, ristoranti, comuni e festival fra Napoli e la Campania.",
};

/**
 * L'archivio cresce da solo insieme al calendario. Il tetto serve a non far
 * crescere la pagina all'infinito: oltre questa soglia si rimanda a /eventi,
 * che ha i filtri. Alzarlo o abbassarlo è una modifica a questa sola riga.
 */
const PAST_EVENTS_LIMIT = 24;

async function getCollabs(): Promise<CollabLogo[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("collaborations")
      .select("id, name, logo_url, link")
      .order("order_index", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function CollaborazioniPage() {
  const [pastEvents, collaborations] = await Promise.all([
    getPublicEvents({ when: "past", limit: PAST_EVENTS_LIMIT }),
    getCollabs(),
  ]);

  return (
    <>
      <PageHero
        label="collaborazioni"
        title="Collaborazioni"
        description={
          <>
            Ogni serata qui sotto è nata insieme a qualcuno: un parco, un
            ristorante, un comune, un festival. Questo è quello che abbiamo
            costruito finora.
          </>
        }
      />

      {/* ARCHIVIO EVENTI — si aggiorna da solo: la query confronta la data con
          adesso, quindi un evento si sposta qui la mattina dopo. */}
      <section className="border-b border-border py-20 md:py-28">
        <div className="container-narte">
          <Reveal>
            <p className="accent-label mb-3">archivio</p>
          </Reveal>
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <Reveal delay={0.1}>
              <h2 className="display-xl text-balance text-4xl md:text-6xl">
                Gli eventi che abbiamo già fatto
              </h2>
            </Reveal>
            {pastEvents && pastEvents.length > 0 && (
              <Reveal delay={0.2}>
                <Link
                  href="/eventi?when=past"
                  className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Vedi tutto l&rsquo;archivio
                  <ArrowRight className="size-4 transition-transform duration-220 ease-[var(--ease-out)] group-hover:translate-x-1" />
                </Link>
              </Reveal>
            )}
          </div>

          {pastEvents === null ? (
            // Query fallita: non è "zero eventi", e dirlo sarebbe falso.
            <p className="text-pretty text-muted-foreground">
              L&rsquo;archivio non è raggiungibile in questo momento. Riprova fra
              poco.
            </p>
          ) : pastEvents.length === 0 ? (
            <p className="text-pretty text-muted-foreground">
              Stiamo caricando l&rsquo;archivio degli eventi passati.
            </p>
          ) : (
            <StaggerList className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {pastEvents.map((e) => (
                <EventCard key={e.slug} {...e} />
              ))}
            </StaggerList>
          )}
        </div>
      </section>

      {/* PARTNER — nastro di loghi in scorrimento */}
      <section className="bg-[#F7F5F2] py-20 text-notte md:py-28">
        <div className="container-narte">
          <Reveal>
            <p className="accent-label mb-3">insieme a</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl text-notte md:text-6xl">
              Le realtà che ci aprono le porte
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 max-w-xl text-pretty text-sm text-notte/70 md:text-base">
              Location, sponsor e istituzioni con cui lavoriamo. Se organizzi
              qualcosa e ti serve musica dal vivo, il posto giusto per iniziare è
              una riga in un modulo.
            </p>
          </Reveal>
        </div>

        {collaborations.length > 0 ? (
          <Reveal delay={0.25}>
            <LogoMarquee logos={collaborations} speed={34} className="mt-12" />
          </Reveal>
        ) : (
          <div className="container-narte">
            <p className="mt-8 text-sm text-notte/60">
              Stiamo aggiornando la lista delle collaborazioni.
            </p>
          </div>
        )}

        <div className="container-narte">
          <Reveal delay={0.3}>
            <div className="mt-12 flex justify-center">
              <Link
                href="/#richiedi"
                className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-azzurro transition-colors hover:text-azzurro-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro focus-visible:ring-offset-2"
              >
                Raccontaci il tuo evento
                <ArrowRight className="size-4 transition-transform duration-220 ease-[var(--ease-out)] group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
