import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { OrganizerCalendar } from "@/components/organizer/OrganizerCalendar";
import { VenueSwitch } from "@/components/organizer/VenueSwitch";

export const dynamic = "force-dynamic";

export default async function OrganizerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const { organizer } = await requireOrganizer();
  const sp = await searchParams;
  const admin = createAdminClient();

  const { data: venues } = await admin
    .from("venues")
    .select("id, name")
    .eq("organizer_id", organizer.id)
    .order("name");
  const allVenues = venues ?? [];
  const selected = sp.venue && allVenues.some((v) => v.id === sp.venue) ? sp.venue : null;

  let bookingQuery = admin
    .from("booking_requests")
    .select("id, event_date, time_slot, artist_id, venue_id")
    .eq("organizer_id", organizer.id)
    .eq("status", "confermata")
    .order("event_date", { ascending: true });
  if (selected) bookingQuery = bookingQuery.eq("venue_id", selected);
  const { data: bookings } = await bookingQuery;
  const rows = bookings ?? [];

  const artistIds = [...new Set(rows.map((r) => r.artist_id))];
  const artists = artistIds.length
    ? await admin
        .from("artists")
        .select("id, stage_name, slug, cover_image")
        .in("id", artistIds)
        .then((r) => new Map((r.data ?? []).map((a) => [a.id, a])))
    : new Map();

  const events = rows.map((r) => {
    const a = artists.get(r.artist_id);
    return {
      id: r.id,
      date: r.event_date,
      title: a?.stage_name ?? "Artista",
      slug: a?.slug ?? null,
      cover: a?.cover_image ?? null,
      time: r.time_slot ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-tight">Calendario</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Eventi confermati. Le date sono sincronizzate con il calendario pubblico
            dell'artista appena confermi una trattativa.
          </p>
        </div>
        {allVenues.length > 1 && <VenueSwitch venues={allVenues} selected={selected} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vista mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizerCalendar events={events} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimi eventi</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun evento confermato.</p>
            ) : (
              <ul className="divide-y divide-border">
                {events.slice(0, 10).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {e.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.cover} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "long",
                        })}
                        {e.time ? ` · ${e.time}` : ""}
                      </p>
                    </div>
                    {e.slug && (
                      <Link
                        href={`/artisti/${e.slug}`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
