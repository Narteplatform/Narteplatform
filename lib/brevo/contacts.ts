import "server-only";

import { logger } from "@/lib/logger";

/**
 * Newsletter sincronizzata con la lista Brevo.
 *
 * Il registro di verità del consenso resta `user_consents`; la lista Brevo è la
 * copia operativa da cui partono le campagne. Queste funzioni la tengono
 * allineata e rispettano tre regole:
 *
 *   1. MAI BLOCCANTI. Non sollevano e non restituiscono errori da gestire: una
 *      Brevo lenta o giù non deve far fallire una registrazione, una revoca o
 *      una cancellazione. Il ritorno è solo `true/false` per chi vuole loggare.
 *   2. NO-OP SENZA CONFIGURAZIONE. Se manca `BREVO_API_KEY` o
 *      `BREVO_NEWSLETTER_LIST_ID` non si fa nulla e si avvisa UNA volta sola
 *      per istanza (`logger.warn`), non a ogni chiamata.
 *   3. NESSUN DATO PERSONALE NEI LOG: né l'email né il nome, solo l'esito.
 *
 * Timeout 4 s, come la Consent Database di iubenda.
 */

const BASE_URL = "https://api.brevo.com/v3";
const TIMEOUT_MS = 4000;

let avvisoConfigurazioneDato = false;

function configurazione(): { apiKey: string; listId: number } | null {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number.parseInt(process.env.BREVO_NEWSLETTER_LIST_ID ?? "", 10);
  if (apiKey && Number.isInteger(listId) && listId > 0) return { apiKey, listId };

  if (!avvisoConfigurazioneDato) {
    avvisoConfigurazioneDato = true;
    logger.warn(
      "brevo/contacts",
      "BREVO_API_KEY o BREVO_NEWSLETTER_LIST_ID mancanti: la newsletter non viene sincronizzata"
    );
  }
  return null;
}

async function chiama(
  apiKey: string,
  path: string,
  body: unknown,
  azione: string
): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!r.ok) {
      logger.warn("brevo/contacts", `${azione} non riuscita (HTTP ${r.status})`);
      return false;
    }
    return true;
  } catch (e) {
    logger.warn(
      "brevo/contacts",
      `${azione} non inviata: ${e instanceof Error ? e.name : "errore"}`
    );
    return false;
  }
}

/** Iscrive (o riattiva) un contatto alla lista newsletter. */
export async function iscriviNewsletter(email: string, nome?: string): Promise<boolean> {
  const cfg = configurazione();
  if (!cfg || !email) return false;
  const nomePulito = nome?.trim();
  return chiama(
    cfg.apiKey,
    "/contacts",
    {
      email,
      ...(nomePulito ? { attributes: { FIRSTNAME: nomePulito } } : {}),
      listIds: [cfg.listId],
      updateEnabled: true,
    },
    "iscrizione"
  );
}

/**
 * Toglie un contatto dalla lista newsletter. Non lo elimina da Brevo: resta
 * nelle liste transazionali e nello storico, ma non riceve più le campagne.
 */
export async function disiscriviNewsletter(email: string): Promise<boolean> {
  const cfg = configurazione();
  if (!cfg || !email) return false;
  return chiama(
    cfg.apiKey,
    `/contacts/lists/${cfg.listId}/contacts/remove`,
    { emails: [email] },
    "disiscrizione"
  );
}
