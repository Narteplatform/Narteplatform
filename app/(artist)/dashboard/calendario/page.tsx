import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { AvailabilityCalendar } from "@/components/forms/AvailabilityCalendar";

export default async function CalendarioPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id, stage_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return <p className="text-muted-foreground">Nessun profilo artista collegato.</p>;
  }

  const { data: availability } = await supabase
    .from("artist_availability")
    .select("date, status")
    .eq("artist_id", artist.id);

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const busyDates = (availability ?? [])
    .filter((a) => a.status === "busy")
    .map((a) => a.date);

  const pastBusy = busyDates.filter((d) => d < todayIso);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-xl text-4xl">Calendario disponibilità</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tutti i giorni futuri sono <strong>disponibili</strong> di default (pallino verde).
          Clicca un giorno per segnarlo come <strong>occupato</strong> (pallino rosso) e
          escluderlo dalle date disponibili. Le date passate occupate restano in storico.
        </p>
      </div>
      <AvailabilityCalendar
        artistId={artist.id}
        initialBusy={busyDates}
        pastBusy={pastBusy}
      />
    </div>
  );
}
