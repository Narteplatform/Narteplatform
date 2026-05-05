import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { EventCard, type EventCardProps } from "./EventCard";
import { StaggerList, Reveal } from "@/components/animations/Reveal";
import { Button } from "@/components/ui/Button";

async function getEvents(limit = 8): Promise<EventCardProps[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .select("slug, title, city, date, price, cover_image, cover_image_home")
      .order("date", { ascending: true })
      .limit(limit);
    return (data ?? []).map((e) => ({
      slug: e.slug,
      title: e.title,
      city: e.city,
      date: e.date,
      price: e.price,
      coverImage: e.cover_image,
      coverImageHome: e.cover_image_home,
    }));
  } catch {
    return [];
  }
}

export async function EventsSection() {
  const events = await getEvents();

  return (
    <section className="container-narte py-20 md:py-28">
      <Reveal>
        <p className="accent-label mb-3">cosa succede</p>
      </Reveal>
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Reveal delay={0.1}>
          <h2 className="display-xl text-4xl md:text-6xl">Eventi</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <Button asChild variant="default" size="md">
            <Link href="/eventi">Vedi tutti gli eventi</Link>
          </Button>
        </Reveal>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun evento al momento. Torna a trovarci a breve.
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
