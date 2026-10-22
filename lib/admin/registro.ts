import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { colonnaAssente } from "@/lib/admin/schema-compat";
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


const UUID_GLOBALE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const ETICHETTE_OGGETTO: Record<string, string> = {
  profilo: "Profilo",
  candidatura: "Candidatura",
  media: "Contenuto",
  video: "Video",
  account: "Account",
  conversazione: "Conversazione",
  messaggio: "Messaggio",
  struttura: "Struttura",
  recensione: "Recensione",
  segnalazione: "Segnalazione",
  segnalazione_profilo: "Segnalazione profilo",
  booking: "Richiesta di booking",
  lead: "Lead",
  evento: "Evento",
  format: "Format",
  blog: "Articolo",
  genere: "Genere",
  consulenza: "Consulenza",
  consulente: "Consulente",
};

function etichettaOggetto(tipo: string): string {
  return ETICHETTE_OGGETTO[tipo] ?? etichettaAzione(tipo);
}

function uuidNelTesto(t: string): string[] {
  return (t.match(UUID_GLOBALE) ?? []).map((u) => u.toLowerCase());
}

type Bersaglio = { tipo: string; id: string };

/**
 * Risolve in batch gli UUID del registro in nomi leggibili: i `target_id` per
 * tipo e gli UUID che compaiono nei testi (motivo, descrizione). Sola lettura.
 *
 * Ogni lettura è indipendente e a errore controllato: se una fallisce si
 * registra un avviso e quegli UUID restano com'erano. Non lancia mai.
 * Chiave della mappa: UUID in minuscolo.
 */
async function risolviNomi(bersagli: Bersaglio[], testi: string[]): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const nomi = new Map<string, string>();
  const dal = (tipo: string) => Array.from(new Set(bersagli.filter((b) => b.tipo === tipo).map((b) => b.id.toLowerCase())));
  const daTesti = Array.from(new Set(testi.flatMap(uuidNelTesto)));
  const avviso = (cosa: string, msg: string) => logger.warn("admin/registro", `${cosa} non risolvibili:`, msg);

  // Primo giro: tutto ciò che ha il nome in una sola riga, più i rimandi ai profili.
  const idMedia = dal("media");
  const idVideo = dal("video");
  const profiliDaMedia = new Map<string, string>(); // media/video id -> artist id

  await Promise.all([
    idMedia.length > 0
      ? admin
          .from("artist_media_submissions")
          .select("id, artist_id")
          .in("id", idMedia)
          .then(({ data, error }) => {
            if (error) return avviso("contenuti", error.message);
            for (const r of data ?? []) if (r.artist_id) profiliDaMedia.set(r.id.toLowerCase(), r.artist_id.toLowerCase());
          })
      : Promise.resolve(),
    idVideo.length > 0
      ? admin
          .from("artist_videos")
          .select("id, artist_id")
          .in("id", idVideo)
          .then(({ data, error }) => {
            if (error) return avviso("video", error.message);
            for (const r of data ?? []) if (r.artist_id) profiliDaMedia.set(r.id.toLowerCase(), r.artist_id.toLowerCase());
          })
      : Promise.resolve(),
    dal("candidatura").length > 0
      ? admin
          .from("artist_applications")
          .select("id, stage_name")
          .in("id", dal("candidatura"))
          .then(({ data, error }) => {
            if (error) return avviso("candidature", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.stage_name);
          })
      : Promise.resolve(),
    dal("struttura").length > 0
      ? admin
          .from("venues")
          .select("id, name")
          .in("id", dal("struttura"))
          .then(({ data, error }) => {
            if (error) return avviso("strutture", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.name);
          })
      : Promise.resolve(),
    dal("blog").length > 0
      ? admin
          .from("blog_posts")
          .select("id, title")
          .in("id", dal("blog"))
          .then(({ data, error }) => {
            if (error) return avviso("articoli", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.title);
          })
      : Promise.resolve(),
    dal("format").length > 0
      ? admin
          .from("formats")
          .select("id, title")
          .in("id", dal("format"))
          .then(({ data, error }) => {
            if (error) return avviso("format", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.title);
          })
      : Promise.resolve(),
    dal("genere").length > 0
      ? admin
          .from("genres")
          .select("id, name")
          .in("id", dal("genere"))
          .then(({ data, error }) => {
            if (error) return avviso("generi", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.name);
          })
      : Promise.resolve(),
    dal("consulente").length > 0
      ? admin
          .from("consultants")
          .select("id, name")
          .in("id", dal("consulente"))
          .then(({ data, error }) => {
            if (error) return avviso("consulenti", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.name);
          })
      : Promise.resolve(),
  ]);

  // Secondo giro: profili artista, eventi e account. Gli UUID dei testi si
  // provano su tutte e tre le tabelle.
  const idArtisti = Array.from(new Set([...dal("profilo"), ...profiliDaMedia.values(), ...daTesti]));
  const idEventi = Array.from(new Set([...dal("evento"), ...daTesti]));
  const idAccount = Array.from(new Set([...dal("account"), ...daTesti]));
  const nomiArtisti = new Map<string, string>();

  await Promise.all([
    idArtisti.length > 0
      ? admin
          .from("artists")
          .select("id, stage_name")
          .in("id", idArtisti)
          .then(({ data, error }) => {
            if (error) return avviso("profili", error.message);
            for (const r of data ?? []) nomiArtisti.set(r.id.toLowerCase(), r.stage_name);
          })
      : Promise.resolve(),
    idEventi.length > 0
      ? admin
          .from("events")
          .select("id, title")
          .in("id", idEventi)
          .then(({ data, error }) => {
            if (error) return avviso("eventi", error.message);
            for (const r of data ?? []) nomi.set(r.id.toLowerCase(), r.title);
          })
      : Promise.resolve(),
    idAccount.length > 0
      ? admin
          .from("profiles")
          .select("id, full_name")
          .in("id", idAccount)
          .then(({ data, error }) => {
            if (error) return avviso("account", error.message);
            for (const r of data ?? []) if (r.full_name) nomi.set(r.id.toLowerCase(), r.full_name);
          })
      : Promise.resolve(),
  ]);

  // I nomi d'arte hanno la precedenza sugli account con lo stesso UUID (non
  // dovrebbe accadere, ma un profilo è ciò che il Registro racconta).
  for (const [id, nome] of nomiArtisti) nomi.set(id, nome);
  // Contenuti e video prendono il nome del profilo a cui appartengono.
  for (const [id, artistId] of profiliDaMedia) {
    const nome = nomiArtisti.get(artistId);
    if (nome) nomi.set(id, nome);
  }
  return nomi;
}

/** Sostituisce nel testo ogni UUID noto con «nome». Gli altri restano uguali. */
function sostituisciUuid(testo: string, nomi: Map<string, string>): string {
  return testo.replace(UUID_GLOBALE, (u) => {
    const nome = nomi.get(u.toLowerCase());
    return nome ? `«${nome}»` : u;
  });
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
  /** Dalla 0074: assente sui database che non l'hanno ancora. */
  target_name?: string | null;
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
    const colonne =
      "id, created_at, actor_id, target_type, target_id, affected_user_id, affected_email, action, reason, notified_at, notify_error";
    const leggi = (sel: string) => {
      let q = admin
        .from("moderation_actions")
        .select(sel, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(0, quanti - 1);
      if (filtri.operatore) q = q.eq("actor_id", filtri.operatore);
      if (filtri.tipo) q = q.eq("target_type", filtri.tipo);
      if (filtri.dal) q = q.gte("created_at", inizioGiorno(filtri.dal));
      if (filtri.al) q = q.lt("created_at", giornoSuccessivo(filtri.al));
      return q.returns<AzioneRow[]>();
    };
    let { data, error, count } = await leggi(`${colonne}, target_name`);
    // Senza la migration 0074 non c'è target_name: si legge senza.
    if (error && colonnaAssente(error, "target_name")) ({ data, error, count } = await leggi(colonne));
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

  // Nomi al posto degli UUID in «Oggetto» e «Motivo». Se la risoluzione non
  // riesce, l'UUID resta com'è: la pagina non si rompe.
  const bersagli: Bersaglio[] = [];
  const testi: string[] = [];
  for (const f of finestra) {
    if (f.fonte === "azione") {
      if (f.riga.target_id) bersagli.push({ tipo: f.riga.target_type, id: f.riga.target_id });
      testi.push(f.riga.reason);
    } else {
      testi.push(f.riga.reason_text);
    }
  }
  let risolti = new Map<string, string>();
  try {
    risolti = await risolviNomi(bersagli, testi);
  } catch (e) {
    logger.warn("admin/registro", "nomi non risolti:", e instanceof Error ? e.message : String(e));
  }

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
        oggetto: oggettoLeggibile(r.target_type, r.target_id, risolti, r.target_name),
        interessato: r.affected_user_id ? nome(r.affected_user_id) : (r.affected_email ?? "—"),
        motivo: sostituisciUuid(r.reason, risolti),
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
      oggetto: `Conversazione ${r.conversation_id}`,
      interessato: "—",
      motivo: `${etichettaCategoria(r.reason_category)}: ${sostituisciUuid(r.reason_text, risolti)}${r.report_reference ? ` (${r.report_reference})` : ""}`,
      notifica: "—",
    };
  });

  return { ok: true, righe, totale: nAzioni + nAccessi, avvisi };
}

function oggettoLeggibile(
  tipo: string,
  id: string | null,
  nomi: Map<string, string>,
  /** Nome salvato con la decisione: vale anche se l'oggetto è stato eliminato. */
  salvato?: string | null,
): string {
  const etichetta = etichettaOggetto(tipo);
  if (!id) return salvato ? `${etichetta} — ${salvato}` : etichetta;
  const nome = nomi.get(id.toLowerCase()) ?? salvato;
  return nome ? `${etichetta} — ${nome}` : `${etichetta} ${id}`;
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
