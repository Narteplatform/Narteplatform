import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { VenueForm } from "@/components/forms/VenueForm";

export const dynamic = "force-dynamic";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizer } = await requireOrganizer();
  const { id } = await params;
  const admin = createAdminClient();
  const { data: venue } = await admin
    .from("venues")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!venue || venue.organizer_id !== organizer.id) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{venue.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Modifica i dettagli della struttura.</p>
        {venue.hidden_at && (
          <p role="status" className="mt-3 rounded-lg border border-border bg-muted p-3 text-sm">
            <strong>Nascosta dal team.</strong> Questa struttura non compare tra le scelte per le
            richieste. Ti abbiamo scritto il motivo per email, con il modo per contestare la decisione.
          </p>
        )}
      </div>
      <VenueForm venue={venue} />
    </div>
  );
}
