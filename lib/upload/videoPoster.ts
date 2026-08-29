/**
 * Estrae un fotogramma da un file video, nel browser, prima di caricarlo.
 *
 * PERCHÉ NON USARE LA THUMBNAIL DI BUNNY. Quella esiste solo a transcodifica
 * finita, e la coda dell'encoding gratuito richiede da qualche minuto a
 * mezz'ora. Fino ad allora l'artista vedrebbe un riquadro grigio al posto del
 * proprio video. Questo fotogramma invece è disponibile nell'istante in cui il
 * caricamento finisce, pesa ~30 KB, e vive su Bunny Storage — quindi non
 * dipende dalle impostazioni di sicurezza della library Stream.
 *
 * Restituisce `null` quando il browser non sa decodificare il file: è il caso
 * dei .mov HEVC dell'iPhone, ed è normale. Il chiamante mostra il riquadro
 * neutro e va avanti: un poster mancante non deve mai far fallire un upload.
 */
export async function captureVideoPoster(
  file: File,
  opts: { maxEdge?: number; quality?: number; seekRatio?: number } = {}
): Promise<File | null> {
  const maxEdge = opts.maxEdge ?? 1280;
  const quality = opts.quality ?? 0.8;
  const seekRatio = opts.seekRatio ?? 0.1;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = url;

  try {
    const ok = await new Promise<boolean>((resolve) => {
      // Un file che il browser non decodifica non emette mai `seeked`: senza
      // questo tetto la promessa resterebbe appesa e bloccherebbe l'upload.
      const timer = setTimeout(() => resolve(false), 8000);
      const done = (value: boolean) => {
        clearTimeout(timer);
        resolve(value);
      };
      video.onerror = () => done(false);
      video.onloadedmetadata = () => {
        if (!video.videoWidth || !video.duration || !isFinite(video.duration)) {
          done(false);
          return;
        }
        // Non il fotogramma 0: spesso è nero o una dissolvenza.
        video.currentTime = Math.min(video.duration * seekRatio, 3);
      };
      video.onseeked = () => done(true);
    });

    if (!ok) return null;

    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return null;
    return new File([blob], "poster.jpg", { type: "image/jpeg" });
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
