import { requireOrganizer } from "@/lib/auth/guards";
import { OrganizerProfileForm } from "@/components/forms/OrganizerProfileForm";

export const dynamic = "force-dynamic";

export default async function OrganizerProfilePage() {
  const { organizer } = await requireOrganizer();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Profilo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le informazioni che gli artisti vedranno quando ricevono una tua richiesta.
        </p>
      </div>
      <OrganizerProfileForm organizer={organizer} />
    </div>
  );
}
