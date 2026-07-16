import { requireOrganizer } from "@/lib/auth/guards";
import { VenueForm } from "@/components/forms/VenueForm";

export default async function NewVenuePage() {
  await requireOrganizer();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Nuova struttura</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aggiungi i dettagli del locale che gestisci. Potrai usarli quando confermi un artista.
        </p>
      </div>
      <VenueForm />
    </div>
  );
}
