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
      </div>
      <VenueForm venue={venue} />
    </div>
  );
}
