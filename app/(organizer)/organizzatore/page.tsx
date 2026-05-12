import Link from "next/link";
import { Building2, CalendarDays, CheckCircle2, Clock, Inbox, Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { HeroGreeting } from "@/components/dashboard/HeroGreeting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function OrganizerOverviewPage() {
  const { user, organizer } = await requireOrganizer();
  const admin = createAdminClient();

  const [pendingRes, trattativaRes, confermataRes, totalRes, venuesRes, upcomingRes] =
    await Promise.all([
      admin
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizer.id)
        .eq("status", "pending"),
      admin
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizer.id)
        .eq("status", "in_trattativa"),
      admin
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizer.id)
        .eq("status", "confermata"),
      admin
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizer.id),
      admin
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("organizer_id", organizer.id),
      admin
        .from("booking_requests")
        .select("id, event_date, artist_id, venue_id, status")
        .eq("organizer_id", organizer.id)
        .eq("status", "confermata")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date", { ascending: true })
        .limit(3),
    ]);

  // Risolvi nomi artista + venue per i prossimi eventi
  const upcoming = upcomingRes.data ?? [];
  const artistIds = [...new Set(upcoming.map((u) => u.artist_id))];
  const venueIds = [...new Set(upcoming.map((u) => u.venue_id).filter(Boolean) as string[])];
  const [artistsMap, venuesMap] = await Promise.all([
    artistIds.length > 0
      ? admin
          .from("artists")
          .select("id, stage_name, slug, cover_image")
          .in("id", artistIds)
          .then((r) => new Map((r.data ?? []).map((a) => [a.id, a])))
      : Promise.resolve(new Map()),
    venueIds.length > 0
      ? admin
          .from("venues")
          .select("id, name, city")
          .in("id", venueIds)
          .then((r) => new Map((r.data ?? []).map((v) => [v.id, v])))
      : Promise.resolve(new Map()),
  ]);

  const pendingCount = pendingRes.count ?? 0;
  const trattativaCount = trattativaRes.count ?? 0;
  const confermataCount = confermataRes.count ?? 0;
  const totalCount = totalRes.count ?? 0;
  const venuesCount = venuesRes.count ?? 0;

  const hero = (() => {
    if (venuesCount === 0)
      return "Inizia aggiungendo la tua prima struttura per gestire date e richieste.";
    if (trattativaCount > 0)
      return `Hai ${trattativaCount} ${trattativaCount === 1 ? "trattativa aperta" : "trattative aperte"} da confermare.`;
    if (pendingCount > 0)
      return `Hai ${pendingCount} ${pendingCount === 1 ? "richiesta in attesa" : "richieste in attesa"} di risposta.`;
    return "Tutto sotto controllo. Esplora gli artisti per inviare nuove richieste.";
  })();

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={organizer.display_name || user.profile?.full_name || user.email?.split("@")[0]}
        description={hero}
        primary={
          venuesCount === 0
            ? { label: "Aggiungi struttura", href: "/organizzatore/strutture/nuova" }
            : { label: "Esplora artisti", href: "/artisti" }
        }
        secondary={{
          label: "Richieste",
          href: "/organizzatore/richieste",
          icon: <Inbox className="size-4" />,
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Richieste totali"
          value={totalCount}
          icon={<Inbox className="size-4" />}
          href="/organizzatore/richieste"
        />
        <KpiCard
          label="In attesa"
          value={pendingCount}
          icon={<Clock className="size-4" />}
          href="/organizzatore/richieste?status=pending"
          sublabel={pendingCount > 0 ? "In attesa dell'artista" : "Tutte risposte"}
        />
        <KpiCard
          label="In trattativa"
          value={trattativaCount}
          icon={<CalendarDays className="size-4" />}
          href="/organizzatore/richieste?status=in_trattativa"
          sublabel={trattativaCount > 0 ? "Da confermare" : "Nessuna trattativa"}
        />
        <KpiCard
          label="Confermate"
          value={confermataCount}
          icon={<CheckCircle2 className="size-4" />}
          href="/organizzatore/richieste?status=confermata"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Prossimi eventi confermati</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/organizzatore/calendario">Vai al calendario</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun evento confermato in agenda. Le date confermate dalle trattative
                appariranno qui.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((u) => {
                  const artist = artistsMap.get(u.artist_id);
                  const venue = u.venue_id ? venuesMap.get(u.venue_id) : null;
                  return (
                    <li key={u.id} className="flex items-center gap-4 py-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {artist?.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artist.cover_image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {artist?.stage_name ?? "Artista"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(u.event_date).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                          {venue ? ` · ${venue.name}` : ""}
                        </p>
                      </div>
                      <Badge variant="accent">Confermato</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" />
              Strutture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {venuesCount === 0
                ? "Aggiungi la prima struttura per iniziare a ricevere conferme di date."
                : `Stai gestendo ${venuesCount} ${venuesCount === 1 ? "struttura" : "strutture"}.`}
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/organizzatore/strutture/nuova">
                <Plus className="size-4" /> Aggiungi struttura
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/organizzatore/strutture">Vedi tutte</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
