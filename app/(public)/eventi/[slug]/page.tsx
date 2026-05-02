import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatEventDate, formatPrice } from "@/lib/utils";
import { Reveal } from "@/components/animations/Reveal";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
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
            <img src={event.cover_image} alt={event.title} className="h-full w-full object-cover" />
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
