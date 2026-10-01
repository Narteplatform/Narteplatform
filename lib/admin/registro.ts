import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { etichettaCategoria, registroAssente } from "@/lib/chat/access";

/**
 * Registro unico delle azioni del Team: `moderation_actions` (decisioni e
 * azioni) più `chat_access_log` (accessi motivati alle conversazioni), fusi in
 * un solo elenco ordinato per data. Sola lettura.
 */

export const TIPI_OGGETTO = [
  "profilo",
  "candidatura",
  "media",
  "video",
  "account",
  "conversazione",
  "messaggio",
  "struttura",
  "recensione",
  "segnalazione",
  "segnalazione_profilo",
  "booking",
  "lead",
  "evento",
  "format",
  "blog",
  "genere",
  "consulenza",
  "consulente",
] as const;

export type RegistroFiltri = {
  operatore: string | null;
  /** `null` = tutti; `accessi_chat`; oppure un `target_type` di moderation_actions. */
  tipo: string | null;
  /** YYYY-MM-DD, inclusivo (UTC). */
  dal: string | null;
  /** YYYY-MM-DD, inclusivo (UTC). */
  al: string | null;
};

export type RegistroRiga = {
  id: string;
  fonte: "azione" | "accesso_chat";
  at: string;
  operatoreId: string | null;
  operatore: string;
  azione: string;
  oggetto: string;
  interessato: string;
  motivo: string;
  notifica: string;
};

export type EsitoRegistro =
  | { ok: true; righe: RegistroRiga[]; totale: number; avvisi: string[] }
  | { ok: false; error: string };

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function leggiFiltri(sp: { operatore?: string; tipo?: string; dal?: string; al?: string }): RegistroFiltri {
  const tipo = (sp.tipo ?? "").trim();
  const tipoValido = tipo === "accessi_chat" || (TIPI_OGGETTO as readonly string[]).includes(tipo) ? tipo : null;
  return {
    operatore: sp.operatore && UUID_RE.test(sp.operatore) ? sp.operatore : null,
    tipo: tipoValido,
    dal: sp.dal && DATA_RE.test(sp.dal) ? sp.dal : null,
    al: sp.al && DATA_RE.test(sp.al) ? sp.al : null,
  };
}

export function etichettaAzione(action: string): string {
  const t = action.replace(/_/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function inizioGiorno(d: string): string {
  return `${d}T00:00:00.000Z`;
}
function giornoSuccessivo(d: string): string {
  const x = new Date(`${d}T00:00:00.000Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString();
}

/** Nome ed email di un insieme di account, con lettura a errore controllato. */
async function nomiAccount(ids: string[]): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const out = new Map<string, string>();
  const unici = Array.from(new Set(ids.filter(Boolean)));
  if (unici.length === 0) return out;

  const nomi = new Map<string, string>();
  const { data: profili, error } = await admin.from("profiles").select("id, full_name").in("id", unici);
  if (error) logger.warn("admin/registro", "nomi dei profili non leggibili:", error.message);
  for (const p of profili ?? []) if (p.full_name) nomi.set(p.id, p.full_name);

  await Promise.all(
    unici.map(async (id) => {
      const { data, error: e } = await admin.auth.admin.getUserById(id);
      if (e) logger.warn("admin/registro", "account non leggibile:", e.message);
      const email = data?.user?.email ?? null;
      const nome = nomi.get(id);
      out.set(id, nome && email ? `${nome} (${email})` : (email ?? nome ?? id.slice(0, 8)));
    }),
  );
  return out;
}

type AzioneRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  target_type: string;
  target_id: string | null;
  affected_user_id: string | null;
  affected_email: string | null;
  action: string;
  reason: string;
  notified_at: string | null;
  notify_error: string | null;
};

type AccessoRow = {
  id: string;
  created_at: string;
  admin_user_id: string;
  conversation_id: string;
  reason_category: string;
  reason_text: string;
  report_reference: string | null;
};

type Fusa =
  | { at: string; fonte: "azione"; riga: AzioneRow }
  | { at: string; fonte: "accesso_chat"; riga: AccessoRow };

/**
 * Le righe della pagina richiesta (`pagina` parte da 1). Per fondere due
 * tabelle ordinate per data si leggono, da ciascuna, le prime
 * `pagina * perPagina` righe e si taglia dopo la fusione: per questo la
 * profondità è limitata dal chiamante.
 */
export async function leggiRegistro(
  filtri: RegistroFiltri,
  { pagina, perPagina }: { pagina: number; perPagina: number },
): Promise<EsitoRegistro> {
  const admin = createAdminClient();
  const avvisi: string[] = [];
  const quanti = pagina * perPagina;

  const vuoleAzioni = filtri.tipo !== "accessi_chat";
  const vuoleAccessi = filtri.tipo === null || filtri.tipo === "accessi_chat";

  let azioni: AzioneRow[] = [];
  let nAzioni = 0;
  if (vuoleAzioni) {
    let q = admin
      .from("moderation_actions")
      .select(
        "id, created_at, actor_id, target_type, target_id, affected_user_id, affected_email, action, reason, notified_at, notify_error",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(0, quanti - 1);
    if (filtri.operatore) q = q.eq("actor_id", filtri.operatore);
    if (filtri.tipo) q = q.eq("target_type", filtri.tipo);
    if (filtri.dal) q = q.gte("created_at", inizioGiorno(filtri.dal));
    if (filtri.al) q = q.lt("created_at", giornoSuccessivo(filtri.al));
    const { data, error, count } = await q;
    if (error) {
      if (registroAssente(error.code)) {
        avvisi.push("Il registro delle decisioni non esiste ancora (migration 0065).");
      } else {
        logger.error("admin/registro", "moderation_actions non leggibile:", error.message);
        return {
          ok: false,
          error: "Non riesco a leggere il registro delle azioni. L'elenco non è vuoto, è non disponibile.",
        };
      }
    } else {
      azioni = data ?? [];
      nAzioni = count ?? azioni.length;
    }
  }

  let accessi: AccessoRow[] = [];
  let nAccessi = 0;
  if (vuoleAccessi) {
    let q = admin
      .from("chat_access_log")
      .select("id, created_at, admin_user_id, conversation_id, reason_category, reason_text, report_reference", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(0, quanti - 1);
    if (filtri.operatore) q = q.eq("admin_user_id", filtri.operatore);
    if (filtri.dal) q = q.gte("created_at", inizioGiorno(filtri.dal));
    if (filtri.al) q = q.lt("created_at", giornoSuccessivo(filtri.al));
    const { data, error, count } = await q;
    if (error) {
      if (registroAssente(error.code)) {
        avvisi.push("Il registro degli accessi alle chat non esiste ancora (migration 0064).");
      } else {
        logger.error("admin/registro", "chat_access_log non leggibile:", error.message);
        return {
          ok: false,
          error: "Non riesco a leggere il registro degli accessi alle chat. L'elenco non è vuoto, è non disponibile.",
        };
      }
    } else {
      accessi = data ?? [];
      nAccessi = count ?? accessi.length;
    }
  }

  const fuse: Fusa[] = [
    ...azioni.map((r): Fusa => ({ at: r.created_at, fonte: "azione", riga: r })),
    ...accessi.map((r): Fusa => ({ at: r.created_at, fonte: "accesso_chat", riga: r })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const finestra = fuse.slice((pagina - 1) * perPagina, pagina * perPagina);

  const idAccount: string[] = [];
  for (const f of finestra) {
    if (f.fonte === "azione") {
      if (f.riga.actor_id) idAccount.push(f.riga.actor_id);
      if (f.riga.affected_user_id) idAccount.push(f.riga.affected_user_id);
    } else {
      idAccount.push(f.riga.admin_user_id);
    }
  }
  const nomi = await nomiAccount(idAccount);
  const nome = (id: string | null) => (id ? (nomi.get(id) ?? id.slice(0, 8)) : "—");

  const righe: RegistroRiga[] = finestra.map((f): RegistroRiga => {
    if (f.fonte === "azione") {
      const r = f.riga;
      return {
        id: r.id,
        fonte: "azione",
        at: r.created_at,
        operatoreId: r.actor_id,
        operatore: nome(r.actor_id),
        azione: etichettaAzione(r.action),
        oggetto: `${r.target_type}${r.target_id ? ` ${r.target_id}` : ""}`,
        interessato: r.affected_user_id ? nome(r.affected_user_id) : (r.affected_email ?? "—"),
        motivo: r.reason,
        notifica: r.notified_at ? `Inviata il ${r.notified_at}` : r.notify_error ? `Non inviata: ${r.notify_error}` : "—",
      };
    }
    const r = f.riga;
    return {
      id: r.id,
      fonte: "accesso_chat",
      at: r.created_at,
      operatoreId: r.admin_user_id,
      operatore: nome(r.admin_user_id),
      azione: "Accesso alla conversazione",
      oggetto: `conversazione ${r.conversation_id}`,
      interessato: "—",
      motivo: `${etichettaCategoria(r.reason_category)}: ${r.reason_text}${r.report_reference ? ` (${r.report_reference})` : ""}`,
      notifica: "—",
    };
  });

  return { ok: true, righe, totale: nAzioni + nAccessi, avvisi };
}

function cella(v: string): string {
  // Neutralizza le formule dei fogli di calcolo e raddoppia le virgolette.
  const sicuro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${sicuro.replace(/"/g, '""')}"`;
}

export function righeInCsv(righe: RegistroRiga[]): string {
  const testa = ["Data", "Operatore", "Azione", "Oggetto", "Interessato", "Motivo", "Notifica"];
  const corpo = righe.map((r) =>
    [r.at, r.operatore, r.azione, r.oggetto, r.interessato, r.motivo, r.notifica].map(cella).join(","),
  );
  return [testa.map(cella).join(","), ...corpo].join("\r\n");
}
