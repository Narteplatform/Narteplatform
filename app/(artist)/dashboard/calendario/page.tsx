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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-xl text-4xl">Calendario disponibilità</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Clicca una data per segnarla come occupata. Le date non selezionate sono considerate
          disponibili.
        </p>
      </div>
      <AvailabilityCalendar
        artistId={artist.id}
        initialBusy={(availability ?? [])
          .filter((a) => a.status === "busy")
          .map((a) => a.date)}
      />
    </div>
  );
}
