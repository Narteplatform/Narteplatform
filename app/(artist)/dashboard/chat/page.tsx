import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { getConversationsForArtist } from "@/lib/chat/queries";
import { resolveActiveArtist } from "@/lib/artist/current";
import { chatAttivaPerArtista } from "@/lib/chat/accesso";
import { ChatPaywall } from "@/components/chat/ChatPaywall";

export const metadata = { title: "Chat — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistChatPage({
  searchParams,
}: {
  searchParams: Promise<{ avviso?: string }>;
}) {
  const user = await requireRole(["artist", "superadmin"]);
  const { avviso } = await searchParams;
  // Solo le chat del profilo attivo: ogni profilo ha le sue. Quelle degli
  // altri profili sono segnalate dai badge del selettore in topbar.
  const active = await resolveActiveArtist(user.id);
  // La chat è dei profili Pro/Max: un profilo Free tratta via email.
  if (active && !(await chatAttivaPerArtista(active.id))) {
    return <ChatPaywall />;
  }
  const conversations = active
    ? await getConversationsForArtist(user.id, { artistId: active.id })
    : [];
  return (
    <div className="space-y-3">
      {avviso && (
        <p role="status" className="rounded-xl border border-[#E8A030]/40 bg-[#E8A030]/[0.08] p-3 text-sm">
          {avviso.slice(0, 300)}
        </p>
      )}
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
    </div>
  );
}
