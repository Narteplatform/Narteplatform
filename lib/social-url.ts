/**
 * Link dei profili (Spotify, sito, YouTube, Facebook) come li incollano gli
 * artisti: dall'app di Spotify arriva spesso `spotify:artist:ID`, dal browser
 * un indirizzo senza `https://`, dalla condivisione un testo con il link dentro.
 * Qui diventano URL apribili. Nessuna dipendenza server: si usa anche nei form.
 */

const DOMINIO = /^(www\.)?[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/|$|\?)/i;
const URI_SPOTIFY = /^spotify:(artist|album|track|playlist|show|user):([\w.-]+)$/i;
const PARAMETRI_TRACCIAMENTO = /^(si|utm_\w+|igsh|igshid|fbclid|nd|dlsi)$/i;

/** Normalizza un link incollato; vuoto resta vuoto, ciò che non è un link resta com'è. */
export function normalizzaLink(valore: string): string {
  let v = valore.trim();
  if (!v) return "";

  const uri = v.match(URI_SPOTIFY);
  if (uri) return `https://open.spotify.com/${uri[1].toLowerCase()}/${uri[2]}`;

  // «Ascolta X su Spotify: https://open.spotify.com/…» → solo il link.
  const dentro = v.match(/https?:\/\/\S+/i);
  if (dentro && dentro.index !== 0) v = dentro[0];

  if (!/^https?:\/\//i.test(v)) {
    if (!DOMINIO.test(v)) return v;
    v = `https://${v}`;
  }

  try {
    const url = new URL(v);
    for (const chiave of [...url.searchParams.keys()]) {
      if (PARAMETRI_TRACCIAMENTO.test(chiave)) url.searchParams.delete(chiave);
    }
    return url.toString();
  } catch {
    return v;
  }
}

/** true se il valore è un URL http(s) apribile. */
export function isLinkWeb(valore: string): boolean {
  if (!/^https?:\/\//i.test(valore)) return false;
  try {
    new URL(valore);
    return true;
  } catch {
    return false;
  }
}

/**
 * L'href da usare in pagina per un link salvato, o null se non è apribile.
 * Ripara anche i link già in archivio senza `https://`, che altrimenti il
 * browser tratterebbe come percorsi relativi del sito (→ 404).
 */
export function hrefLink(valore: string | null | undefined): string | null {
  if (!valore) return null;
  const v = normalizzaLink(valore);
  return isLinkWeb(v) ? v : null;
}
