import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Reveal, StaggerList } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";
import { EventInfoCards } from "@/components/marketing/EventInfoCards";
import { EventMediaGallery } from "@/components/marketing/EventMediaGallery";
import { EventCard } from "@/components/marketing/EventCard";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!event) notFound();

  const gallery = (event.gallery ?? []) as string[];
  const videos = (event.videos ?? []) as string[];
  const hasMedia = gallery.length > 0 || videos.length > 0;

  // Eventi correlati: stessa categoria, escluso l'evento corrente, i più recenti.
  const { data: relatedData, error: relatedError } = await supabase
    .from("events")
    .select("slug, title, city, date, price, cover_image")
    .eq("category", event.category)
    .neq("id", event.id)
    .order("date", { ascending: false })
    .limit(3);
  const relatedEvents = relatedError
    ? []
    : (relatedData ?? []).map((e) => ({
        slug: e.slug,
        title: e.title,
        city: e.city,
        date: e.date,
        price: e.price,
        coverImage: e.cover_image,
      }));

  return (
    <article>
      {/* HERO: COVER LEFT + INFO RIGHT */}
      <section className="relative overflow-hidden border-b border-border pt-28 pb-16 md:pt-36 md:pb-20">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 grid gap-8 md:grid-cols-2 md:items-center md:gap-10 lg:gap-14">
          {/* COVER — 16:9, il formato in cui le locandine sono davvero caricate
              (tutte le cover a database sono 1600×900).
              Prima la card si allungava fino all'altezza della colonna di testo
              (`md:h-full`, minimo 520px), che con descrizioni da mille caratteri
              arrivava anche oltre gli 800px: `object-cover` ritagliava una foto
              orizzontale dentro un riquadro verticale e ne mostrava una striscia
              centrale ingrandita. L'immagine non era "lunga", era un dettaglio.
              Con il rapporto nativo non si ritaglia più niente e l'altezza della
              foto (~310px su desktop) coincide con quella della colonna delle
              informazioni: da lì la simmetria del blocco. */}
          <Reveal>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-notte">
              {event.cover_image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={event.cover_image}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-6 text-center font-display text-2xl text-palco/25">
                  {event.title}
                </div>
              )}
              <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                {event.category}
              </span>
            </div>
          </Reveal>

          {/* COLONNA INFORMAZIONI — titolo, data/orario/luogo/prezzo e CTA. La
              descrizione non sta più qui: era lei a dettare l'altezza delle due
              colonne e a sbilanciare il blocco. */}
          <div className="flex flex-col">
            <Reveal>
              <p className="accent-label">evento</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="display-xl mt-3 text-4xl md:text-5xl lg:text-6xl">
                {event.title}
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8">
                <EventInfoCards
                  date={event.date}
                  endAt={event.end_at}
                  city={event.city}
                  venue={event.venue}
                  price={event.price}
                />
              </div>
            </Reveal>

            {event.ticket_url && (
              <Reveal delay={0.3}>
                <div className="mt-8">
                  <Button asChild variant="accent" size="lg">
                    <Link
                      href={event.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ArrowRight className="size-4" /> Scopri di più
                    </Link>
                  </Button>
                </div>
              </Reveal>
            )}
          </div>
        </div>

        {/* DESCRIZIONE — sotto il blocco foto/informazioni e a tutta pagina.
            `max-w-3xl` senza `mx-auto`: il testo parte dallo stesso bordo
            sinistro della foto invece di galleggiare al centro, e resta su una
            misura leggibile (~75 caratteri) anche su monitor grandi. */}
        {event.description && (
          <div className="container-narte relative z-10 mt-12 md:mt-16">
            <Reveal delay={0.25}>
              <div className="max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-palco/90 md:text-lg">
                {event.description}
              </div>
            </Reveal>
          </div>
        )}
      </section>

      {/* GALLERY + VIDEO — solo se c'è davvero del materiale: senza media la
          sezione occupava una fascia intera per dire che era vuota. */}
      {hasMedia && (
        <section className="bg-muted py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">galleria</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Foto e video.</h2>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8">
                <EventMediaGallery gallery={gallery} videos={videos} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* EVENTI CORRELATI — stessa categoria */}
      {relatedEvents.length > 0 && (
        <section className="border-t border-border py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">altri eventi</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">Eventi correlati.</h2>
            </Reveal>
            <StaggerList className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {relatedEvents.map((e) => (
                <EventCard key={e.slug} {...e} />
              ))}
            </StaggerList>
          </div>
        </section>
      )}

      <div className="container-narte py-10">
        <Link
          href="/eventi"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Torna a tutti gli eventi
        </Link>
      </div>
    </article>
  );
}
