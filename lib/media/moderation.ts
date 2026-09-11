import "server-only";

/**
 * Moderazione dei media caricati dagli artisti.
 *
 * Un'immagine, un video o una traccia audio non compaiono sul profilo pubblico
 * appena caricati: finiscono in `artist_media_submissions` e ci restano finché
 * il superadmin non li approva.
 *
 * IL PUNTO DI INTERCETTAZIONE NON È L'UPLOAD, È IL SALVATAGGIO.
 * Il file sale su Bunny come sempre — serve comunque, anche solo per mostrarne
 * l'anteprima a chi deve approvarlo. Quello che cambia è il momento in cui
 * l'URL entra in `artists.gallery` o `artists.audio_files`, e quel momento è
 * `updateArtistProfileSection`.
 *
 * LA REGOLA CHE TIENE IN PIEDI TUTTO: si lavora per DIFFERENZA, mai per
 * sostituzione. Quello che l'artista TOGLIE resta nel patch, perché togliere
 * roba propria è un suo diritto e non richiede il permesso di nessuno. Quello
 * che AGGIUNGE esce dal patch e diventa una richiesta. Il risultato è che il
 * patch contiene l'intersezione fra quello che c'era e quello che è arrivato:
 * se l'artista ha soltanto aggiunto, il patch è identico al valore già in
 * colonna, e un update che riscrive lo stesso valore non può perdere niente.
 *
 * È la differenza fra "accodare" e "riscrivere", ed è esattamente la
 * distinzione che su questo schema è già costata una galleria.
 */

export type MediaTarget = "gallery" | "audio_files" | "cover_image";
export type MediaKind = "image" | "audio";

export type AudioTrack = { url: string; title: string };

export type PendingSubmission = {
  artist_id: string;
  submitted_by: string | null;
  target: MediaTarget;
  media_kind: MediaKind;
  url: string;
  title: string | null;
};

/**
 * Divide la galleria proposta in "resta pubblicato" e "va approvato".
 *
 * `kept` mantiene l'ordine scelto dall'artista fra le foto già online, così
 * riordinare la galleria continua a funzionare senza passare da un'approvazione.
 */
export function diffGallery(
  current: readonly string[],
  proposed: readonly string[]
): { kept: string[]; added: string[] } {
  const published = new Set(current);
  const kept: string[] = [];
  const added: string[] = [];
  for (const url of proposed) {
    if (published.has(url)) {
      // Un doppione nel payload non deve produrre due volte la stessa riga.
      if (!kept.includes(url)) kept.push(url);
    } else if (!added.includes(url)) {
      added.push(url);
    }
  }
  return { kept, added };
}

/**
 * Come sopra per le tracce audio, che sono oggetti e non stringhe.
 *
 * Il confronto è sull'URL soltanto: rinominare una traccia già pubblicata è una
 * modifica di testo, non un contenuto nuovo, e mandarla in coda di approvazione
 * sarebbe solo una seccatura. Il titolo aggiornato passa in `kept`.
 */
export function diffAudio(
  current: readonly AudioTrack[],
  proposed: readonly AudioTrack[]
): { kept: AudioTrack[]; added: AudioTrack[] } {
  const published = new Map(current.map((t) => [t.url, t]));
  const kept: AudioTrack[] = [];
  const added: AudioTrack[] = [];
  const seen = new Set<string>();
  for (const track of proposed) {
    if (seen.has(track.url)) continue;
    seen.add(track.url);
    if (published.has(track.url)) kept.push(track);
    else added.push(track);
  }
  return { kept, added };
}

export function toGallerySubmissions(
  artistId: string,
  userId: string | null,
  urls: readonly string[]
): PendingSubmission[] {
  return urls.map((url) => ({
    artist_id: artistId,
    submitted_by: userId,
    target: "gallery",
    media_kind: "image",
    url,
    title: null,
  }));
}

export function toAudioSubmissions(
  artistId: string,
  userId: string | null,
  tracks: readonly AudioTrack[]
): PendingSubmission[] {
  return tracks.map((t) => ({
    artist_id: artistId,
    submitted_by: userId,
    target: "audio_files",
    media_kind: "audio",
    url: t.url,
    title: t.title?.trim() || null,
  }));
}

export function toCoverSubmission(
  artistId: string,
  userId: string | null,
  url: string
): PendingSubmission {
  return {
    artist_id: artistId,
    submitted_by: userId,
    target: "cover_image",
    media_kind: "image",
    url,
    title: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convivenza con il database non ancora migrato
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La moderazione è attiva su questo database?
 *
 * Le migration di questo progetto si applicano A MANO dal SQL editor, quindi
 * esiste sempre una finestra in cui il codice nuovo gira su uno schema vecchio.
 * Senza questo controllo quella finestra sarebbe un disastro silenzioso:
 *
 *  - il profilo pubblico filtra su `artist_videos.moderation_state`, che non
 *    esisterebbe: la query fallisce e TUTTI i video sparirebbero dai profili;
 *  - il salvataggio del profilo scriverebbe la sola intersezione in `gallery`
 *    per poi non riuscire ad accodare le aggiunte, che andrebbero perse.
 *
 * Finché la 0051 non è applicata la piattaforma si comporta esattamente come
 * prima: si pubblica senza approvazione. È lo stesso criterio già adottato qui
 * per il limitatore di frequenza e per Bunny — la funzione nuova resta spenta,
 * niente si rompe e niente sparisce.
 *
 * Il risultato si memorizza per la durata dell'istanza: è una proprietà dello
 * schema, non un dato, e cambia una volta sola nella vita del progetto. Un esito
 * negativo NON si memorizza, così l'applicazione della migration ha effetto
 * senza bisogno di un nuovo deploy.
 */
let moderationReady: boolean | null = null;

export async function isMediaModerationEnabled(
  admin: { from: (t: string) => { select: (c: string) => { limit: (n: number) => PromiseLike<{ error: { message: string } | null }> } } }
): Promise<boolean> {
  if (moderationReady === true) return true;

  const { error } = await admin.from("artist_media_submissions").select("id").limit(1);
  if (error) {
    moderationReady = null;
    return false;
  }
  moderationReady = true;
  return true;
}
