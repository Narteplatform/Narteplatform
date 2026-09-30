import Link from "next/link";
import { requireRootSuperadmin } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { registroAssente, etichettaCategoria } from "@/lib/chat/access";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export const metadata = { title: "Registro accessi chat — N'arte Admin" };
export const dynamic = "force-dynamic";

const LIMITE = 300;

function quando(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

export default async function RegistroAccessiChatPage() {
  await requireRootSuperadmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("chat_access_log")
    .select(
      "id, created_at, admin_user_id, conversation_id, reason_category, reason_text, report_reference, expires_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE);

  let avviso: string | null = null;
  if (error) {
    if (registroAssente(error.code)) {
      avviso = "Il registro non esiste ancora: applica la migration 0064.";
    } else {
      logger.error("chat-access", "lettura registro fallita:", error.message);
      avviso = "Non riesco a leggere il registro. Riprova.";
    }
  }
  const righe = error ? [] : (data ?? []);

  // Nomi degli operatori e delle parti, in due letture; se falliscono si
  // mostrano gli identificativi, non si nasconde la riga.
  const adminIds = [...new Set(righe.map((r) => r.admin_user_id))];
  const convIds = [...new Set(righe.map((r) => r.conversation_id))];
  const nomiAdmin = new Map<string, string>();
  const partiConv = new Map<string, string>();

  await Promise.all(
    adminIds.map(async (uid) => {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(uid);
      if (uErr) {
        logger.warn("chat-access", "operatore non leggibile:", uErr.message);
        return;
      }
      const meta = u.user?.user_metadata as { full_name?: string } | undefined;
      nomiAdmin.set(uid, meta?.full_name || u.user?.email || uid);
    }),
  );
  if (convIds.length > 0) {
    const { data: convs, error: cErr } = await admin
      .from("conversations")
      .select("id, artists(stage_name), organizers(display_name)")
      .in("id", convIds);
    if (cErr) logger.warn("chat-access", "conversazioni non leggibili:", cErr.message);
    for (const c of (convs ?? []) as unknown as {
      id: string;
      artists: { stage_name: string } | null;
      organizers: { display_name: string } | null;
    }[]) {
      partiConv.set(c.id, `${c.artists?.stage_name ?? "Artista"} ↔ ${c.organizers?.display_name ?? "Organizzatore"}`);
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/chat" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        ← Conversazioni
      </Link>
      <header>
        <h1 className="font-display text-2xl text-notte">Registro degli accessi alle chat</h1>
        <p className="text-sm text-muted-foreground">
          Ogni volta che il Team apre una conversazione privata resta una riga qui: chi, quando,
          quale conversazione e perché. Ultimi {LIMITE} accessi. Visibile solo al superadmin principale.
        </p>
      </header>

      {avviso && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {avviso}
        </p>
      )}

      {!avviso && righe.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun accesso registrato.</p>
      )}

      {righe.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Chi</TableHead>
              <TableHead>Conversazione</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Riferimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{quando(r.created_at)}</TableCell>
                <TableCell>{nomiAdmin.get(r.admin_user_id) ?? r.admin_user_id}</TableCell>
                <TableCell>{partiConv.get(r.conversation_id) ?? r.conversation_id}</TableCell>
                <TableCell>{etichettaCategoria(r.reason_category)}</TableCell>
                <TableCell className="max-w-md whitespace-pre-wrap">{r.reason_text}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">{r.report_reference ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
