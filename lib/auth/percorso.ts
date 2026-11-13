/**
 * Destinazioni «next» che arrivano dall'URL: solo percorsi interni al sito.
 *
 * PERCHÉ NON BASTA `startsWith("/") && !startsWith("//")`. I browser trattano
 * `\` come `/` negli URL http: `/\evil.com` diventa `//evil.com`, cioè un
 * indirizzo ASSOLUTO verso un altro dominio. Lo stesso vale per i caratteri di
 * controllo (tab e a capo vengono scartati dal parser: `/\t/evil.com`) e per le
 * barre codificate che qualche passaggio decodifica una volta di troppo.
 *
 * La prova definitiva è la stessa che fa il browser: si risolve il percorso
 * contro un'origine fittizia e si controlla che l'origine non cambi.
 *
 * Senza dipendenze: la importano il middleware (edge), i route handler, le
 * pagine server e i componenti client.
 */

const ORIGINE_FITTIZIA = "https://narte.invalid";
const LUNGHEZZA_MASSIMA = 500;

function controlla(valore: unknown): string | null {
  const v = Array.isArray(valore) ? valore[0] : valore;
  if (typeof v !== "string" || v.length === 0 || v.length > LUNGHEZZA_MASSIMA) return null;
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  // Barra rovesciata ovunque, caratteri di controllo e spazi iniziali/finali.
  if (v.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) return null;
  if (v.trim() !== v) return null;
  // Barre codificate subito dopo la prima: `/%2F%2Fevil.com`, `/%5Cevil.com`.
  if (/^\/(%2f|%5c)/i.test(v)) return null;
  try {
    const risolto = new URL(v, ORIGINE_FITTIZIA);
    if (risolto.origin !== ORIGINE_FITTIZIA) return null;
  } catch {
    return null;
  }
  return v;
}

/**
 * Restituisce `valore` se è un percorso interno sicuro, altrimenti `fallback`
 * (`null` se non indicato). Accetta anche gli array di `searchParams`.
 */
export function percorsoSicuro(valore: unknown): string | null;
export function percorsoSicuro(valore: unknown, fallback: string): string;
export function percorsoSicuro(valore: unknown, fallback: string | null): string | null;
export function percorsoSicuro(valore: unknown, fallback: string | null = null): string | null {
  return controlla(valore) ?? fallback;
}
