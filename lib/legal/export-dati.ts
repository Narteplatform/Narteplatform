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
  };
}
