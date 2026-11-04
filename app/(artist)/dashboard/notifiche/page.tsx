import { requireRole } from "@/lib/auth/guards";
import { resolveActiveArtist } from "@/lib/artist/current";
import { leggiNotifiche } from "@/lib/notifications";
import { NotificheElenco } from "@/components/notifications/NotificheElenco";

export const metadata = { title: "Notifiche — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistNotifichePage() {
  const user = await requireRole(["artist", "superadmin"]);
  // Solo quelle del profilo attivo (e dell'account): ogni profilo ha le sue.
  const active = await resolveActiveArtist(user.id);
  const { items } = await leggiNotifiche(user.id, { artistId: active?.id ?? null, limit: 100 });
  return <NotificheElenco initialItems={items} area="artist" userId={user.id} />;
}
