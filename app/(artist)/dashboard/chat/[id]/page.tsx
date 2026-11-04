import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getOwnedArtists, resolveActiveArtist } from "@/lib/artist/current";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  getConversationMeta,
  getConversationsForArtist,
  getMessages,
} from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["artist", "superadmin"]);

  const meta = await getConversationMeta(id);
  if (!meta) notFound();

  // Si controllano TUTTI i profili posseduti: una chat di un altro profilo
  // dell'account si apre, ma prima si passa a quel profilo, cosi' lista,
  // badge e calendario restano coerenti con la conversazione aperta.
  const owned = await getOwnedArtists(user.id);
  const isOwn = owned.some((a) => a.id === meta.artist.id);
  const isSuper = user.profile?.role === "superadmin";
  if (!isOwn && !isSuper) notFound();

  if (isOwn) {
    const active = await resolveActiveArtist(user.id, owned);
    if (active && active.id !== meta.artist.id) {
      redirect(
        `/dashboard/profili/passa?to=${meta.artist.id}&next=${encodeURIComponent(`/dashboard/chat/${id}`)}`,
      );
    }
  }

  const [messages, conversations] = await Promise.all([
    getMessages(id),
    getConversationsForArtist(user.id, isOwn ? { artistId: meta.artist.id } : {}),
  ]);

  return (
    <div className="h-[100dvh] md:h-[calc(100dvh-9rem)] grid grid-cols-1 md:grid-cols-[340px_1fr] rounded-none md:rounded-xl border-0 md:border md:border-border bg-surface overflow-hidden">
      <aside className="hidden md:block border-r border-border min-h-0">
        <ConversationList items={conversations} basePath="/dashboard/chat" activeId={id} />
      </aside>
      <section className="min-h-0">
        <ChatPanel
          meta={meta}
          initialMessages={messages}
          viewerRole={isSuper && !isOwn ? "superadmin" : "artist"}
          currentUserId={user.id}
          readOnly={isSuper && !isOwn}
          compact
          backHref="/dashboard/chat"
        />
      </section>
    </div>
  );
}
