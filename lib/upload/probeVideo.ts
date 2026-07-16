/**
 * Ispeziona un video lato client prima di caricarlo, caricandone i soli
 * metadati in un <video> fuori dal DOM.
 *
 * Serve a due cose:
 *  - ricavare la durata, che finisce in artist_videos.duration_ms;
 *  - accorgersi che il browser non sa decodificare il file PRIMA di spedire
 *    decine di MB. Supabase Storage non transcodifica: quello che il browser
 *    non riproduce qui, non lo riprodurrà nemmeno sulla pagina pubblica.
 */

export type VideoProbe = {
  durationMs: number | null;
  /** false = il browser non decodifica il file (tipicamente HEVC da iPhone). */
  playable: boolean;
};

const PROBE_TIMEOUT_MS = 10_000;

export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise<VideoProbe>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (result: VideoProbe) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    // Un probe che non risponde non deve bloccare l'upload: si prosegue senza
    // durata, lasciando l'ultima parola alla validazione del server.
    const timer = setTimeout(() => finish({ durationMs: null, playable: true }), PROBE_TIMEOUT_MS);

    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      // videoWidth === 0 significa che il container è stato letto ma la traccia
      // video non è decodificabile.
      const playable = video.videoWidth > 0;
      const durationMs = Number.isFinite(video.duration)
        ? Math.round(video.duration * 1000)
        : null;
      finish({ durationMs, playable });
    };

    video.onerror = () => finish({ durationMs: null, playable: false });

    video.src = url;
  });
}
