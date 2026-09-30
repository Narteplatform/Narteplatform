import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { deleteObject } from "@/lib/storage/bunny/storage";
import { deleteStreamVideo } from "@/lib/storage/bunny/stream";
import { registraDecisione } from "@/lib/moderation/decisioni";

/**
 * Completamento della cancellazione dell'account: la rimozione DEFINITIVA.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ⛔ STRUMENTO DISTRUTTIVO. Lo esegue solo il superadmin root, su richiesta
 * dell'interessato, dalla pagina /admin/impostazioni/cancellazioni. Nessun
 * altro codice deve chiamare `eseguiCompletamento`.
 *
 * Due funzioni, con un patto preciso:
 *
 *   - `anteprimaCompletamento` è SOLA LETTURA. Elenca ciò che verrebbe rimosso
 *     o anonimizzato, e dice se qualche lettura è fallita.
 *   - `eseguiCompletamento` RICALCOLA l'anteprima, si ferma se contiene errori
 *     e cancella SOLO gli identificativi che l'anteprima ha appena letto. Non
 *     riesegue query "per email" al momento di cancellare: ciò che si conta è
 *     ciò che si cancella.
 *
 * REGOLE DI CLAUDE.md APPLICATE QUI
 *   - Regola 4: ogni lettura controlla `error`. Una lettura fallita non diventa
 *     mai «zero righe»: entra in `errori` e blocca l'esecuzione.
 *   - Regola 5: un elenco vuoto è credibile solo se le letture sono riuscite.
 *     L'esecuzione richiede che NESSUNA voce abbia errori.
 *   - Nessun `?? []` su un dato che proviene da una lettura non verificata.
 * ────────────────────────────────────────────────────────────────────────────
 */

const AREA = "cancellazione/completa";

/** Giorni dalla conferma dopo i quali la rimozione è la procedura ordinaria. */
export const GIORNI_MINIMI = 30;

/** Segnaposto scritto al posto dei dati personali di chi ha segnalato. */
const NOME_ANONIMO = "Utente cancellato";
const EMAIL_ANONIMA = "anonimo@narte.invalid";

/** Oltre questa soglia l'anteprima non è più affidabile (limite di PostgREST): si blocca. */
const LIMITE_RIGHE = 1000;
const LIMITE_FILE = 5000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BUCKET_UTENTE = ["artist-images", "artist-audio", "artist-videos", "venue-images"] as const;
const BUCKET_CANDIDATURE = "application-videos";

// ───────────────────────────── Tipi pubblici ─────────────────────────────

export type VoceAnteprima = {
  chiave: string;
  etichetta: string;
  /** Cosa succederebbe a queste righe/file. */
  azione: string;
  conteggio: number;
  note?: string;
  /** Presente solo se la lettura è fallita: blocca l'esecuzione. */
  errore?: string;
  /** Alcuni esempi leggibili (nomi dei profili, bucket), non l'elenco completo. */
  dettagli?: string[];
};

export type RichiestaCancellazione = {
  id: string;
  userId: string;
  email: string | null;
  nome: string | null;
  richiestaIl: string;
  confermataIl: string | null;
  annullataIl: string | null;
  completataIl: string | null;
  giorniTrascorsi: number | null;
  giaCompletata: boolean;
};

export type AnteprimaCompletamento = {
  richiesta: RichiestaCancellazione | null;
  voci: VoceAnteprima[];
  /** Motivi per cui l'esecuzione non può partire, qualunque cosa scelga l'operatore. */
  bloccanti: string[];
  /** Cose da sapere, che non impediscono l'esecuzione. */
  avvisi: string[];
  /** Tutti gli errori di lettura, già inclusi in `bloccanti`. */
  errori: string[];
  /** True se mancano meno di GIORNI_MINIMI giorni: serve `forza`. */
  richiedeForzatura: boolean;
  /** True solo se non c'è nessun bloccante né errore di lettura. */
  eseguibile: boolean;
};

export type PassoId =
  | "verifica"
  | "consensi"
  | "organizzatori"
  | "file-bunny-storage"
  | "video-bunny-stream"
  | "file-supabase"
  | "righe-per-email"
  | "profili-artista"
  | "chiusura-richiesta"
  | "account"
  | "registro";

export type EsitoCompletamento =
  | {
      ok: true;
      passiEseguiti: PassoId[];
      avvisi: string[];
      riferimento: string | null;
    }
  | {
      ok: false;
      passoFallito: PassoId;
      errore: string;
      passiEseguiti: PassoId[];
    };

// ───────────────────────────── Piano interno ─────────────────────────────

type FileSupabase = { bucket: string; path: string };

/**
 * Tutto ciò che l'esecuzione toccherà, con gli identificativi. Non esce dal
 * modulo: all'esterno arriva solo `AnteprimaCompletamento`.
 */
type Piano = {
  userId: string;
  email: string;
  nome: string | null;
  confermataIl: string;
  consensiTotali: number;
  organizzatoriIds: string[];
  leadsIds: string[];
  messaggiIds: string[];
  candidatureIds: string[];
  consulenzeIds: string[];
  segnalazioniIds: string[];
  mediaAssets: { id: string; storageKey: string }[];
  guidStream: string[];
  fileSupabase: FileSupabase[];
  artistiIds: string[];
};

type LetturaIds = { ids: string[]; errore?: string };

function impronta(emailMinuscola: string): string {
  return createHash("sha256").update(emailMinuscola).digest("hex");
}

/** `ilike` senza caratteri jolly = confronto senza distinzione di maiuscole. `_` e `%` vanno neutralizzati. */
function patternEsatto(valore: string): string {
  return valore.replace(/[\\%_]/g, "\\$&");
}

function formatoData(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

function messaggio(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Esegue una lettura di soli id e la traduce in `LetturaIds`.
 * Se le righe sono più del limite l'elenco sarebbe troncato: errore, non un
 * elenco parziale spacciato per completo.
 */
async function leggiIds(
  esegui: () => PromiseLike<{
    data: { id: string }[] | null;
    count: number | null;
    error: { message: string } | null;
  }>
): Promise<LetturaIds> {
  try {
    const { data, count, error } = await esegui();
    if (error) return { ids: [], errore: error.message };
    if (!data) return { ids: [], errore: "risposta senza dati" };
    if (count !== null && count > data.length) {
      return { ids: [], errore: `troppe righe (${count}): oltre il limite di ${LIMITE_RIGHE}, gestire a mano` };
    }
    return { ids: data.map((r) => r.id) };
  } catch (e) {
    return { ids: [], errore: messaggio(e) };
  }
}

function unisci(...letture: LetturaIds[]): LetturaIds {
  const errori = letture.filter((l) => l.errore).map((l) => l.errore as string);
  const ids = Array.from(new Set(letture.flatMap((l) => l.ids)));
  return errori.length > 0 ? { ids, errore: errori.join("; ") } : { ids };
}

/** Elenca ricorsivamente i file sotto un prefisso di un bucket Supabase. */
async function elencaFileSupabase(
  bucket: string,
  prefisso: string,
  profondita = 0
): Promise<{ percorsi: string[]; errore?: string }> {
  const admin = createAdminClient();
  const percorsi: string[] = [];
  const PAGINA = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefisso, { limit: PAGINA, offset, sortBy: { column: "name", order: "asc" } });
    if (error) return { percorsi: [], errore: `${bucket}/${prefisso}: ${error.message}` };
    if (!data) return { percorsi: [], errore: `${bucket}/${prefisso}: risposta senza dati` };

    for (const voce of data) {
      const completo = `${prefisso}/${voce.name}`;
      // Le cartelle non hanno `id`. Il codice di upload scrive percorsi piatti,
      // ma un file finito in una sottocartella non deve restare per omissione.
      if (voce.id === null) {
        if (profondita >= 3) {
          return { percorsi: [], errore: `${bucket}/${completo}: cartelle annidate troppo in profondità` };
        }
        const figli = await elencaFileSupabase(bucket, completo, profondita + 1);
        if (figli.errore) return { percorsi: [], errore: figli.errore };
        percorsi.push(...figli.percorsi);
      } else {
        percorsi.push(completo);
      }
    }
    if (percorsi.length > LIMITE_FILE) {
      return { percorsi: [], errore: `${bucket}/${prefisso}: oltre ${LIMITE_FILE} file, gestire a mano` };
    }
    if (data.length < PAGINA) break;
    offset += PAGINA;
  }
  return { percorsi };
}

// ───────────────────────────── Lettura (anteprima) ─────────────────────────────

type Costruzione = { anteprima: AnteprimaCompletamento; piano: Piano | null };

/**
 * Cuore di sola lettura: produce l'anteprima e, se tutto è leggibile, il piano
 * con gli id. Nessuna scrittura, da nessuna parte, in questa funzione.
 */
async function costruisci(richiestaId: string, attoreId: string | null): Promise<Costruzione> {
  const admin = createAdminClient();
  const voci: VoceAnteprima[] = [];
  const bloccanti: string[] = [];
  const avvisi: string[] = [];

  const vuota = (): AnteprimaCompletamento => ({
    richiesta: null,
    voci,
    bloccanti,
    avvisi,
    errori: [...bloccanti],
    richiedeForzatura: false,
    eseguibile: false,
  });

  // ── La richiesta ──
  const { data: r, error: erroreRichiesta } = await admin
    .from("account_deletion_requests")
    .select("id, user_id, requested_at, confirmed_at, cancelled_at, completed_at")
    .eq("id", richiestaId)
    .maybeSingle();
  if (erroreRichiesta) {
    bloccanti.push(`Lettura della richiesta fallita: ${erroreRichiesta.message}`);
    return { anteprima: vuota(), piano: null };
  }
  if (!r) {
    bloccanti.push("Richiesta di cancellazione non trovata.");
    return { anteprima: vuota(), piano: null };
  }

  // ── L'utente ──
  const { data: dettUtente, error: erroreUtente } = await admin.auth.admin.getUserById(r.user_id);
  const utente = dettUtente?.user ?? null;
  if (erroreUtente || !utente) {
    bloccanti.push(
      `Account non leggibile (${erroreUtente?.message ?? "utente inesistente: forse già cancellato"}).`
    );
  }
  const email = utente?.email?.trim() ?? null;
  const meta = utente?.user_metadata as { full_name?: string } | undefined;
  const nome = meta?.full_name?.trim() || null;

  const giorni = r.confirmed_at
    ? Math.floor((Date.now() - new Date(r.confirmed_at).getTime()) / 86_400_000)
    : null;

  const richiesta: RichiestaCancellazione = {
    id: r.id,
    userId: r.user_id,
    email,
    nome,
    richiestaIl: r.requested_at,
    confermataIl: r.confirmed_at,
    annullataIl: r.cancelled_at,
    completataIl: r.completed_at,
    giorniTrascorsi: giorni,
    giaCompletata: r.completed_at !== null,
  };

  if (!r.confirmed_at) bloccanti.push("La richiesta non è stata confermata dall'interessato via email.");
  if (r.cancelled_at) bloccanti.push("La richiesta è stata annullata.");
  if (r.completed_at) bloccanti.push("La richiesta risulta già completata.");
  if (attoreId && attoreId === r.user_id) bloccanti.push("Non puoi cancellare il tuo stesso account con questo strumento.");
  if (!email && utente) bloccanti.push("L'account non ha un indirizzo email: impossibile individuare le righe per email.");

  // Un superadmin non si cancella da qui: si perderebbe un accesso al pannello.
  const { data: profilo, error: erroreProfilo } = await admin
    .from("profiles")
    .select("role")
    .eq("id", r.user_id)
    .maybeSingle();
  if (erroreProfilo) {
    bloccanti.push(`Lettura del profilo fallita: ${erroreProfilo.message}`);
  } else if (profilo?.role === "superadmin") {
    bloccanti.push("L'account è un superadmin: non si cancella con questo strumento.");
  }

  const richiedeForzatura = giorni !== null && giorni < GIORNI_MINIMI;

  if (!utente || !email) {
    const a = { ...vuota(), richiesta, richiedeForzatura };
    return { anteprima: a, piano: null };
  }

  const patEmail = patternEsatto(email);
  const userId = r.user_id;
  const errori: string[] = [];
  const segnalaErrore = (voce: VoceAnteprima, errore: string) => {
    voce.errore = errore;
    errori.push(`${voce.etichetta}: ${errore}`);
  };

  // ── 1. Consensi ──
  const vConsensi: VoceAnteprima = {
    chiave: "consensi",
    etichetta: "Consensi registrati",
    azione: "Conservati: ricevono l'impronta dell'email (subject_hash); il legame con l'account si scioglie da solo",
    conteggio: 0,
  };
  const { count: nConsensi, error: eConsensi } = await admin
    .from("user_consents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (eConsensi) segnalaErrore(vConsensi, eConsensi.message);
  else vConsensi.conteggio = nConsensi ?? 0;
  voci.push(vConsensi);

  // ── 2. Organizzatore ──
  const vOrg: VoceAnteprima = {
    chiave: "organizzatori",
    etichetta: "Profilo organizzatore",
    azione: "Anonimizzato («Utente cancellato», foto/bio/contatti azzerati). La riga resta: conversazioni e date della controparte non si toccano",
    conteggio: 0,
  };
  const org = await leggiIds(() =>
    admin.from("organizers").select("id", { count: "exact" }).eq("user_id", userId).range(0, LIMITE_RIGHE - 1)
  );
  if (org.errore) segnalaErrore(vOrg, org.errore);
  else vOrg.conteggio = org.ids.length;
  voci.push(vOrg);

  // ── 3. Righe per email / utente ──
  const leads = unisci(
    await leggiIds(() =>
      admin.from("leads").select("id", { count: "exact" }).ilike("contact_email", patEmail).range(0, LIMITE_RIGHE - 1)
    ),
    await leggiIds(() =>
      admin.from("leads").select("id", { count: "exact" }).eq("requester_user_id", userId).range(0, LIMITE_RIGHE - 1)
    )
  );
  const messaggi = await leggiIds(() =>
    admin.from("contact_messages").select("id", { count: "exact" }).ilike("email", patEmail).range(0, LIMITE_RIGHE - 1)
  );

  // Le candidature si leggono con video_path: il file va tolto PRIMA della riga.
  const candidatureIds: string[] = [];
  const guidCandidature: string[] = [];
  const fileCandidature: FileSupabase[] = [];
  let erroreCandidature: string | undefined;
  {
    const { data, count, error } = await admin
      .from("artist_applications")
      .select("id, video_path", { count: "exact" })
      .ilike("email", patEmail)
      .range(0, LIMITE_RIGHE - 1);
    if (error) erroreCandidature = error.message;
    else if (!data) erroreCandidature = "risposta senza dati";
    else if (count !== null && count > data.length) erroreCandidature = `troppe righe (${count})`;
    else {
      for (const c of data) {
        candidatureIds.push(c.id);
        const p = c.video_path?.trim();
        if (!p) continue;
        if (UUID_RE.test(p)) guidCandidature.push(p);
        else fileCandidature.push({ bucket: BUCKET_CANDIDATURE, path: p });
      }
    }
  }

  const consulenze = unisci(
    await leggiIds(() =>
      admin.from("consultations").select("id", { count: "exact" }).ilike("email", patEmail).range(0, LIMITE_RIGHE - 1)
    ),
    await leggiIds(() =>
      admin.from("consultations").select("id", { count: "exact" }).eq("user_id", userId).range(0, LIMITE_RIGHE - 1)
    )
  );
  const segnalazioni = unisci(
    await leggiIds(() =>
      admin
        .from("content_reports")
        .select("id", { count: "exact" })
        .ilike("reporter_email", patEmail)
        .range(0, LIMITE_RIGHE - 1)
    ),
    await leggiIds(() =>
      admin
        .from("content_reports")
        .select("id", { count: "exact" })
        .eq("reporter_user_id", userId)
        .range(0, LIMITE_RIGHE - 1)
    )
  );

  const righe: [string, string, string, LetturaIds | { ids: string[]; errore?: string }][] = [
    ["leads", "Richieste di booking (lead)", "Eliminate (per email di contatto e per utente richiedente)", leads],
    ["contact_messages", "Messaggi dal modulo contatti", "Eliminati (per email)", messaggi],
    [
      "artist_applications",
      "Candidature artista",
      "Eliminate (per email), insieme al video di presentazione",
      { ids: candidatureIds, errore: erroreCandidature },
    ],
    ["consultations", "Consulenze", "Eliminate (per email e per utente)", consulenze],
    [
      "content_reports",
      "Segnalazioni e reclami inviati",
      "Anonimizzati (nome, email, utente): restano come registro DSA",
      segnalazioni,
    ],
  ];
  for (const [chiave, etichetta, azione, lettura] of righe) {
    const v: VoceAnteprima = { chiave, etichetta, azione, conteggio: 0 };
    if (lettura.errore) segnalaErrore(v, lettura.errore);
    else v.conteggio = lettura.ids.length;
    voci.push(v);
  }

  // ── 4. Profili artista ──
  const vArtisti: VoceAnteprima = {
    chiave: "artists",
    etichetta: "Profili artista e dati collegati",
    azione:
      "Anonimizzati prima dell'account: nome «Artista cancellato», contenuti e dati personali svuotati, profilo nascosto e staccato dall'account. La riga resta perché conversazioni, messaggi e date dell'organizzatore non vanno persi",
    conteggio: 0,
  };
  let artistiIds: string[] = [];
  {
    const { data, error } = await admin
      .from("artists")
      .select("id, stage_name, status")
      .eq("user_id", userId)
      .limit(LIMITE_RIGHE);
    if (error) segnalaErrore(vArtisti, error.message);
    else if (!data) segnalaErrore(vArtisti, "risposta senza dati");
    else {
      artistiIds = data.map((a) => a.id);
      vArtisti.conteggio = data.length;
      vArtisti.dettagli = data.map((a) => `${a.stage_name} (${a.status})`);
    }
  }
  voci.push(vArtisti);

  // ── 5. File su bunny.net Storage (registro media_assets) ──
  const vBunnyFile: VoceAnteprima = {
    chiave: "bunny-storage",
    etichetta: "File su bunny.net Storage",
    azione: "Eliminati dal CDN, poi eliminata la riga in media_assets",
    conteggio: 0,
    note: "Sono considerati solo i file registrati in media_assets (owner_user_id o artist_id). Un file caricato senza registrazione non è elencabile da qui.",
  };
  const mediaMappa = new Map<string, { id: string; storageKey: string }>();
  {
    const perUtente = await admin
      .from("media_assets")
      .select("id, storage_key, provider")
      .eq("owner_user_id", userId)
      .limit(LIMITE_FILE);
    if (perUtente.error) segnalaErrore(vBunnyFile, perUtente.error.message);
    else if (!perUtente.data) segnalaErrore(vBunnyFile, "risposta senza dati");
    else for (const m of perUtente.data) mediaMappa.set(m.id, { id: m.id, storageKey: m.storage_key });

    if (!vBunnyFile.errore && artistiIds.length > 0) {
      const perArtista = await admin
        .from("media_assets")
        .select("id, storage_key, provider")
        .in("artist_id", artistiIds)
        .limit(LIMITE_FILE);
      if (perArtista.error) segnalaErrore(vBunnyFile, perArtista.error.message);
      else if (!perArtista.data) segnalaErrore(vBunnyFile, "risposta senza dati");
      else for (const m of perArtista.data) mediaMappa.set(m.id, { id: m.id, storageKey: m.storage_key });
    }
    vBunnyFile.conteggio = mediaMappa.size;
  }
  voci.push(vBunnyFile);

  // ── 6. Video su bunny.net Stream ──
  const vStream: VoceAnteprima = {
    chiave: "bunny-stream",
    etichetta: "Video su bunny.net Stream",
    azione: "Eliminati da Bunny Stream (video dei profili artista e video di candidatura)",
    conteggio: 0,
  };
  const guid = new Set<string>(guidCandidature);
  if (artistiIds.length > 0) {
    const { data, error } = await admin
      .from("artist_videos")
      .select("id, bunny_guid")
      .in("artist_id", artistiIds)
      .not("bunny_guid", "is", null)
      .limit(LIMITE_FILE);
    if (error) segnalaErrore(vStream, error.message);
    else if (!data) segnalaErrore(vStream, "risposta senza dati");
    else for (const v of data) if (v.bunny_guid) guid.add(v.bunny_guid);
  }
  vStream.conteggio = guid.size;
  voci.push(vStream);

  // ── 7. File su Supabase Storage ──
  const vSupabase: VoceAnteprima = {
    chiave: "supabase-storage",
    etichetta: "File su Supabase Storage",
    azione: `Eliminati dai bucket (percorso «${userId}/…» in ${BUCKET_UTENTE.join(", ")}; video di candidatura in ${BUCKET_CANDIDATURE})`,
    conteggio: 0,
    dettagli: [],
  };
  const fileSupabase: FileSupabase[] = [];
  for (const bucket of BUCKET_UTENTE) {
    const el = await elencaFileSupabase(bucket, userId);
    if (el.errore) {
      segnalaErrore(vSupabase, el.errore);
      break;
    }
    for (const p of el.percorsi) fileSupabase.push({ bucket, path: p });
    vSupabase.dettagli?.push(`${bucket}: ${el.percorsi.length} file`);
  }
  for (const f of fileCandidature) fileSupabase.push(f);
  if (fileCandidature.length > 0) vSupabase.dettagli?.push(`${BUCKET_CANDIDATURE}: ${fileCandidature.length} file`);
  vSupabase.conteggio = fileSupabase.length;
  voci.push(vSupabase);

  // ── Informativo: abbonamenti ──
  {
    const { data, error } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, status, cancel_at_period_end")
      .eq("user_id", userId);
    if (error) {
      errori.push(`Abbonamenti: ${error.message}`);
    } else if (data) {
      const attivi = data.filter((s) => ["trialing", "active", "past_due"].includes(s.status));
      const nonDisdetti = attivi.filter((s) => !s.cancel_at_period_end);
      if (nonDisdetti.length > 0) {
        avvisi.push(
          `${nonDisdetti.length} abbonamento/i Stripe ancora attivo/i e SENZA disdetta a fine periodo: disdirli su Stripe prima di procedere.`
        );
      } else if (attivi.length > 0) {
        avvisi.push(
          `${attivi.length} abbonamento/i Stripe con disdetta a fine periodo: nessun nuovo addebito. I documenti contabili restano su Stripe.`
        );
      }
    }
  }

  avvisi.push(
    "Le conversazioni restano alla controparte in entrambi i casi: i profili (artista e organizzatore) sono anonimizzati, non eliminati."
  );

  bloccanti.push(...errori.map((e) => `Lettura fallita — ${e}`));

  const anteprima: AnteprimaCompletamento = {
    richiesta,
    voci,
    bloccanti,
    avvisi,
    errori,
    richiedeForzatura,
    eseguibile: bloccanti.length === 0,
  };

  if (errori.length > 0) return { anteprima, piano: null };

  const piano: Piano = {
    userId,
    email,
    nome,
    confermataIl: r.confirmed_at ?? "",
    consensiTotali: vConsensi.conteggio,
    organizzatoriIds: org.ids,
    leadsIds: leads.ids,
    messaggiIds: messaggi.ids,
    candidatureIds,
    consulenzeIds: consulenze.ids,
    segnalazioniIds: segnalazioni.ids,
    mediaAssets: Array.from(mediaMappa.values()),
    guidStream: Array.from(guid),
    fileSupabase,
    artistiIds,
  };
  return { anteprima, piano };
}

/**
 * SOLA LETTURA. Elenca ciò che `eseguiCompletamento` rimuoverebbe o
 * anonimizzerebbe. Se una lettura fallisce lo dice (`errori`) e l'esecuzione
 * risulta bloccata.
 */
export async function anteprimaCompletamento(richiestaId: string): Promise<AnteprimaCompletamento> {
  try {
    const { anteprima } = await costruisci(richiestaId, null);
    return anteprima;
  } catch (e) {
    logger.error(AREA, `anteprima fallita: ${messaggio(e)}`);
    return {
      richiesta: null,
      voci: [],
      bloccanti: [`Anteprima non riuscita: ${messaggio(e)}`],
      avvisi: [],
      errori: [messaggio(e)],
      richiedeForzatura: false,
      eseguibile: false,
    };
  }
}

// ───────────────────────────── Esecuzione ─────────────────────────────

/**
 * ⛔ CANCELLA DATI DI PRODUZIONE, IN MODO IRREVERSIBILE.
 *
 * ORDINE DEI PASSI (si ferma al primo errore, senza rollback automatico):
 *
 *   1. consensi           user_consents.subject_hash = sha256(email minuscola)
 *   2. organizzatori      anonimizzati, riga conservata
 *   3. file bunny storage, poi stream, poi supabase (+ righe media_assets)
 *   4. righe per email    leads, contact_messages, artist_applications,
 *                         consultations eliminate; content_reports anonimizzate
 *   5. profili artista    anonimizzati (conversazioni e date della controparte restano)
 *   6. chiusura richiesta completed_at = now()
 *   7. account            auth.admin.deleteUser
 *   8. registro           moderation_actions + comunicazione finale
 *
 * SCOSTAMENTO DALL'ORDINE "NATURALE": i file si tolgono PRIMA delle righe che
 * ne conservano il riferimento (video_path delle candidature, storage_key di
 * media_assets, bunny_guid dei video). Se la rimozione di un file fallisse a
 * righe già cancellate, un secondo tentativo non saprebbe più cosa cercare e i
 * file resterebbero orfani. Così un fallimento si può riprovare.
 *
 * PERCHÉ `completed_at` PRIMA DI `deleteUser`. `account_deletion_requests.user_id`
 * è `on delete cascade` (migration 0060): cancellando l'utente la riga della
 * richiesta sparisce, e un `update` successivo non troverebbe nulla. La
 * conclusione la si scrive quindi prima; se `deleteUser` poi fallisce, il
 * campo viene rimesso a null (l'unica scrittura compensativa, su un valore
 * appena scritto qui) perché una richiesta «completata» con l'utente ancora
 * presente bloccherebbe ogni nuovo tentativo. La traccia definitiva e durevole
 * è `moderation_actions` (passo 8), che non ha cascata sull'utente.
 */
export async function eseguiCompletamento(input: {
  richiestaId: string;
  confermaEmail: string;
  attoreId: string;
  /** Solo se l'operatore ha spuntato la seconda conferma («prima dei 30 giorni su richiesta dell'interessato»). */
  forza?: boolean;
}): Promise<EsitoCompletamento> {
  const passiEseguiti: PassoId[] = [];
  const fallito = (passoFallito: PassoId, errore: string): EsitoCompletamento => {
    logger.error(
      AREA,
      `INTERROTTO al passo «${passoFallito}» (richiesta ${input.richiestaId}): ${errore}. ` +
        `Passi già eseguiti: ${passiEseguiti.join(", ") || "nessuno"}. Nessun rollback automatico.`
    );
    return { ok: false, passoFallito, errore, passiEseguiti };
  };

  let costruzione: Costruzione;
  try {
    costruzione = await costruisci(input.richiestaId, input.attoreId);
  } catch (e) {
    return fallito("verifica", `ricalcolo dell'anteprima fallito: ${messaggio(e)}`);
  }
  const { anteprima, piano } = costruzione;

  if (anteprima.bloccanti.length > 0 || !piano || !anteprima.richiesta) {
    return fallito("verifica", anteprima.bloccanti.join(" | ") || "anteprima non disponibile");
  }
  if (input.confermaEmail.trim().toLowerCase() !== piano.email.toLowerCase()) {
    return fallito("verifica", "L'email digitata non coincide con quella dell'account.");
  }
  if (anteprima.richiedeForzatura && input.forza !== true) {
    return fallito(
      "verifica",
      `Sono passati meno di ${GIORNI_MINIMI} giorni dalla conferma: serve la seconda conferma esplicita.`
    );
  }

  const admin = createAdminClient();
  const { userId } = piano;
  const avvisi: string[] = [];

  logger.warn(
    AREA,
    `AVVIO cancellazione definitiva — richiesta=${input.richiestaId} utente=${userId} attore=${input.attoreId} ` +
      `forzata=${anteprima.richiedeForzatura ? "sì" : "no"}`
  );

  const ok = (id: PassoId, dettaglio: string) => {
    passiEseguiti.push(id);
    logger.warn(AREA, `passo «${id}» completato — ${dettaglio}`);
  };

  // ── 1. Consensi ──
  {
    const { data, error } = await admin
      .from("user_consents")
      .update({ subject_hash: impronta(piano.email.toLowerCase()) })
      .eq("user_id", userId)
      .select("id");
    if (error) return fallito("consensi", error.message);
    ok("consensi", `${data?.length ?? 0} righe (attese ${piano.consensiTotali})`);
  }

  // ── 2. Organizzatori ──
  if (piano.organizzatoriIds.length > 0) {
    const { error } = await admin
      .from("organizers")
      .update({
        display_name: NOME_ANONIMO,
        avatar_url: null,
        bio: null,
        phone: null,
        website: null,
        instagram: null,
      })
      .in("id", piano.organizzatoriIds);
    if (error) return fallito("organizzatori", error.message);
  }
  ok("organizzatori", `${piano.organizzatoriIds.length} record`);

  // ── 3a. Bunny Storage ──
  {
    const eliminate: string[] = [];
    for (const m of piano.mediaAssets) {
      try {
        await deleteObject(m.storageKey);
        eliminate.push(m.id);
      } catch (e) {
        return fallito("file-bunny-storage", `chiave ${m.storageKey}: ${messaggio(e)}`);
      }
    }
    if (eliminate.length > 0) {
      const { error } = await admin.from("media_assets").delete().in("id", eliminate);
      if (error) {
        return fallito(
          "file-bunny-storage",
          `file eliminati ma righe media_assets non rimosse: ${error.message}`
        );
      }
    }
    ok("file-bunny-storage", `${eliminate.length} oggetti`);
  }

  // ── 3b. Bunny Stream ──
  {
    for (const g of piano.guidStream) {
      try {
        await deleteStreamVideo(g);
      } catch (e) {
        return fallito("video-bunny-stream", `video ${g}: ${messaggio(e)}`);
      }
    }
    ok("video-bunny-stream", `${piano.guidStream.length} video`);
  }

  // ── 3c. Supabase Storage ──
  {
    const perBucket = new Map<string, string[]>();
    for (const f of piano.fileSupabase) {
      perBucket.set(f.bucket, [...(perBucket.get(f.bucket) ?? []), f.path]);
    }
    for (const [bucket, percorsi] of perBucket) {
      for (let i = 0; i < percorsi.length; i += 100) {
        const blocco = percorsi.slice(i, i + 100);
        const { error } = await admin.storage.from(bucket).remove(blocco);
        if (error) return fallito("file-supabase", `${bucket}: ${error.message}`);
      }
    }
    ok("file-supabase", `${piano.fileSupabase.length} file`);
  }

  // ── 4. Righe per email / utente ──
  {
    const eliminazioni: [string, string[]][] = [
      ["leads", piano.leadsIds],
      ["contact_messages", piano.messaggiIds],
      ["artist_applications", piano.candidatureIds],
      ["consultations", piano.consulenzeIds],
    ];
    for (const [tabella, ids] of eliminazioni) {
      if (ids.length === 0) continue;
      let errore: string | null = null;
      switch (tabella) {
        case "leads":
          errore = (await admin.from("leads").delete().in("id", ids)).error?.message ?? null;
          break;
        case "contact_messages":
          errore = (await admin.from("contact_messages").delete().in("id", ids)).error?.message ?? null;
          break;
        case "artist_applications":
          errore = (await admin.from("artist_applications").delete().in("id", ids)).error?.message ?? null;
          break;
        case "consultations":
          errore = (await admin.from("consultations").delete().in("id", ids)).error?.message ?? null;
          break;
      }
      if (errore) return fallito("righe-per-email", `${tabella}: ${errore}`);
    }
    if (piano.segnalazioniIds.length > 0) {
      const { error } = await admin
        .from("content_reports")
        .update({ reporter_name: NOME_ANONIMO, reporter_email: EMAIL_ANONIMA, reporter_user_id: null })
        .in("id", piano.segnalazioniIds);
      if (error) return fallito("righe-per-email", `content_reports: ${error.message}`);
    }
    ok(
      "righe-per-email",
      `leads ${piano.leadsIds.length}, messaggi ${piano.messaggiIds.length}, candidature ${piano.candidatureIds.length}, ` +
        `consulenze ${piano.consulenzeIds.length}, segnalazioni anonimizzate ${piano.segnalazioniIds.length}`
    );
  }

  // ── 5. Profili artista: anonimizzati, NON eliminati ──
  // Eliminare la riga farebbe cadere a cascata conversazioni, messaggi e date
  // dell'ORGANIZZATORE, che ha diritto a conservarli (termini, doc. 01 art.
  // 16.1; informativa). Il profilo quindi esce dal pubblico, perde ogni dato
  // personale e contenuto, e si stacca dall'account. I file sono già stati
  // rimossi ai passi precedenti. Svuotare le colonne qui è voluto: è la
  // cancellazione richiesta dall'interessato.
  for (const artistId of piano.artistiIds) {
    const { error } = await admin
      .from("artists")
      .update({
        stage_name: "Artista cancellato",
        slug: `cancellato-${artistId.slice(0, 8)}`,
        status: "rejected",
        user_id: null,
        bio: null,
        city: null,
        cover_image: null,
        gallery: [],
        videos: [],
        audio_files: [],
        social_links: {},
        personnel: [],
        influences: [],
        languages: [],
        about_extended: null,
        what_to_expect: null,
        set_list: null,
        setup_requirements: null,
      })
      .eq("id", artistId);
    if (error) return fallito("profili-artista", `${artistId}: ${error.message}`);
    const { error: erroreVideo } = await admin.from("artist_videos").delete().eq("artist_id", artistId);
    if (erroreVideo) return fallito("profili-artista", `video ${artistId}: ${erroreVideo.message}`);
  }
  ok("profili-artista", `${piano.artistiIds.length} profili anonimizzati`);

  // ── 6. Chiusura della richiesta (prima di deleteUser: vedi commento sopra) ──
  const completataIl = new Date().toISOString();
  {
    const { error } = await admin
      .from("account_deletion_requests")
      .update({ completed_at: completataIl })
      .eq("id", input.richiestaId)
      .is("completed_at", null);
    if (error) return fallito("chiusura-richiesta", error.message);
    ok("chiusura-richiesta", completataIl);
  }

  // ── 7. Account ──
  {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      const { error: erroreRipristino } = await admin
        .from("account_deletion_requests")
        .update({ completed_at: null })
        .eq("id", input.richiestaId)
        .eq("completed_at", completataIl);
      if (erroreRipristino) {
        logger.error(
          AREA,
          `RICHIESTA ${input.richiestaId} MARCATA COMPLETATA MA ACCOUNT ${userId} ANCORA PRESENTE ` +
            `e il ripristino di completed_at è fallito: ${erroreRipristino.message}. Sistemare a mano.`
        );
      }
      return fallito("account", error.message);
    }
    ok("account", userId);
  }

  // ── 8. Registro e comunicazione finale ──
  // Da qui in avanti l'account non esiste più: un errore NON è un fallimento
  // della cancellazione, che è avvenuta. Si segnala e basta.
  //
  // Si NOTIFICA: l'interessato ha chiesto la cancellazione e ha diritto di
  // sapere che è stata eseguita (art. 12.3 GDPR). L'email è quella che già
  // possediamo e viene usata una sola volta, per questo messaggio.
  // `affectedUserId` resta null: la chiave esterna verso auth.users
  // rifiuterebbe un id che non esiste più.
  let riferimento: string | null = null;
  try {
    const esito = await registraDecisione({
      actorId: input.attoreId,
      targetType: "account",
      targetId: userId,
      action: "cancellazione_completata",
      reason: `Cancellazione dell'account richiesta dall'interessato e confermata via email il ${formatoData(piano.confermataIl)}.`,
      affectedUserId: null,
      affectedEmail: piano.email,
      affectedName: piano.nome,
      notify: {
        decision: "Abbiamo completato la cancellazione del tuo account N'arte.",
        target: "Account N'arte",
        consequences:
          "Profili, file e richieste collegati sono stati rimossi. Restano solo i dati che siamo tenuti a conservare per legge o per dimostrare la correttezza dei nostri trattamenti.",
        contestable: false,
      },
    });
    if (esito.ok) {
      riferimento = esito.reference;
      if (!esito.notified) {
        avvisi.push("Cancellazione eseguita, ma la comunicazione finale all'interessato non è partita.");
      }
      ok("registro", esito.reference);
    } else {
      avvisi.push(`Cancellazione eseguita, ma la decisione non è stata registrata: ${esito.error}`);
      logger.error(AREA, `registro non scritto per utente ${userId}: ${esito.error}`);
    }
  } catch (e) {
    avvisi.push(`Cancellazione eseguita, ma il registro non è stato scritto: ${messaggio(e)}`);
    logger.error(AREA, `registro non scritto per utente ${userId}: ${messaggio(e)}`);
  }

  logger.warn(AREA, `COMPLETATA — richiesta=${input.richiestaId} utente=${userId}`);
  return { ok: true, passiEseguiti, avvisi, riferimento };
}
