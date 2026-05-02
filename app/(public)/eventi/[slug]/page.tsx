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
    <article className="container-narte py-12">
      <Reveal>
        <p className="accent-label">{event.category}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-4xl md:text-7xl">{event.title}</h1>
      </Reveal>

      {/* Hero cover */}
      {event.cover_image && (
        <Reveal delay={0.2}>
          <div className="mt-8 aspect-[16/9] w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.cover_image}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>
      )}

      {/* Bottoni informazioni */}
      <Reveal delay={0.25}>
        <section className="mt-8">
          <EventInfoCards
            date={event.date}
            endAt={event.end_at}
            city={event.city}
            venue={event.venue}
            price={event.price}
          />
        </section>
      </Reveal>

      {/* Descrizione subito sotto i bottoni */}
      {event.description && (
        <Reveal delay={0.3}>
          <section className="mt-8 max-w-3xl">
            <h2 className="font-display text-xl uppercase">Descrizione</h2>
            <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed">
              {event.description}
            </div>
          </section>
        </Reveal>
      )}

      {/* CTA biglietti */}
      {event.ticket_url && (
        <Reveal delay={0.35}>
          <div className="mt-8">
            <Button asChild variant="accent" size="lg">
              <Link href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                <Ticket className="size-4" /> Acquista biglietti
              </Link>
            </Button>
          </div>
        </Reveal>
      )}

      {/* Gallery (foto + video) */}
      {(gallery.length > 0 || videos.length > 0) && (
        <Reveal delay={0.4}>
          <section className="mt-14">
            <h2 className="font-display text-xl uppercase">Galleria</h2>
            <div className="mt-4">
              <EventMediaGallery gallery={gallery} videos={videos} />
            </div>
          </section>
        </Reveal>
      )}
    </article>
  );
}
