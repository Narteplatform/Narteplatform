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

  const [
    profilo,
    consensi,
    artisti,
    preferiti,
    recensioniScritte,
    abbonamento,
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
    leggi(
      "abbonamento",
      admin
        .from("subscriptions")
        .select("tier, status, current_period_end, cancel_at_period_end")
        .eq("user_id", userId)
        .maybeSingle()
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
    profilo,
    consensi,
    profiliArtista: artisti,
    profiloOrganizzatore: organizzatore,
    preferiti,
    recensioniScritte,
    abbonamento,
  };
}
