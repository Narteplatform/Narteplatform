import Link from "next/link";
import { BarChart3, Building2, Eye, Heart, Inbox, Lock } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveActiveArtist } from "@/lib/artist/current";
import { entitlementsFor } from "@/lib/billing/plans";
import { countFavoritesForArtist } from "@/lib/favorites/server";
import { isVisitTrackingConfigured } from "@/lib/analytics/visitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/components/ui/KpiCard";
import { ViewsChart, type ViewPoint } from "@/components/dashboard/stats/ViewsChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistiche — N'arte Artist" };

export default async function ArtistStatsPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const active = await resolveActiveArtist(user.id);

  if (!active) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nessun profilo artista collegato.
        </CardContent>
      </Card>
    );
  }

  const ent = entitlementsFor(active.tier ?? "free");

  // Chi arriva qui senza il piano vede cosa si sta perdendo, non un 404.
  // Un paywall che finge che la funzione non esista non vende niente, ed è la
  // stessa scelta già fatta ovunque nel progetto.
  if (ent.stats === "none") return <StatsUpsell />;

  const admin = createAdminClient();
  // La finestra viene SOLO dal piano: non c'è nessun parametro nell'URL da
  // manipolare, e la funzione SQL clampa comunque a 400 giorni.
  const days = ent.statsWindowDays;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [viewsRes, leadsRes, bookingRes, favorites] = await Promise.all([
    admin.rpc("artist_view_stats", { p_artist_id: active.id, p_days: days }),
    admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", active.id)
      .gte("created_at", since),
    admin
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", active.id)
      .gte("created_at", since),
    countFavoritesForArtist(active.id),
  ]);

  // Errore in lettura: si mostra zero e lo si dice, non si finge un dato.
  if (viewsRes.error) console.error("[statistiche] artist_view_stats", viewsRes.error);
  const points = (viewsRes.data ?? []) as unknown as ViewPoint[];

  const totalViews = points.reduce((s, p) => s + p.organizer_views + p.other_views, 0);
  const organizerViews = points.reduce((s, p) => s + p.organizer_views, 0);
  const leadsCount = leadsRes.count ?? 0;
  const bookingCount = bookingRes.count ?? 0;
  const requestsTotal = leadsCount + bookingCount;

  const trackingOff = !isVisitTrackingConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Statistiche del profilo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ultimi {days} giorni su <strong>{active.stage_name}</strong>. I dati si aggiornano
          in tempo reale.
        </p>
      </div>

      {trackingOff && (
        <Card className="border-warning/40">
          <CardContent className="py-4 text-sm text-muted-foreground">
            La raccolta delle visite non è ancora attiva su questo ambiente. Richieste e
            salvataggi qui sotto sono corretti; le visite restano a zero finché non viene
            configurata.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Visite al profilo"
          value={totalViews}
          icon={<Eye className="size-4" />}
          sublabel={`Visitatori unici, ultimi ${days} giorni`}
        />
        <KpiCard
          label="Da organizzatori"
          value={organizerViews}
          icon={<Building2 className="size-4" />}
          sublabel="Locali e organizzatori registrati"
        />
        <KpiCard
          label="Richieste ricevute"
          value={requestsTotal}
          icon={<Inbox className="size-4" />}
          sublabel={`${leadsCount} dal sito · ${bookingCount} da organizzatori`}
          href="/dashboard/leads"
        />
        <KpiCard
          label="Salvataggi"
          value={favorites}
          icon={<Heart className="size-4" />}
          sublabel="Da utenti registrati"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" /> Andamento delle visite
          </CardTitle>
          <CardDescription>
            In azzurro pieno le visite di organizzatori e locali registrati: sono quelle che
            possono trasformarsi in una serata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsChart points={points} showSplit={ent.stats === "advanced"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Come leggere questi numeri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Visite</strong> conta i visitatori unici al
            giorno, non le aperture di pagina: se la stessa persona torna cinque volte in una
            giornata, vale uno. Le tue visite al tuo profilo non vengono conteggiate.
          </p>
          <p>
            <strong className="text-foreground">Salvataggi</strong> conta solo gli utenti
            registrati. Chi visita il sito senza un account può salvarti nel proprio browser,
            ma quei salvataggi non sono conteggiabili da nessuna parte.
          </p>
          <p>
            Non raccogliamo indirizzi IP né usiamo cookie di tracciamento: i visitatori sono
            conteggiati in forma anonima.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Cosa vede chi non ha il piano Max.
 *
 * Non è un 404 di proposito: chi arriva su questa pagina sta cercando proprio
 * questa funzione, ed è il momento in cui l'upgrade ha più senso per lui.
 */
function StatsUpsell() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="size-4" /> Le statistiche sono incluse nel piano Max
        </CardTitle>
        <CardDescription>
          Scopri quante persone aprono il tuo profilo, quante di queste sono organizzatori e
          locali registrati, quante richieste hai ricevuto e quanti ti hanno salvato tra i
          preferiti — con lo storico dell&rsquo;ultimo anno.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Eye className="mt-0.5 size-4 shrink-0" /> Visite al profilo giorno per giorno
          </li>
          <li className="flex items-start gap-2">
            <Building2 className="mt-0.5 size-4 shrink-0" /> Quante arrivano da organizzatori
          </li>
          <li className="flex items-start gap-2">
            <Inbox className="mt-0.5 size-4 shrink-0" /> Richieste ricevute per canale
          </li>
          <li className="flex items-start gap-2">
            <Heart className="mt-0.5 size-4 shrink-0" /> Salvataggi tra i preferiti
          </li>
        </ul>
        <Button asChild variant="accent">
          <Link href="/dashboard/abbonamento">Passa a Max</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
