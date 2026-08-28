import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Limitatore di frequenza per i punti d'ingresso pubblici.
 *
 * Il conteggio vive su Postgres (vedi 0048_rate_limits.sql) e non in memoria:
 * su Vercel ogni richiesta può atterrare su un'istanza diversa, quindi un
 * contatore in RAM conterebbe una frazione casuale del traffico reale.
 *
 * PRIVACY — la regola che governa questo file: l'identificatore non lascia mai
 * questo modulo in chiaro. IP e indirizzi email entrano, esce un hash con sale.
 * Senza il sale il limitatore diventerebbe un registro di chi ha visitato il
 * sito, ricostruibile da chiunque conosca un indirizzo. È lo stesso principio
 * già adottato per le statistiche di visita del profilo.
 *
 * CHE COSA FA QUANDO SI ROMPE: lascia passare. Un limitatore che va in errore
 * e blocca tutto trasforma un problema di database in un sito fermo. Il freno
 * è una protezione, non un guardiano: davanti ai dati veri ci sono l'autenticazione
 * e le policy RLS.
 */

/** Sale per l'hash. Riusa quello delle statistiche, che ha già lo stesso scopo. */
function salt(): string {
  return (
    process.env.RATE_LIMIT_SALT ||
    process.env.VISIT_HASH_SALT ||
    // Ultimo ripiego: senza sale l'hash resta comunque non reversibile a colpo
    // d'occhio, ma è ricostruibile da chi conosce un IP. Meglio di niente,
    // molto peggio di un sale vero: va impostata VISIT_HASH_SALT su Vercel.
    "narte-fallback-salt"
  );
}

function digest(value: string): string {
  return createHash("sha256").update(`${salt()}|${value}`).digest("hex").slice(0, 32);
}

/**
 * IP del chiamante, pseudonimizzato.
 *
 * `x-forwarded-for` può contenere una catena di proxy: il primo elemento è il
 * client reale. Su Vercel è affidabile perché la piattaforma lo riscrive.
 */
export async function clientFingerprint(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for") ?? "";
    const ip = forwarded.split(",")[0]?.trim() || h.get("x-real-ip") || "sconosciuto";
    return digest(`ip:${ip}`);
  } catch {
    return digest("ip:sconosciuto");
  }
}

/** Identificatore stabile per un indirizzo email, senza conservarlo. */
export function emailFingerprint(email: string): string {
  return digest(`email:${email.trim().toLowerCase()}`);
}

export type RateLimitRule = {
  /** Nome dell'area: compare nella chiave e permette soglie diverse per form. */
  scope: string;
  /** Durata della finestra, in secondi. */
  windowSeconds: number;
  /** Quante richieste sono consentite dentro la finestra. */
  max: number;
};

/**
 * Registra un tentativo e dice se può proseguire.
 *
 * @returns `true` se consentito, `false` se ha superato il tetto.
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  fingerprint: string
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: `${rule.scope}:${fingerprint}`,
      p_window_seconds: rule.windowSeconds,
      p_max: rule.max,
    });

    if (error) {
      // Il caso tipico è "la migration 0048 non è ancora stata applicata".
      // Va detto forte nei log, ma non deve fermare il sito.
      logger.warn("rate-limit", `controllo non riuscito su "${rule.scope}"`, error.message);
      return true;
    }

    return data !== false;
  } catch (e) {
    logger.warn("rate-limit", "eccezione durante il controllo", e);
    return true;
  }
}

/**
 * Scorciatoia per il caso più comune: limitare per IP.
 * Restituisce `true` se la richiesta può proseguire.
 */
export async function allowByIp(rule: RateLimitRule): Promise<boolean> {
  return checkRateLimit(rule, await clientFingerprint());
}

/**
 * Soglie predefinite.
 *
 * Sono volutamente generose: devono fermare gli script, non le persone. Chi
 * compila un modulo di contatto due volte perché ha sbagliato un campo non deve
 * trovarsi bloccato.
 */
export const LIMITI = {
  /** Moduli pubblici: contatti, interesse format, richiesta evento. */
  form: { scope: "form", windowSeconds: 3600, max: 8 },
  /** Candidatura artista: più rara e più impegnativa, soglia più stretta. */
  candidatura: { scope: "candidatura", windowSeconds: 86400, max: 5 },
  /** Richieste di booking, che possono anche creare un account. */
  booking: { scope: "booking", windowSeconds: 3600, max: 10 },
  /** Caricamento video di candidatura: pubblico, quindi il più esposto. */
  uploadPubblico: { scope: "upload-pubblico", windowSeconds: 3600, max: 3 },
  /** Caricamenti da utente autenticato. */
  uploadAutenticato: { scope: "upload", windowSeconds: 3600, max: 60 },
} as const satisfies Record<string, RateLimitRule>;
