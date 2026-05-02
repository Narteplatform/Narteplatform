import Link from "next/link";
import { Ticket } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
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

      {/* Hero: immagine sx, info toggle dx */}
      <div className="mt-10 grid gap-8 md:grid-cols-[3fr_2fr] md:gap-10">
        <Reveal delay={0.2}>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted md:aspect-[4/5]">
            {event.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-5xl text-muted-foreground">
                {event.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal delay={0.25}>
            <EventInfoCards
              date={event.date}
              endAt={event.end_at}
              city={event.city}
              venue={event.venue}
              price={event.price}
            />
          </Reveal>

          {event.ticket_url && (
            <Reveal delay={0.35}>
              <Button asChild variant="accent" size="lg" className="w-full">
                <Link href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                  <Ticket className="size-4" /> Acquista biglietti
                </Link>
              </Button>
            </Reveal>
          )}
        </div>
      </div>

      {event.description && (
        <Reveal delay={0.4}>
          <section className="mt-12 max-w-3xl">
            <h2 className="font-display text-xl uppercase">Descrizione</h2>
            <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed">
              {event.description}
            </div>
          </section>
        </Reveal>
      )}

      {(gallery.length > 0 || videos.length > 0) && (
        <Reveal delay={0.45}>
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
