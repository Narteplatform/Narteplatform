import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { ArtistProfileForm } from "@/components/forms/ArtistProfileForm";

export default async function ArtistDashboardPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = await createClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-xl text-4xl">Il tuo profilo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aggiorna le informazioni che gli utenti vedono sulla tua pagina pubblica.
        </p>
      </div>
      {!artist ? (
        <p className="text-muted-foreground">
          Nessun profilo artista collegato al tuo account. Contatta l&apos;amministratore.
        </p>
      ) : (
        <ArtistProfileForm artist={artist} />
      )}
    </div>
  );
}
