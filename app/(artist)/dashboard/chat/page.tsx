import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { getConversationsForArtist } from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistChatPage() {
  const user = await requireRole(["artist", "superadmin"]);
  const conversations = await getConversationsForArtist(user.id);
  return (
    <div className="h-[calc(100dvh-9rem)] grid grid-cols-1 md:grid-cols-[340px_1fr] rounded-xl border border-border bg-surface overflow-hidden">
      <aside className="border-r border-border min-h-0">
        <ConversationList items={conversations} basePath="/dashboard/chat" />
      </aside>
      <section className="hidden md:flex h-full items-center justify-center text-center px-8 text-muted-foreground">
        <div>
          <p className="font-display text-lg text-notte mb-1">Le tue trattative live</p>
          <p className="text-sm">
            Seleziona una conversazione a sinistra per chattare con un organizzatore.
          </p>
          <Link
            href="/dashboard/leads"
            className="mt-4 inline-block text-xs uppercase tracking-wider text-azzurro hover:underline"
          >
            Vai alle richieste in attesa →
          </Link>
        </div>
      </section>
    </div>
  );
}
