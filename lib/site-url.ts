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

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) return normalize(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  if (process.env.VERCEL_URL) return normalize(process.env.VERCEL_URL);
  return "http://localhost:3000";
}
