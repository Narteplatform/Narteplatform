import Link from "next/link";
import { Ticket } from "lucide-react";
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

  return (
    <article>
      {/* HERO IMAGE + TITLE OVERLAY */}
      <section className="relative overflow-hidden">
        {event.cover_image ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.cover_image}
              alt={event.title}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-muted" />
        )}

        <div className="container-narte relative -mt-24 pb-8 md:-mt-32">
          <div className="rounded-2xl border border-border bg-background/80 p-6 backdrop-blur md:p-10">
            <Reveal>
              <p className="accent-label">{event.category}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="display-xl mt-3 text-4xl md:text-6xl lg:text-7xl">
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
                <div className="mt-6">
                  <Button asChild variant="accent" size="lg">
                    <Link
                      href={event.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Ticket className="size-4" /> Acquista biglietti
                    </Link>
                  </Button>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* DESCRIZIONE */}
      {event.description && (
        <section className="bg-muted py-16 md:py-24">
          <div className="container-narte">
            <Reveal>
              <p className="accent-label mb-3">descrizione</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="display-xl text-3xl md:text-5xl">
                Cosa ti aspetta.
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-muted-foreground md:text-lg">
                {event.description}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* GALLERY */}
      <section className="border-t border-border py-16 md:py-24">
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

      <div className="container-narte pb-16">
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
