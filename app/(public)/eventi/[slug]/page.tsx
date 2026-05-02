import Link from "next/link";
import { Ticket } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";

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

  return (
    <article className="container-narte py-12">
      <Reveal>
        <p className="accent-label">{event.category}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-4xl md:text-7xl">{event.title}</h1>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="mt-4 flex flex-wrap gap-6 text-sm uppercase tracking-wide">
          <span>{formatEventDate(event.date)}</span>
          <span>{event.city}</span>
          {event.venue && <span>{event.venue}</span>}
          <span className="text-muted-foreground">{formatPrice(event.price)}</span>
        </div>
      </Reveal>

      {event.cover_image && (
        <Reveal delay={0.3}>
          <div className="mt-8 aspect-[16/9] w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.cover_image} alt={event.title} className="h-full w-full object-cover" />
          </div>
        </Reveal>
      )}

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

      {event.description && (
        <Reveal delay={0.4}>
          <div className="prose mt-8 max-w-2xl whitespace-pre-wrap text-base leading-relaxed">
            {event.description}
          </div>
        </Reveal>
      )}
    </article>
  );
}
