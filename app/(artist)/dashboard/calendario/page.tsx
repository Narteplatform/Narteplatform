import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { AvailabilityCalendar } from "@/components/forms/AvailabilityCalendar";
import { DefaultSlotsEditor } from "@/components/forms/DefaultSlotsEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, stage_name")
    .eq("user_id", user.id)
    .maybeSingle();

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
          Definisci gli <strong>slot orari generali</strong> validi tutti i giorni; i giorni futuri
          appaiono in verde. Clicca un giorno per aprire la gestione slot specifici (override) e per
          segnarlo come occupato. Le date passate restano in storico.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Slot orari generali</CardTitle>
          <CardDescription>
            Validi su tutti i giorni disponibili. Esempio: &quot;Aperitivo&quot; 18:30–21:00,
            &quot;Sera&quot; 21:30–00:30.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DefaultSlotsEditor
            artistId={artist.id}
            slots={(defaultSlots ?? []).map((s) => ({
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
