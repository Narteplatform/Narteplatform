import Link from "next/link";
import { CalendarDays, ExternalLink, Image as ImageIcon, Inbox, Video } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { HeroGreeting } from "@/components/dashboard/HeroGreeting";
import { ActivityList } from "@/components/dashboard/ActivityFeed";
import { ProfileCompletionCard } from "@/components/dashboard/ProfileCompletionCard";
import type { ProfileCompletionSource } from "@/lib/artist/profile-completion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ImageLightbox } from "@/components/marketing/ImageLightbox";

export const metadata = { title: "Overview — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistOverviewPage() {
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
          greeting="Bentornato"
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

  const gallery = artist.gallery ?? [];
  const videos = artist.videos ?? [];

  const heroDescription = (() => {
    const parts: string[] = [];
    const ln = newLeadsCount ?? 0;
    const av = availableCount ?? 0;
    if (ln > 0) parts.push(`${ln} nuov${ln === 1 ? "a richiesta" : "e richieste"}`);
    if (av > 0)
      parts.push(`${av} dat${av === 1 ? "a" : "e"} disponibil${av === 1 ? "e" : "i"} nei prossimi 30 giorni`);
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
        greeting="Bentornato"
        name={artist.stage_name}
        avatarUrl={artist.cover_image}
        description={heroDescription}
        primary={{
          label: "Pagina pubblica",
          href: `/artisti/${artist.slug}`,
          icon: <ExternalLink className="size-4" />,
        }}
        secondary={{ label: "Modifica profilo", href: "/dashboard/profilo-artista" }}
      />

      <ProfileCompletionCard artist={artist as unknown as ProfileCompletionSource} />

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
              <Link href="/dashboard/profilo-artista">Aggiorna galleria</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {gallery.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna foto ancora. Aggiungi qualche scatto dal profilo artista.
              </p>
            ) : (
              <ImageLightbox
                images={gallery.slice(0, 12)}
                gridClassName="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
              />
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
            <ActivityList items={activityItems} emptyText="Nessuna richiesta ricevuta finora." />
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
    </div>
  );
}
