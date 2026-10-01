/**
 * Le sezioni del pannello /admin, in un posto solo e senza dipendenze.
 *
 * Senza dipendenze perché la importa anche il middleware (runtime edge). Prima
 * il middleware teneva una propria copia della mappa prefisso → sezione, e le
 * due liste si erano già separate: nel middleware mancavano `format` e
 * `richieste` — quindi un superadmin delegato poteva aprirle senza delega — e
 * c'era una chiave `messaggi` che non corrisponde a nessuna sezione.
 */
export const ADMIN_PAGE_KEYS = [
  "overview",
  "eventi",
  "format",
  "artisti",
  "generi",
  "leads",
  "richieste",
  "chat",
  "consulenza",
  "blog",
  "email",
  "profilo",
  "impostazioni",
  "feedback",
  "moderazione",
  // Aggiunte con l'allineamento legale del 30/09/2026.
  "segnalazioni",
  "recensioni",
  "abbonamenti",
  "proposte",
  "utenti",
  "registro",
] as const;
export type AdminPageKey = (typeof ADMIN_PAGE_KEYS)[number];

/** Sezioni sempre visibili a ogni superadmin, senza delega. */
export const ADMIN_PAGES_SEMPRE_VISIBILI: readonly AdminPageKey[] = ["overview", "profilo"];

/**
 * La sezione a cui appartiene un percorso sotto /admin, o `null` per la
 * panoramica (/admin) e per i percorsi che non sono una sezione.
 * Ogni sezione vive in /admin/<chiave>.
 */
export function adminSectionForPath(path: string): AdminPageKey | null {
  const m = /^\/admin\/([^/?#]+)/.exec(path);
  if (!m) return null;
  const key = m[1];
  return (ADMIN_PAGE_KEYS as readonly string[]).includes(key) ? (key as AdminPageKey) : null;
}
