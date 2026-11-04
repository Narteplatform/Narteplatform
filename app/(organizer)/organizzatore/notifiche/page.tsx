import { requireOrganizer } from "@/lib/auth/guards";
import { leggiNotifiche } from "@/lib/notifications";
import { NotificheElenco } from "@/components/notifications/NotificheElenco";

export const metadata = { title: "Notifiche — N'arte" };
export const dynamic = "force-dynamic";

export default async function OrganizerNotifichePage() {
  const { user } = await requireOrganizer();
  const { items } = await leggiNotifiche(user.id, { limit: 100 });
  return <NotificheElenco initialItems={items} area="organizer" userId={user.id} />;
}
