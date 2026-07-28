import { requireRole } from "@/lib/auth/guards";
import { ConversationList } from "@/components/chat/ConversationList";
import { getConversationsForSuperadmin } from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte Admin" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function AdminChatPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["superadmin"]);
  const sp = await searchParams;
  const items = await getConversationsForSuperadmin(sp.q);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-notte">Conversazioni</h1>
          <p className="text-sm text-muted-foreground">
            Vista globale di tutte le chat tra artisti e organizzatori. Sola lettura.
          </p>
        </div>
      </header>
      {/* --shell-extra = intestazione della pagina (~3.5rem) + lo space-y-4 (1rem) */}
      <div className="admin-shell-viewport [--shell-extra:4.5rem] grid grid-cols-1 md:grid-cols-[380px_1fr] rounded-xl border border-border bg-surface overflow-hidden">
        <aside className="border-r border-border min-h-0">
          <ConversationList items={items} basePath="/admin/chat" mode="superadmin" />
        </aside>
        <section className="hidden md:flex h-full items-center justify-center text-center px-8 text-muted-foreground">
          <div>
            <p className="font-display text-lg text-notte mb-1">Modalità sorveglianza</p>
            <p className="text-sm">
              Apri una conversazione per leggerne il contenuto. Non puoi inviare messaggi o offerte.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
