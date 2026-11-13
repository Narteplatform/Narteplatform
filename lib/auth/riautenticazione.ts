import "server-only";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";
import { livelloSessione } from "@/lib/auth/aal";

/**
 * Strumenti per chiedere «sei proprio tu?» prima delle operazioni che possono
 * togliere l'account al proprietario: cambio password, cambio email.
 */

/** Metodi di accesso dell'account, letti dalle identità di Supabase Auth. */
export function metodiDiAccesso(user: Pick<User, "identities" | "app_metadata">) {
  const provider = new Set<string>();
  for (const i of user.identities ?? []) if (i?.provider) provider.add(i.provider);
  const elenco = (user.app_metadata as { providers?: unknown } | undefined)?.providers;
  if (Array.isArray(elenco)) for (const p of elenco) if (typeof p === "string") provider.add(p);
  return {
    /** Ha un'identità email: può avere (o ha) una password. */
    password: provider.has("email"),
    google: provider.has("google"),
  };
}

/**
 * Verifica la password attuale SENZA toccare la sessione dell'utente.
 *
 * Prima si chiamava `signInWithPassword` sul client della richiesta: funziona,
 * ma sostituisce i cookie di sessione con una sessione nuova di livello aal1 —
 * chi aveva appena verificato il secondo fattore si ritrovava a doverlo rifare.
 * Qui l'accesso di prova avviene su un client usa e getta (niente cookie,
 * niente persistenza) e la sessione di prova viene subito chiusa.
 */
export async function verificaPasswordAttuale(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  const prova = createSupabaseClient<Database>(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await prova.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  try {
    // Solo la sessione di prova: `local` non chiude le altre sessioni.
    await prova.auth.signOut({ scope: "local" });
  } catch (e) {
    logger.warn("auth/riautenticazione", "sessione di prova non chiusa:", e instanceof Error ? e.message : String(e));
  }
  return true;
}

/**
 * `true` se nella sessione corrente il metodo indicato (es. `oauth`) è stato
 * usato negli ultimi `minuti`. Legge gli AMR del token di accesso (vedi
 * lib/auth/aal.ts): è la prova che la persona ha appena rifatto l'accesso con
 * Google. In caso di errore: `false` (si chiede di riaccedere, non si concede).
 */
export async function metodoUsatoDiRecente(
  supabase: Parameters<typeof livelloSessione>[0],
  utente: Parameters<typeof livelloSessione>[1],
  metodo: string,
  minuti: number
): Promise<boolean> {
  const livello = await livelloSessione(supabase, utente);
  if (!livello) return false;
  const soglia = Date.now() / 1000 - minuti * 60;
  return livello.metodi.some((m) => m.method === metodo && m.timestamp >= soglia);
}

/**
 * `true` se l'account ha un secondo fattore attivo e la sessione non l'ha
 * ancora verificato (aal1). In caso di errore di lettura: `false`, come nel
 * middleware — in dubbio non si blocca, davanti restano le altre verifiche.
 */
export async function mancaSecondoFattore(
  supabase: Parameters<typeof livelloSessione>[0],
  utente: Parameters<typeof livelloSessione>[1]
): Promise<boolean> {
  const livello = await livelloSessione(supabase, utente);
  return !!livello && livello.prossimo === "aal2" && livello.attuale !== "aal2";
}
