import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { ConversationList } from "@/components/chat/ConversationList";
import { getConversationsForSuperadmin } from "@/lib/chat/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { isRootSuperadminEmail } from "@/lib/admin/permissions";
import Link from "next/link";

export const metadata = { title: "Chat — N'arte Admin" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function AdminChatPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPageAccess("chat");
  const me = await getCurrentUser();
  const isRoot = isRootSuperadminEmail(me?.email ?? null);
  const sp = await searchParams;
  const items = await getConversationsForSuperadmin(sp.q);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-notte">Accesso motivato alle conversazioni</h1>
          <p className="text-sm text-muted-foreground">
            Le chat tra artisti e organizzatori sono private. Il Team le apre solo per assistenza,
            contestazioni, segnalazioni o obblighi di legge: per leggerne una devi indicare il motivo,
            che resta registrato, e l&apos;accesso dura due ore.
          </p>
        </div>
        {isRoot && (
          <Link href="/admin/chat/registro" className="shrink-0 text-xs uppercase tracking-wider text-azzurro hover:underline">
            Registro degli accessi
          </Link>
        )}
      </header>
      {/* --shell-extra = intestazione della pagina (~3.5rem) + lo space-y-4 (1rem) */}
      <div className="admin-shell-viewport [--shell-extra:4.5rem] grid grid-cols-1 md:grid-cols-[380px_1fr] rounded-xl border border-border bg-surface overflow-hidden">
        <aside className="border-r border-border min-h-0">
          <ConversationList items={items} basePath="/admin/chat" mode="superadmin" />
        </aside>
        <section className="hidden md:flex h-full items-center justify-center text-center px-8 text-muted-foreground">
          <div>
            <p className="font-display text-lg text-notte mb-1">Contenuto riservato</p>
            <p className="text-sm">
              L&apos;elenco mostra solo chi scrive a chi. Scegli una conversazione e indica il
              motivo dell&apos;accesso per leggerla, in sola lettura.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
