import Link from "next/link";
import { CalendarDays, ExternalLink, Image as ImageIcon, Inbox, Video } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { ArtistProfileForm } from "@/components/forms/ArtistProfileForm";
import { HeroGreeting } from "@/components/dashboard/HeroGreeting";
import { ActivityList } from "@/components/dashboard/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Profilo artista — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistDashboardPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return (
      <div className="space-y-6">
        <HeroGreeting
          name={user.profile?.full_name ?? user.email?.split("@")[0]}
          description="Nessun profilo artista collegato al tuo account. Contatta l'amministratore per attivarlo."
        />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Una volta collegato l&apos;account artista, tornerà tutto qui: profilo, galleria,
            calendario, richieste.
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const horizon = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const [
    { data: dates },
    { data: genresData },
    { count: availableCount },
    { count: newLeadsCount },
    { data: recentLeads },
  ] = await Promise.all([
    supabase
      .from("artist_availability")
      .select("date, status")
      .eq("artist_id", artist.id)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(8),
    supabase.from("genres").select("name").order("order_index"),
    supabase
      .from("artist_availability")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artist.id)
      .eq("status", "available")
      .gte("date", today)
      .lte("date", horizon),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artist.id)
      .eq("status", "new"),
    supabase
      .from("leads")
      .select("id, contact_email, event_location, message, created_at")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const genreOptions = (genresData ?? []).map((g) => g.name as string);

  const gallery = artist.gallery ?? [];
  const videos = artist.videos ?? [];

  const heroDescription = (() => {
    const parts: string[] = [];
    const ln = newLeadsCount ?? 0;
    const av = availableCount ?? 0;
    if (ln > 0) parts.push(`${ln} nuov${ln === 1 ? "a richiesta" : "e richieste"}`);
    if (av > 0) parts.push(`${av} dat${av === 1 ? "a" : "e"} disponibil${av === 1 ? "e" : "i"} nei prossimi 30 giorni`);
    if (parts.length === 0) return "Mantieni aggiornato il tuo profilo per ricevere nuove richieste.";
    return `Hai ${parts.join(" e ")}.`;
  })();

  const activityItems = (recentLeads ?? []).map((l) => ({
    kind: "lead" as const,
    id: l.id,
    primaryName: l.event_location || l.contact_email,
    detail: l.message?.slice(0, 100) ?? "",
    createdAt: l.created_at,
  }));

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={artist.stage_name}
        description={heroDescription}
        primary={{
          label: "Pagina pubblica",
          href: `/artisti/${artist.slug}`,
          icon: <ExternalLink className="size-4" />,
        }}
        secondary={{ label: "Modifica profilo", href: "#profilo" }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Galleria foto"
          value={gallery.length}
          icon={<ImageIcon className="size-4" />}
          sublabel={gallery.length > 0 ? "Visibili sulla pagina pubblica" : "Aggiungi le prime foto"}
        />
        <KpiCard
          label="Video"
          value={videos.length}
          icon={<Video className="size-4" />}
          sublabel={videos.length > 0 ? "Embed e link" : "Aggiungi link YouTube/Vimeo"}
        />
        <KpiCard
          label="Date libere 30gg"
          value={availableCount ?? 0}
          icon={<CalendarDays className="size-4" />}
          href="/dashboard/calendario"
        />
        <KpiCard
          label="Nuove richieste"
          value={newLeadsCount ?? 0}
          icon={<Inbox className="size-4" />}
          href="/dashboard/leads?status=new"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Galleria recente</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="#profilo">Aggiorna galleria</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {gallery.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna foto ancora. Aggiungi qualche scatto dal form qui sotto.
              </p>
            ) : (
              <ScrollArea snap className="-mx-2 px-2">
                <div className="flex gap-3 pb-2">
                  {gallery.slice(0, 12).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted snap-start"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Richieste recenti</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/leads">Tutte</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <ActivityList
              items={activityItems}
              emptyText="Nessuna richiesta ricevuta finora."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Prossime date</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/calendario">Calendario completo</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!dates || dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna data nei prossimi giorni.{" "}
              <Link href="/dashboard/calendario" className="underline">
                Apri il calendario
              </Link>{" "}
              per inserire disponibilità.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {dates.map((d) => (
                <li
                  key={d.date}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2"
                >
                  <span className="text-sm">
                    {new Date(d.date).toLocaleDateString("it-IT", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <Badge variant={d.status === "available" ? "success" : "danger"} dot>
                    {d.status === "available" ? "Libero" : "Occupato"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section id="profilo" className="space-y-3">
        <header>
          <h2 className="font-display text-xl tracking-tight">Modifica profilo</h2>
          <p className="text-sm text-muted-foreground">
            Tutto quello che salvi qui viene aggiornato in automatico nella tua pagina pubblica e
            nella sezione &quot;Gli artisti&quot; della home.
          </p>
        </header>
        <Card>
          <CardContent>
            <ArtistProfileForm artist={artist} genreOptions={genreOptions} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
