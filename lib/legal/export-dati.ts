import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Esportazione dei dati di un interessato — articoli 15 e 20 GDPR.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CHE COS'È E CHE COSA NON È.
 * È la copia dei dati che riguardano una persona, in un formato che può leggere
 * e portare altrove. Non è un dump del database: le righe di altri utenti non
 * ci entrano, nemmeno quando sono collegate alle sue. Una conversazione ha due
 * lati, e il diritto all'accesso di uno non è il diritto di scaricare i
 * messaggi dell'altro — per questo dei messaggi si esporta il testo di chi
 * esporta, e degli altri solo il fatto che ci sia stato uno scambio.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ⛔ SOLA LETTURA. Nessuna delle query qui dentro scrive, e ogni errore viene
 *    gestito: una lettura fallita diventa una nota nel risultato, non un campo
 *    vuoto che sembra «non ha dati».
 */

type Esito<T> = { dati: T } | { errore: string };

async function leggi<T>(
  etichetta: string,
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<Esito<T | null>> {
  const { data, error } = await query;
  if (error) {
    // Distinguere «non ha nulla» da «non siamo riusciti a leggere» è il punto:
    // consegnare un export silenziosamente incompleto è peggio che dire che una
    // parte manca.
    logger.error("legal/export", `${etichetta}: ${error.message}`);
    return { errore: `Non è stato possibile leggere questa sezione (${etichetta}).` };
  }
  return { dati: data };
}

/**
 * Tabella o colonna che non esiste ancora (migration non applicata): per
 * PostgREST `42P01`/`PGRST205` (tabella), `42703`/`PGRST204` (colonna).
 */
function schemaAssente(error: { code?: string; message?: string } | null): boolean {
  const code = error?.code ?? "";
  return code === "42P01" || code === "PGRST205" || code === "42703" || code === "PGRST204";
}

/**
 * Come `leggi`, per le sezioni di funzioni introdotte da migration che
 * potrebbero non essere ancora applicate: tabella o colonna assente diventa
 * una nota esplicita («non disponibile»), non un errore e non un elenco vuoto.
 */
async function leggiOpzionale<T>(
  etichetta: string,
  query: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>
): Promise<Esito<T | null> | { nonDisponibile: string }> {
  const { data, error } = await query;
  if (error && schemaAssente(error)) {
    return { nonDisponibile: `Funzione non ancora attiva su questa installazione (${etichetta}).` };
  }
  if (error) {
    logger.error("legal/export", `${etichetta}: ${error.message}`);
    return { errore: `Non è stato possibile leggere questa sezione (${etichetta}).` };
  }
  return { dati: data };
}

/** Per `ilike` con un valore letterale: `%` e `_` sono jolly, `\` è l'escape. */
function letterale(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Visite ai profili dell'utente, AGGREGATE per profilo, giorno e tipo di
 * visitatore. Le righe grezze contengono l'impronta pseudonima di altre
 * persone (`visitor_hash`): non sono dati di chi esporta e non ci entrano.
 * Si legge a pagine (PostgREST restituisce al massimo 1000 righe per volta).
 */
async function visiteAggregate(
  admin: ReturnType<typeof createAdminClient>,
  artistIds: string[]
): Promise<Esito<unknown> | { nonDisponibile: string }> {
  const PAGINA = 1000;
  const MAX_PAGINE = 200;
  const conteggi = new Map<string, { profilo: string; giorno: string; tipo: string; visitatoriUnici: number }>();
  for (let pagina = 0; pagina < MAX_PAGINE; pagina++) {
    const { data, error } = await admin
      .from("artist_profile_views")
      .select("artist_id, viewed_on, viewer_kind")
      .in("artist_id", artistIds)
      .order("viewed_on", { ascending: true })
      .order("artist_id", { ascending: true })
      .order("visitor_hash", { ascending: true })
      .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1);
    if (error) {
      if (schemaAssente(error)) return { nonDisponibile: "Statistiche di visita non attive su questa installazione." };
      logger.error("legal/export", `statistiche di visita: ${error.message}`);
      return { errore: "Non è stato possibile leggere questa sezione (statistiche di visita)." };
    }
    const righe = data ?? [];
    for (const r of righe) {
      const chiave = `${r.artist_id}|${r.viewed_on}|${r.viewer_kind}`;
      const voce = conteggi.get(chiave) ?? {
        profilo: r.artist_id,
        giorno: r.viewed_on,
        tipo: String(r.viewer_kind),
        visitatoriUnici: 0,
      };
      voce.visitatoriUnici += 1;
      conteggi.set(chiave, voce);
    }
    if (righe.length < PAGINA) return { dati: Array.from(conteggi.values()) };
  }
  return {
    errore: "Statistiche di visita troppo numerose per l'export automatico: scrivici dalla pagina contatti per averle complete.",
  };
}

export async function esportaDatiUtente(userId: string) {
  const admin = createAdminClient();

  // PRIMA l'organizzatore, e non insieme al resto: le recensioni non sono legate
  // all'utente ma al suo record di organizzatore — `feedback.organizer_id`
  // riferisce `organizers(id)`, non `auth.users(id)`. Filtrare per id utente
  // avrebbe restituito zero recensioni SENZA alcun errore, che è il modo
  // peggiore di sbagliare un export: sembra completo e non lo è.
  // Letta direttamente e non tramite `leggi`, perché qui il valore serve anche
  // come chiave per la query successiva: l'inferenza del generico lo avrebbe
  // ridotto a un tipo inutilizzabile.
  const rispostaOrg = await admin
    .from("organizers")
    .select("id, display_name, bio, phone, website, instagram, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (rispostaOrg.error) {
    logger.error("legal/export", `profilo organizzatore: ${rispostaOrg.error.message}`);
  }
  const organizzatore: Esito<unknown> = rispostaOrg.error
    ? { errore: "Non è stato possibile leggere questa sezione (profilo organizzatore)." }
    : { dati: rispostaOrg.data };
  // Se la lettura è fallita NON si prosegue come se l'organizzatore non
  // esistesse: senza id, le recensioni risulterebbero assenti invece che
  // illeggibili, e l'export sembrerebbe completo.
  const organizerId = rispostaOrg.error ? null : (rispostaOrg.data?.id ?? null);
  const recensioniIllegibili = Boolean(rispostaOrg.error);

  // Gli id dei profili artista servono come chiave per richieste e recensioni
  // ricevute. Stessa regola dell'organizzatore: se la lettura fallisce, le
  // sezioni che ne dipendono lo dicono invece di risultare vuote.
  const rispostaArt = await admin.from("artists").select("id").eq("user_id", userId);
  if (rispostaArt.error) {
    logger.error("legal/export", `id profili artista: ${rispostaArt.error.message}`);
  }
  const artistIds = rispostaArt.error ? null : (rispostaArt.data ?? []).map((a) => a.id);
  const dipendeDaArtisti = (etichetta: string): Esito<unknown> => ({
    errore: `Non è stato possibile leggere questa sezione (${etichetta}): dipende dai profili artista, che non si sono potuti leggere.`,
  });

  const { data: utenteAuth, error: erroreAuth } = await admin.auth.admin.getUserById(userId);
  if (erroreAuth) logger.error("legal/export", `account: ${erroreAuth.message}`);
  const account: Esito<unknown> = erroreAuth
    ? { errore: "Non è stato possibile leggere questa sezione (account)." }
    : {
        dati: {
          email: utenteAuth.user?.email ?? null,
          creato: utenteAuth.user?.created_at ?? null,
          ultimoAccesso: utenteAuth.user?.last_sign_in_at ?? null,
        },
      };

  // Indirizzo dell'account: chiave delle righe legate all'email e non
  // all'id (candidature, richieste di contatto, messaggi del modulo contatti).
  // Se l'account non si è potuto leggere, quelle sezioni lo dicono.
  const emailUtente = erroreAuth ? null : (utenteAuth.user?.email?.trim().toLowerCase() ?? null);
  const dipendeDaAccount = (etichetta: string): Esito<unknown> => ({
    errore: `Non è stato possibile leggere questa sezione (${etichetta}): dipende dall'account, che non si è potuto leggere.`,
  });

  const [
    profilo,
    consensi,
    artisti,
    preferiti,
    recensioniScritte,
    abbonamento,
    messaggiScritti,
    richiesteComeOrganizzatore,
    richiesteComeArtista,
    recensioniRicevute,
    strutture,
    consulenze,
    richiesteCancellazione,
  ] = await Promise.all([
    leggi(
      "profilo",
      admin
        .from("profiles")
        .select("id, role, full_name, avatar_url, created_at, legal_version_accepted")
        .eq("id", userId)
        .maybeSingle()
    ),
    leggi(
      "consensi",
      admin
        .from("user_consents")
        .select("kind, version, accepted, accepted_at")
        .eq("user_id", userId)
        .order("accepted_at", { ascending: false })
    ),
    leggi(
      "profili artista",
      admin
        .from("artists")
        .select(
          "id, stage_name, slug, city, bio, genre, instruments, price_range, " +
            "gallery, videos, audio_files, social_links, personnel, created_at"
        )
        .eq("user_id", userId)
    ),
    leggi(
      "preferiti",
      admin.from("artist_favorites").select("artist_id, created_at").eq("user_id", userId)
    ),
    organizerId
      ? leggi(
          "recensioni scritte",
          admin
            .from("feedback")
            .select("rating, body, created_at")
            .eq("organizer_id", organizerId)
        )
      : Promise.resolve<Esito<unknown>>(
          recensioniIllegibili
            ? {
                errore:
                  "Non è stato possibile leggere questa sezione (recensioni scritte): " +
                  "dipende dal profilo organizzatore, che non si è potuto leggere.",
              }
            : { dati: [] }
        ),
    // Tutte le righe e non una sola: dopo una disdetta e una nuova
    // sottoscrizione l'utente ne ha più d'una, e `maybeSingle` in quel caso
    // falliva con un errore.
    leggi(
      "abbonamenti",
      admin
        .from("subscriptions")
        .select("tier, billing_interval, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at")
        .eq("user_id", userId)
        .order("current_period_start", { ascending: false })
    ),
    // Dei messaggi solo quelli scritti da chi esporta (vedi intestazione).
    leggi(
      "messaggi scritti",
      admin
        .from("messages")
        .select(
          "conversation_id, kind, body, offer_event_date, offer_time_slot, offer_budget_cents, " +
            "offer_description, attachment_name, attachment_type, created_at"
        )
        .eq("sender_id", userId)
        .order("created_at", { ascending: true })
    ),
    organizerId
      ? leggi(
          "richieste di booking inviate",
          admin
            .from("booking_requests")
            .select("id, artist_id, event_date, time_slot, budget_offer, message, status, final_price, created_at")
            .eq("organizer_id", organizerId)
        )
      : Promise.resolve<Esito<unknown>>(
          recensioniIllegibili
            ? { errore: "Non è stato possibile leggere questa sezione (richieste inviate): dipende dal profilo organizzatore." }
            : { dati: [] }
        ),
    artistIds === null
      ? Promise.resolve(dipendeDaArtisti("richieste ricevute"))
      : artistIds.length === 0
        ? Promise.resolve<Esito<unknown>>({ dati: [] })
        : leggi(
            "richieste di booking ricevute",
            admin
              .from("booking_requests")
              .select("id, artist_id, event_date, time_slot, budget_offer, message, status, final_price, created_at")
              .in("artist_id", artistIds)
          ),
    artistIds === null
      ? Promise.resolve(dipendeDaArtisti("recensioni ricevute"))
      : artistIds.length === 0
        ? Promise.resolve<Esito<unknown>>({ dati: [] })
        : leggi(
            "recensioni ricevute",
            admin
              .from("feedback")
              .select("artist_id, rating, body, created_at, hidden")
              .in("artist_id", artistIds)
          ),
    organizerId
      ? leggi(
          "strutture",
          admin
            .from("venues")
            .select("name, venue_type, address, city, region, postal_code, capacity, description, cover_image, gallery, website, instagram, phone, email, created_at")
            .eq("organizer_id", organizerId)
        )
      : Promise.resolve<Esito<unknown>>({ dati: [] }),
    leggi(
      "consulenze",
      admin
        .from("consultations")
        .select("name, email, phone, needs, status, created_at")
        .eq("user_id", userId)
    ),
    leggi(
      "richieste di cancellazione",
      admin
        .from("account_deletion_requests")
        .select("requested_at, expires_at, confirmed_at, cancelled_at, completed_at")
        .eq("user_id", userId)
    ),
  ]);

  // ── Sezioni aggiunte (export completo) ────────────────────────────────────
  // Ognuna tollera tabella o colonna assente (leggiOpzionale). Delle righe
  // legate ad altre persone si esporta solo ciò che riguarda chi esporta.
  const [
    videoArtista,
    notifiche,
    calendarioPersonale,
    calendariProfili,
    segnalazioniInviate,
    blocchiConversazione,
    clienteFatturazione,
    recessi,
    invitiFatti,
    codiceInvito,
    premiInvito,
    fileCaricati,
    visiteProfili,
    candidature,
    richiesteDiContatto,
    messaggiContatti,
  ] = await Promise.all([
    artistIds === null
      ? Promise.resolve(dipendeDaArtisti("video"))
      : artistIds.length === 0
        ? Promise.resolve<Esito<unknown>>({ dati: [] })
        : leggiOpzionale(
            "video",
            admin
              .from("artist_videos")
              .select("artist_id, url, title, duration_ms, size_bytes, mime_type, created_at")
              .in("artist_id", artistIds)
          ),
    leggiOpzionale(
      "notifiche",
      admin
        .from("notifications")
        .select("kind, title, body, href, created_at, read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ),
    // Del collegamento al calendario si esporta che esiste e da quando, non
    // il token: è la «password» del link, non un dato da far circolare in un file.
    leggiOpzionale("calendario personale", admin.from("calendar_feeds").select("created_at").eq("user_id", userId)),
    leggiOpzionale(
      "calendari dei profili",
      admin.from("artist_calendar_feeds").select("artist_id, created_at").eq("user_id", userId)
    ),
    leggiOpzionale(
      "segnalazioni inviate",
      admin
        .from("content_reports")
        .select(
          "reference, kind, created_at, reporter_name, reporter_email, target_type, target_url, category, " +
            "description, contested_reference, status, decision_note, decided_at"
        )
        .eq("reporter_user_id", userId)
    ),
    leggiOpzionale(
      "blocchi nelle conversazioni",
      admin
        .from("conversation_blocks")
        .select("conversation_id, blocked_role, reason, created_at, lifted_at, lift_note")
        .eq("blocked_user_id", userId)
    ),
    leggiOpzionale(
      "cliente di fatturazione",
      admin.from("billing_customers").select("stripe_customer_id, created_at").eq("user_id", userId)
    ),
    leggiOpzionale(
      "recessi dagli abbonamenti",
      admin
        .from("subscription_withdrawals")
        .select("created_at, user_email, stripe_subscription_id, canale, ricevuto_il, rimborso_cent, stato_rimborso")
        .eq("user_id", userId)
    ),
    // Inviti: dell'invitato solo il nome d'arte e lo stato, come li vede già
    // chi invita nella sua pagina.
    leggiOpzionale(
      "inviti fatti",
      admin
        .from("artist_invites")
        .select("invitee_stage_name, status, paid_at, confirmed_at, cancel_reason, created_at")
        .eq("inviter_user_id", userId)
    ),
    leggiOpzionale(
      "codice d'invito",
      admin.from("invite_codes").select("code, created_at, disabled_at").eq("user_id", userId)
    ),
    leggiOpzionale(
      "premi degli inviti",
      admin
        .from("invite_rewards")
        .select("kind, pro_from, pro_until, amount_cents, converted_at, converted_cents, created_at")
        .eq("user_id", userId)
    ),
    leggiOpzionale(
      "file caricati",
      admin
        .from("media_assets")
        .select("kind, public_url, artist_id, bytes, mime_type, created_at")
        .eq("owner_user_id", userId)
    ),
    artistIds === null
      ? Promise.resolve(dipendeDaArtisti("statistiche di visita"))
      : artistIds.length === 0
        ? Promise.resolve<Esito<unknown>>({ dati: [] })
        : visiteAggregate(admin, artistIds),
    emailUtente === null
      ? Promise.resolve(dipendeDaAccount("candidature"))
      : leggiOpzionale(
          "candidature",
          admin
            .from("artist_applications")
            .select("name, email, stage_name, genre, bio, links, status, created_at")
            .ilike("email", letterale(emailUtente))
        ),
    // Richieste di contatto inviate da chi esporta (come richiedente), non
    // quelle ricevute dai suoi profili: quelle sono dati di altri.
    emailUtente === null
      ? Promise.resolve(dipendeDaAccount("richieste di contatto"))
      : leggiOpzionale(
          "richieste di contatto inviate",
          admin
            .from("leads")
            .select("artist_id, event_date, event_location, budget, message, contact_email, contact_phone, status, created_at")
            // Un indirizzo con caratteri riservati della sintassi `or` di
            // PostgREST (virgole, parentesi, virgolette) romperebbe il filtro:
            // in quel caso si cerca solo per account.
            .or(
              /[,()"]/.test(emailUtente)
                ? `requester_user_id.eq.${userId}`
                : `requester_user_id.eq.${userId},contact_email.ilike.${letterale(emailUtente)}`
            )
        ),
    emailUtente === null
      ? Promise.resolve(dipendeDaAccount("messaggi dal modulo contatti"))
      : leggiOpzionale(
          "messaggi dal modulo contatti",
          admin
            .from("contact_messages")
            .select("name, email, subject, message, created_at")
            .ilike("email", letterale(emailUtente))
        ),
  ]);

  return {
    _informazioni: {
      generato: new Date().toISOString(),
      riguarda: userId,
      cosaContiene:
        "I dati che N'arte conserva su di te. Dei contenuti che hai caricato " +
        "(foto, tracce audio, video) è incluso l'elenco degli indirizzi: i file " +
        "veri si scaricano da quegli indirizzi.",
      cosaNonContiene:
        "I messaggi scritti da altre persone nelle conversazioni, e i dati di " +
        "altri utenti collegati ai tuoi. Una conversazione ha due lati: il tuo " +
        "diritto di accesso non si estende a ciò che ha scritto l'altro.",
      dovePuoiChiedereAltro: "/contatti",
    },
    account,
    profilo,
    consensi,
    profiliArtista: artisti,
    profiloOrganizzatore: organizzatore,
    strutture,
    preferiti,
    richiesteDiBookingInviate: richiesteComeOrganizzatore,
    richiesteDiBookingRicevute: richiesteComeArtista,
    messaggiScritti,
    recensioniScritte,
    recensioniRicevute,
    consulenze,
    abbonamenti: abbonamento,
    richiesteDiCancellazione: richiesteCancellazione,
    videoCaricati: videoArtista,
    fileCaricati,
    notifiche,
    collegamentoCalendario: { personale: calendarioPersonale, profili: calendariProfili },
    segnalazioniInviate,
    blocchiNelleConversazioni: blocchiConversazione,
    clienteFatturazione,
    recessiDagliAbbonamenti: recessi,
    invitaUnArtista: { codice: codiceInvito, invitiFatti, premi: premiInvito },
    statisticheDiVisita: visiteProfili,
    candidatureArtista: candidature,
    richiesteDiContattoInviate: richiesteDiContatto,
    messaggiModuloContatti: messaggiContatti,
  };
}
