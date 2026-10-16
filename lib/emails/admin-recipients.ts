import { TITOLARE } from "@/lib/legal/titolare";

/**
 * Destinatari delle notifiche interne al team.
 *
 * Unisce, senza doppioni e in minuscolo:
 *  - `ADMIN_NOTIFICATION_EMAIL`
 *  - `ADMIN_NOTIFICATION_EXTRA` (lista separata da virgole; se vuota o assente
 *    vale la casella condivisa del team)
 *
 * Con `{ fallback: true }`, se non resta nessun indirizzo si ripiega su
 * `SUPERADMIN_EMAIL` e poi sul recapito pubblico unico: serve ai punti che
 * prima avevano già quel ripiego. Non va usata per i permessi: lì
 * `SUPERADMIN_EMAIL` identifica il root, non un destinatario.
 */

const EXTRA_DEFAULT = "narte.official.eventi@gmail.com";

function indirizzi(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function adminRecipients(opts: { fallback?: boolean } = {}): string[] {
  const extraRaw = (process.env.ADMIN_NOTIFICATION_EXTRA ?? "").trim();
  const lista = [
    ...indirizzi(process.env.ADMIN_NOTIFICATION_EMAIL),
    ...indirizzi(extraRaw || EXTRA_DEFAULT),
  ];
  if (lista.length === 0) lista.push(EXTRA_DEFAULT);
  if (opts.fallback && lista.length === 0) {
    lista.push(...indirizzi(process.env.SUPERADMIN_EMAIL), TITOLARE.emailContatti.toLowerCase());
  }
  return Array.from(new Set(lista));
}
