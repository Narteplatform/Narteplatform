import { requireRole } from "@/lib/auth/guards";
import { leggiNotifiche } from "@/lib/notifications";
import { NotificheElenco } from "@/components/notifications/NotificheElenco";

export const metadata = { title: "Notifiche — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminNotifichePage() {
  const user = await requireRole(["superadmin"]);
  const { items } = await leggiNotifiche(user.id, { limit: 100 });
  return <NotificheElenco initialItems={items} area="admin" userId={user.id} />;
}
