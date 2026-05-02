import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";

export default async function ArtistLeadsPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) return <p className="text-muted-foreground">Nessun profilo collegato.</p>;

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-xl text-4xl">Le tue richieste</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tutte le richieste di booking ricevute tramite la piattaforma.
        </p>
      </div>

      {!leads || leads.length === 0 ? (
        <p className="text-muted-foreground">Nessuna richiesta ancora.</p>
      ) : (
        <ul className="space-y-4">
          {leads.map((l) => (
            <li key={l.id} className="border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs uppercase tracking-wide">
                <span>{new Date(l.created_at).toLocaleDateString("it-IT")}</span>
                <span className="rounded-full border border-foreground px-3 py-0.5">{l.status}</span>
              </div>
              <h3 className="mt-3 font-display text-xl uppercase">
                {l.event_location} — {new Date(l.event_date).toLocaleDateString("it-IT")}
              </h3>
              {l.budget != null && (
                <p className="mt-1 text-sm text-muted-foreground">Budget: €{Number(l.budget).toFixed(2)}</p>
              )}
              <p className="mt-3 whitespace-pre-wrap text-sm">{l.message}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Contatto: <a href={`mailto:${l.contact_email}`} className="underline">{l.contact_email}</a>
                {l.contact_phone ? ` · ${l.contact_phone}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
