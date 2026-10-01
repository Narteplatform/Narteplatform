import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye, ShieldAlert } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ConversationBlockControls } from "@/components/admin/ConversationBlockControls";
import { OpenConversationForm } from "@/components/admin/OpenConversationForm";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { getAccessoValido, etichettaCategoria } from "@/lib/chat/access";
import {
  getConversationMeta,
  getConversationsForSuperadmin,
  getMessages,
} from "@/lib/chat/queries";

export const metadata = { title: "Chat — N'arte Admin" };
export const dynamic = "force-dynamic";

function ora(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdminPageAccess("chat");

  const meta = await getConversationMeta(id);
  if (!meta) notFound();

  const [esito, items] = await Promise.all([
    getAccessoValido(user.id, id),
    getConversationsForSuperadmin(),
  ]);

  // I messaggi si leggono SOLO con un accesso registrato e non scaduto.
  const messages = esito.stato === "valido" ? await getMessages(id) : [];

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
          {esito.stato === "valido" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-corallo-subtle/60 border-b border-border text-xs text-corallo-dark">
                <span className="flex items-center gap-2">
                  <Eye className="size-3.5 shrink-0" />
                  <span>
                    Accesso registrato: {etichettaCategoria(esito.accesso.reasonCategory).toLowerCase()}
                    {" — "}
                    {esito.accesso.reasonText}
                    {esito.accesso.reportReference ? ` (${esito.accesso.reportReference})` : ""}
                    . Scade alle {ora(esito.accesso.expiresAt)}. Sola lettura, salvo la rimozione motivata di singoli messaggi.
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <RefreshButton />
                  <ConversationBlockControls
                    conversationId={id}
                    artistName={meta.artist.name}
                    organizerName={meta.organizer.name}
                    artistUserId={meta.artist.userId}
                    organizerUserId={meta.organizer.userId}
                    activeBlocks={meta.activeBlocks}
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel
                  meta={meta}
                  initialMessages={messages}
                  viewerRole="superadmin"
                  currentUserId={user.id}
                  readOnly
                  canModerate
                  compact
                  backHref="/admin/chat"
                />
              </div>
            </>
          ) : esito.stato === "da_motivare" ? (
            <div className="flex-1 overflow-y-auto">
              <p className="px-6 pt-6 text-sm text-notte">
                <span className="font-semibold">{meta.artist.name}</span> ↔{" "}
                <span className="font-semibold">{meta.organizer.name}</span>
              </p>
              <OpenConversationForm conversationId={id} />
            </div>
          ) : esito.stato === "registro_assente" ? (
            <div className="m-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Per aprire le conversazioni applica la migration 0064.</p>
                <p className="mt-1">
                  Senza il registro degli accessi le chat non si leggono: i termini d&apos;uso
                  prevedono che ogni accesso sia motivato e registrato.
                </p>
              </div>
            </div>
          ) : (
            <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {esito.messaggio}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
