import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AdminVenueEditor, type AdminVenue } from "@/components/admin/AdminVenueEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scheda utente — N'arte Admin" };

export default async function AdminUtenteSchedaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageAccess("utenti");
  const { id } = await params;
  const admin = createAdminClient();

  const { data: letto, error: utenteErr } = await admin.auth.admin.getUserById(id);
  if (utenteErr || !letto?.user) {
    if (utenteErr) logger.warn("admin/utenti", "utente non leggibile:", utenteErr.message);
    notFound();
  }
  const utente = letto.user;

  const [profiloRes, orgRes] = await Promise.all([
    admin.from("profiles").select("role, full_name").eq("id", id).maybeSingle(),
    admin.from("organizers").select("id, display_name").eq("user_id", id).maybeSingle(),
  ]);
  const errore = profiloRes.error?.message ?? orgRes.error?.message ?? null;
  if (errore) logger.warn("admin/utenti", "scheda utente: lettura fallita:", errore);

  let strutture: AdminVenue[] = [];
  let erroreStrutture: string | null = null;
  if (orgRes.data) {
    const { data, error } = await admin
      .from("venues")
      .select("*")
      .eq("organizer_id", orgRes.data.id)
      .order("created_at", { ascending: false });
    if (error) {
      logger.warn("admin/utenti", "strutture non leggibili:", error.message);
      erroreStrutture = "Non riesco a leggere le strutture. L'elenco non è vuoto, è non disponibile.";
    } else {
      strutture = (data ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        venue_type: v.venue_type,
        city: v.city,
        region: v.region,
        address: v.address,
        postal_code: v.postal_code,
        capacity: v.capacity,
        description: v.description,
        website: v.website,
        instagram: v.instagram,
        phone: v.phone,
        email: v.email,
        // Prima della migration 0070 la colonna non c'è: nessuna è nascosta.
        hidden_at: v.hidden_at ?? null,
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/utenti" className="text-sm text-muted-foreground hover:text-foreground">
          ← Tutti gli utenti
        </Link>
        <h1 className="mt-2 font-display text-3xl">{profiloRes.data?.full_name || utente.email || "Utente"}</h1>
        <p className="text-sm text-muted-foreground">
          {utente.email} · ruolo {profiloRes.data?.role ?? "—"}
        </p>
      </div>

      {errore && (
        <p role="alert" className="text-sm text-corallo">
          Alcuni dati non sono leggibili: {errore}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strutture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!orgRes.data ? (
            <p className="text-sm text-muted-foreground">Questo utente non è un organizzatore: nessuna struttura.</p>
          ) : erroreStrutture ? (
            <p role="alert" className="text-sm text-corallo">
              {erroreStrutture}
            </p>
          ) : strutture.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna struttura registrata.</p>
          ) : (
            strutture.map((v) => <AdminVenueEditor key={v.id} venue={v} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
