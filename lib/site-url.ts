/**
 * Dominio pubblico del sito, senza barra finale e con schema.
 *
 * Normalizzato perché finisce davanti ai percorsi delle email
 * (`${base}/dashboard/…`): una barra finale in `NEXT_PUBLIC_SITE_URL` o un
 * valore senza `https://` darebbe link con `//` o relativi, cioè bottoni rotti.
 */
function normalize(raw: string): string {
  const v = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/** true per indirizzi che fuori dal computer dello sviluppatore non portano da nessuna parte. */
function isLocale(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);
}

export function getSiteUrl(): string {
  const configurato = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  // Su Vercel un `localhost` copiato per errore da .env.local finirebbe nei
  // link delle email: lo si scarta e si usa il dominio di produzione.
  if (configurato && !(process.env.VERCEL && isLocale(normalize(configurato)))) {
    return normalize(configurato);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  if (process.env.VERCEL_URL) return normalize(process.env.VERCEL_URL);
  return "http://localhost:3000";
}
