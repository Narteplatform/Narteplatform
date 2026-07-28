import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  getConversationMeta,
  getConversationsForSuperadmin,
  getMessages,
} from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(["superadmin"]);

  const meta = await getConversationMeta(id);
  if (!meta) notFound();
  const [messages, items] = await Promise.all([
    getMessages(id),
    getConversationsForSuperadmin(),
  ]);

  return (
    <div className="space-y-3">
      <Link href="/admin/chat" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        ← Tutte le conversazioni
      </Link>
      {/* --shell-extra = il link "Tutte le conversazioni" (~1rem) + lo space-y-3 (0.75rem) */}
      <div className="admin-shell-viewport [--shell-extra:1.75rem] grid grid-cols-1 md:grid-cols-[380px_1fr] rounded-xl border border-border bg-surface overflow-hidden">
        <aside className="hidden md:block border-r border-border min-h-0">
          <ConversationList items={items} basePath="/admin/chat" activeId={id} mode="superadmin" />
        </aside>
        <section className="min-h-0 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 bg-corallo-subtle/60 border-b border-border text-xs text-corallo-dark">
            <Eye className="size-3.5" />
            Vista superadmin — sola lettura
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel
              meta={meta}
              initialMessages={messages}
              viewerRole="superadmin"
              currentUserId={user.id}
              readOnly
              compact
              backHref="/admin/chat"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
