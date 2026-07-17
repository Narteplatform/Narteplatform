import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { resolveActiveArtist } from "@/lib/artist/current";
import { AvailabilityCalendar } from "@/components/forms/AvailabilityCalendar";
import { BulkAvailabilityPanel } from "@/components/dashboard/BulkAvailabilityPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  // Profilo ATTIVO: il calendario è per-profilo, non per-account.
  const artist = await resolveActiveArtist(user.id);

  if (!artist) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nessun profilo artista collegato. Contatta l&apos;amministratore.
        </CardContent>
      </Card>
    );
  }

  const [{ data: availability }, { data: defaultSlots }, { data: dateSlots }] = await Promise.all([
    supabase.from("artist_availability").select("date, status").eq("artist_id", artist.id),
    supabase
      .from("artist_default_slots")
      .select("id, label, start_time, end_time")
      .eq("artist_id", artist.id)
      .order("start_time"),
    supabase
      .from("artist_date_slots")
      .select("id, date, label, start_time, end_time")
      .eq("artist_id", artist.id)
      .order("date")
      .order("start_time"),
  ]);

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const busyDates = (availability ?? [])
    .filter((a) => a.status === "busy")
    .map((a) => a.date);

  const pastBusy = busyDates.filter((d) => d < todayIso);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Calendario disponibilità</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          I giorni futuri disponibili appaiono in verde. Clicca un giorno per gestire i suoi slot
          orari e per segnarlo come occupato. Le date passate restano in storico.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modifica in massa</CardTitle>
          <CardDescription>
            Imposta disponibilità su un intervallo di date con un click. Spunta opzionalmente gli
            slot da copiare come override per ogni giorno selezionato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkAvailabilityPanel
            artistId={artist.id}
            defaultSlots={(defaultSlots ?? []).map((s) => ({
              id: s.id,
              label: s.label,
              start_time: s.start_time,
              end_time: s.end_time,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendario</CardTitle>
          <CardDescription>
            Clicca un giorno per gestire override slot e disponibilità.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityCalendar
            artistId={artist.id}
            initialBusy={busyDates}
            pastBusy={pastBusy}
            dateSlots={(dateSlots ?? []).map((s) => ({
              id: s.id,
              date: s.date,
              label: s.label,
              start_time: s.start_time,
              end_time: s.end_time,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
