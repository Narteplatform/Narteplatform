import type { ReactElement } from "react";

import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/emails/send";
import { sendTransactional } from "@/lib/brevo/send";
import { ALL_EMAIL_KEYS, isEmailKey, type EmailKey, type EmailParamsMap } from "@/lib/brevo/registry";
import type { Json } from "@/lib/supabase/types";

/**
 * Unico punto di uscita delle email transazionali.
 *
 * Sostituisce `sendEmail` nei call site senza cambiarne il comportamento: il
 * componente React e l'oggetto restano al loro posto come `fallback`, e
 * continuano a essere usati finché la chiave non viene esplicitamente
 * instradata su Brevo.
 *
 * Regola, in ordine:
 *  1. chiave non elencata in BREVO_ENABLED_KEYS  → Resend, identico a prima
 *  2. chiave elencata                            → Brevo
 *  3. Brevo salta (template non pubblicato, API key assente) o fallisce
 *                                                → Resend, e resta la traccia
 *
 * Il punto 3 è la ragione d'essere di questo file: rende impossibile perdere
 * un'email durante il passaggio. Il rollback non richiede un revert del
 * codice, basta togliere la chiave dalla variabile d'ambiente.
 */

export type DispatchResult =
  | { ok: true; provider: "brevo" | "resend"; fallback: boolean }
  | { ok: false; provider: "brevo" | "resend"; skipped: boolean };

export interface DispatchOpts<K extends EmailKey> {
  key: K;
  to: string | string[];
  params: EmailParamsMap[K];
  replyTo?: string;
  meta?: Json;
  /**
   * Percorso Resend, usato quando Brevo non è attivo per questa chiave.
   *
   * Assente per le email che nascono direttamente su Brevo e non hanno mai
   * avuto un componente React: lì non c'è nulla su cui ricadere. In quel caso
   * l'email non parte — esattamente come oggi, dove non esiste affatto — ma
   * la riga finisce comunque in `email_log` con stato `skipped`, così la
   * mancata consegna resta visibile invece di sparire.
   */
  fallback?: {
    subject: string;
    react: ReactElement;
    /** Nome storico del template, per non spezzare le statistiche esistenti. */
    template: string;
  };
  /**
   * Oggetto per il log quando non c'è `fallback`: senza, in `/admin/email`
   * comparirebbe la chiave al posto di un oggetto leggibile.
   */
  subjectPreview?: string;
}

/**
 * Chiavi instradate su Brevo. Vuota (o assente) significa "tutto come
 * prima": è il valore di partenza voluto, così il codice può essere
 * migrato interamente prima di cambiare anche un solo comportamento.
 *
 * Letta a ogni chiamata e non memorizzata: in ambiente serverless le
 * istanze sono di lunga durata e una cache a livello di modulo terrebbe in
 * vita il valore vecchio anche dopo un cambio di configurazione.
 */
function enabledKeys(): ReadonlySet<EmailKey> {
  const raw = (process.env.BREVO_ENABLED_KEYS || "").trim();
  if (!raw) return new Set();
  if (raw === "*") return new Set(ALL_EMAIL_KEYS);

  const keys = new Set<EmailKey>();
  for (const piece of raw.split(",")) {
    const name = piece.trim();
    if (!name) continue;
    if (isEmailKey(name)) keys.add(name);
    else console.warn(`[dispatch] BREVO_ENABLED_KEYS contiene una chiave sconosciuta: "${name}"`);
  }
  return keys;
}

export async function dispatchEmail<K extends EmailKey>(
  opts: DispatchOpts<K>
): Promise<DispatchResult> {
  const useBrevo = shouldUseBrevo(opts.key);

  const subject = opts.fallback?.subject ?? opts.subjectPreview;

  if (useBrevo) {
    const result = await sendTransactional({
      key: opts.key,
      to: opts.to,
      params: opts.params,
      replyTo: opts.replyTo,
      subjectPreview: subject,
      meta: opts.meta,
    });

    if (result.ok) return { ok: true, provider: "brevo", fallback: false };

    const reason = "skipped" in result && result.skipped ? result.reason : result.error;

    // Nessun percorso Resend: l'email semplicemente non parte. `sendTransactional`
    // ha già scritto la riga `skipped`/`failed`, quindi la cosa resta tracciata.
    if (!opts.fallback) {
      console.warn(`[dispatch] "${opts.key}" non inviata (${reason}) e nessun fallback disponibile`);
      return { ok: false, provider: "brevo", skipped: true };
    }


    // Brevo non ha consegnato: si prova Resend. Entrambi i tentativi restano
    // in email_log, così dal pannello si vede sia il fallimento sia il
    // recupero — una riga sola nasconderebbe la configurazione mancante.
    console.warn(`[dispatch] Brevo non ha inviato "${opts.key}" (${reason}) — ricado su Resend`);
    const resent = await sendViaResend(opts, opts.fallback, { fallbackFrom: "brevo", reason });
    return resent.ok
      ? { ok: true, provider: "resend", fallback: true }
      : { ok: false, provider: "resend", skipped: resent.skipped };
  }

  // Chiave non instradata su Brevo e nessun componente Resend: l'email non ha
  // ancora una strada. Non parte — come oggi, dove non esiste affatto — ma la
  // riga viene comunque scritta, altrimenti la mancata consegna sarebbe
  // invisibile e nessuno saprebbe che c'è una chiave da abilitare.
  if (!opts.fallback) {
    const reason = "chiave non attiva su Brevo e nessun fallback Resend";
    console.warn(`[dispatch] "${opts.key}" non inviata: ${reason}`);
    await logSkipped(opts, subject ?? opts.key, reason);
    return { ok: false, provider: "brevo", skipped: true };
  }

  const sent = await sendViaResend(opts, opts.fallback, null);
  return sent.ok
    ? { ok: true, provider: "resend", fallback: false }
    : { ok: false, provider: "resend", skipped: sent.skipped };
}

function shouldUseBrevo(key: EmailKey): boolean {
  return enabledKeys().has(key);
}

/**
 * Registra un mancato invio quando non è stato nemmeno tentato. Gli altri
 * casi li scrive già `sendTransactional` o `sendEmail`; questo è l'unico
 * ramo che altrimenti non lascerebbe traccia.
 */
async function logSkipped<K extends EmailKey>(
  opts: DispatchOpts<K>,
  subject: string,
  reason: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert({
      to_addresses: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject,
      template: opts.key,
      status: "skipped",
      error: reason,
      meta: { provider: "brevo", key: opts.key },
    });
  } catch (e) {
    console.error("[dispatch] impossibile registrare l'invio saltato", e);
  }
}

async function sendViaResend<K extends EmailKey>(
  opts: DispatchOpts<K>,
  fallback: NonNullable<DispatchOpts<K>["fallback"]>,
  fallbackInfo: { fallbackFrom: "brevo"; reason: string } | null
): Promise<{ ok: boolean; skipped: boolean }> {
  const meta: Record<string, Json> = {
    ...(opts.meta && typeof opts.meta === "object" && !Array.isArray(opts.meta)
      ? (opts.meta as Record<string, Json>)
      : {}),
    provider: "resend",
    key: opts.key,
  };
  if (fallbackInfo) {
    meta.fallback = true;
    meta.brevoError = fallbackInfo.reason;
  }

  const result = await sendEmail({
    to: opts.to,
    subject: fallback.subject,
    react: fallback.react,
    replyTo: opts.replyTo,
    template: fallback.template,
    meta,
  });

  return {
    ok: result.ok,
    skipped: "skipped" in result ? Boolean(result.skipped) : false,
  };
}
