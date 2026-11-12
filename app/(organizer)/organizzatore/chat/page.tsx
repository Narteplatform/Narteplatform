import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { getConversationsForOrganizer } from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte" };
export const dynamic = "force-dynamic";

export default async function OrganizerChatPage({
  searchParams,
}: {
  searchParams: Promise<{ avviso?: string }>;
}) {
  const user = await requireRole(["organizer", "superadmin"]);
  const { avviso } = await searchParams;
  const conversations = await getConversationsForOrganizer(user.id);
  return (
    <div className="space-y-3">
      {avviso && (
        <p role="status" className="rounded-xl border border-[#E8A030]/40 bg-[#E8A030]/[0.08] p-3 text-sm">
          {avviso.slice(0, 300)}{" "}
          <Link href="/organizzatore/richieste" className="font-medium underline underline-offset-2">
            Vai alle richieste
          </Link>
        </p>
      )}
    <div className="h-[calc(100dvh-9rem)] grid grid-cols-1 md:grid-cols-[340px_1fr] rounded-xl border border-border bg-surface overflow-hidden">
      <aside className="border-r border-border min-h-0">
        <ConversationList items={conversations} basePath="/organizzatore/chat" />
      </aside>
      <section className="hidden md:flex h-full items-center justify-center text-center px-8 text-muted-foreground">
        <div>
          <p className="font-display text-lg text-notte mb-1">Le tue trattative</p>
          <p className="text-sm">
            Seleziona una conversazione a sinistra. La chat con un artista si apre quando avvia la
            trattativa sulla tua richiesta (artisti Pro e Max).
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
    </div>
  );
}
