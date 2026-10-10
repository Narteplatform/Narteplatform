/**
 * «Visto» delle voci della sidebar admin.
 *
 * I badge contavano tutto ciò che è in attesa, quindi restavano accesi anche
 * dopo aver aperto la sezione. Ora ogni voce ricorda quando l'admin l'ha
 * aperta l'ultima volta e il badge conta solo ciò che è arrivato DOPO: si apre
 * la sezione, il badge sparisce; arriva qualcosa di nuovo, ricompare.
 *
 * Il ricordo sta in un cookie del browser, non sul DB: nessuna migration e
 * nessuna scrittura su produzione per una preferenza di visualizzazione. Vale
 * per dispositivo: aprire Artisti dal telefono non spegne il badge sul Mac.
 *
 * Modulo condiviso: lo legge la shell (server) e lo scrive la sidebar (client).
 * Nessun import server-only qui.
 */

export const VISTI_COOKIE = "narte_admin_visti";

/** Un anno: oltre, un badge che riparte da «tutto in attesa» è accettabile. */
export const VISTI_MAX_AGE = 60 * 60 * 24 * 365;

export type Visti = Record<string, string>;

/** Legge il valore del cookie. Qualunque cosa malformata = nessun visto. */
export function parseVisti(raw: string | undefined | null): Visti {
  if (!raw) return {};
  try {
    const obj: unknown = JSON.parse(decodeURIComponent(raw));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: Visti = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === "string" && !Number.isNaN(Date.parse(v))) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeVisti(visti: Visti): string {
  return encodeURIComponent(JSON.stringify(visti));
}
