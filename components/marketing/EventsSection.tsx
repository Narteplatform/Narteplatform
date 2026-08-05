import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { EventCard, type EventCardProps } from "./EventCard";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";

/**
 * Solo eventi futuri. Senza il filtro sulla data, `order(date asc)` restituiva
 * gli otto eventi più VECCHI in tabella: la home annunciava serate già passate.
 */
async function getEvents(limit = 8): Promise<EventCardProps[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .select("slug, title, city, date, price, cover_image")
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(limit);
    return (data ?? []).map((e) => ({
      slug: e.slug,
      title: e.title,
      city: e.city,
      date: e.date,
      price: e.price,
      coverImage: e.cover_image,
    }));
  } catch {
    return [];
  }
}

export async function EventsSection() {
  const events = await getEvents();

  return (
    <section className="container-narte py-20 md:py-28">
      {/* ⚠️  La centratura sta sull'intestazione e non sulla sezione:
          `text-center` eredita, e sulla sezione avrebbe centrato anche il testo
          dentro le card degli eventi. */}
      <div className="text-center md:text-left">
        <Reveal>
          <p className="accent-label mb-3">in arrivo</p>
        </Reveal>
        <div className="mb-4 flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <h2 className="display-xl text-balance text-4xl md:text-6xl">
              Quello che stiamo mettendo in piedi
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <Button asChild variant="default" size="md">
              <Link href="/eventi">Vedi tutti gli eventi</Link>
            </Button>
          </Reveal>
        </div>
        <Reveal delay={0.25}>
          <p className="mx-auto mb-10 max-w-xl text-pretty text-sm text-muted-foreground md:mx-0 md:text-base">
            Le prossime date che abbiamo in calendario. Se ne organizzi una tu, la
            parte difficile la facciamo noi.
          </p>
        </Reveal>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna data in calendario in questo momento. Torna a trovarci a breve.
        </p>
      ) : (
        <StaggerList className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {events.map((e) => (
            <EventCard key={e.slug} {...e} />
          ))}
        </StaggerList>
      )}
    </section>
  );
}
