import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";
import { EventInfoCards } from "@/components/marketing/EventInfoCards";
import { EventMediaGallery } from "@/components/marketing/EventMediaGallery";

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

  return (
    <article>
      {/* HERO: COVER LEFT + INFO RIGHT */}
      <section className="relative overflow-hidden border-b border-border pt-28 pb-16 md:pt-36 md:pb-20">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 sm:h-[1000px] sm:w-[1000px]"
        />
        <div className="container-narte relative z-10 grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-14">
          {/* COVER CARD — su desktop si estende all'altezza della colonna di
              testo (h-full), così le due colonne finiscono alla stessa quota e
              non resta spazio morto. Su mobile torna al formato 4:5.
              object-cover riempie sempre: con object-contain le cover lasciavano bande. */}
          <div className="md:h-full">
            <Reveal className="md:h-full">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-notte md:aspect-auto md:h-full md:min-h-[520px]">
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
          </div>

          {/* COLONNA TESTO — titolo, info, descrizione e CTA insieme: è la
              descrizione a dare a questa colonna l'altezza della card. */}
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

            {event.description && (
              <Reveal delay={0.25}>
                <div className="mt-8 rounded-2xl border border-border bg-muted p-5 md:p-6">
                  <p className="accent-label mb-3">descrizione</p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground md:text-base">
                    {event.description}
                  </div>
                </div>
              </Reveal>
            )}

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
