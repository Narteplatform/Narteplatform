/**
 * Host da cui provengono i NOSTRI media: il progetto Supabase e le due pull
 * zone bunny.net (Storage e Stream).
 *
 * Si ricavano dalle variabili d'ambiente già esistenti, le stesse che usano
 * lib/supabase/server.ts e lib/storage/bunny/urls.ts. Se una variabile manca
 * (build di anteprima, sviluppo locale senza Bunny) si ripiega sul suffisso
 * della famiglia (`.supabase.co`, `.b-cdn.net`): meglio un controllo più largo
 * che immagini rotte.
 *
 * La stessa logica è replicata in next.config.ts per `images.remotePatterns`
 * (il file di configurazione non importa moduli dell'app): se cambia qui, va
 * cambiata anche lì.
 */

/** "https://abc.supabase.co/" o "abc.supabase.co" → "abc.supabase.co". */
export function hostDa(valore: string | undefined): string | null {
  const v = valore?.trim();
  if (!v) return null;
  try {
    return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export function hostMediaAmmesso(host: string): boolean {
  const h = host.toLowerCase();

  const supabase = hostDa(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseOk = supabase ? h === supabase : h.endsWith(".supabase.co");
  if (supabaseOk) return true;

  // Le due pull zone si restringono solo se sono note ENTRAMBE: con una sola,
  // i file dell'altra (copertine su Storage, poster su Stream) sparirebbero.
  const storage = hostDa(process.env.NEXT_PUBLIC_BUNNY_STORAGE_CDN);
  const stream = hostDa(process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN);
  return storage && stream ? h === storage || h === stream : h.endsWith(".b-cdn.net");
}
