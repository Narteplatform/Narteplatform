/**
 * Livello di autenticazione della sessione (aal1/aal2) e metodi usati (AMR).
 *
 * PERCHÉ NON `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. Sul server
 * quella funzione legge `session.user` dai cookie: un dato non verificato
 * (Supabase lo segnala con un avviso nei log a ogni chiamata) e potenzialmente
 * vecchio. Qui:
 *  - i fattori attivi arrivano dall'utente restituito da `getUser()`, che il
 *    chiamante ha già (verificato dal server di Supabase);
 *  - `aal` e `amr` si leggono dal token di accesso, lo stesso che `getUser()`
 *    ha appena fatto validare.
 *
 * Senza dipendenze: lo importa anche il middleware (edge).
 */

type ClientConSessione = {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token: string } | null } }>;
  };
};

type UtenteConFattori = {
  factors?: ReadonlyArray<{ status?: string | null }> | null;
} | null;

export type LivelloSessione = {
  attuale: "aal1" | "aal2" | null;
  /** `aal2` se l'account ha almeno un fattore verificato. */
  prossimo: "aal1" | "aal2" | null;
  metodi: { method: string; timestamp: number }[];
};

function decodificaPayload(jwt: string): Record<string, unknown> | null {
  const parte = jwt.split(".")[1];
  if (!parte) return null;
  const b64 = parte.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parte.length / 4) * 4, "=");
  const binario = atob(b64);
  const byte = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  const valore: unknown = JSON.parse(new TextDecoder().decode(byte));
  return valore && typeof valore === "object" ? (valore as Record<string, unknown>) : null;
}

/** `null` se non si riesce a stabilirlo: il chiamante decide che cosa fare in dubbio. */
export async function livelloSessione(
  supabase: ClientConSessione,
  utente: UtenteConFattori
): Promise<LivelloSessione | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const payload = decodificaPayload(token);
    if (!payload) return null;
    const aal = payload.aal === "aal1" || payload.aal === "aal2" ? payload.aal : null;
    const verificati = (utente?.factors ?? []).filter((f) => f.status === "verified").length;
    const metodi = Array.isArray(payload.amr)
      ? payload.amr.flatMap((m: unknown) => {
          if (!m || typeof m !== "object") return [];
          const o = m as { method?: unknown; timestamp?: unknown };
          return typeof o.method === "string" && typeof o.timestamp === "number"
            ? [{ method: o.method, timestamp: o.timestamp }]
            : [];
        })
      : [];
    return { attuale: aal, prossimo: verificati > 0 ? "aal2" : aal, metodi };
  } catch {
    return null;
  }
}
