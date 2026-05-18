import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  getConversationMeta,
  getConversationsForArtist,
  getMessages,
} from "@/lib/chat/queries";
import { createAdminClient } from "@/lib/supabase/server";

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

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isOwn = artist?.id === meta.artist.id;
  const isSuper = user.profile?.role === "superadmin";
  if (!isOwn && !isSuper) notFound();

  const [messages, conversations] = await Promise.all([
    getMessages(id),
    getConversationsForArtist(user.id),
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
