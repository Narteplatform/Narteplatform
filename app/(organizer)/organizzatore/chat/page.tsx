import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { getConversationsForOrganizer } from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte" };
export const dynamic = "force-dynamic";

export default async function OrganizerChatPage() {
  const user = await requireRole(["organizer", "superadmin"]);
  const conversations = await getConversationsForOrganizer(user.id);
  return (
    <div className="h-[calc(100vh-9rem)] grid grid-cols-1 md:grid-cols-[340px_1fr] rounded-xl border border-border bg-surface overflow-hidden">
      <aside className="border-r border-border min-h-0">
        <ConversationList items={conversations} basePath="/organizzatore/chat" />
      </aside>
      <section className="hidden md:flex h-full items-center justify-center text-center px-8 text-muted-foreground">
        <div>
          <p className="font-display text-lg text-notte mb-1">Le tue trattative</p>
          <p className="text-sm">
            Seleziona una conversazione a sinistra per chattare con un artista.
          </p>
          <Link
            href="/artisti"
            className="mt-4 inline-block text-xs uppercase tracking-wider text-azzurro hover:underline"
          >
            Sfoglia roster artisti →
          </Link>
        </div>
      </section>
    </div>
  );
}
