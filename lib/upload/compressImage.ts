/**
 * Ridimensionamento e compressione delle immagini NEL BROWSER, prima dell'invio.
 *
 * Estratto da components/forms/ImageUpload.tsx, dove il ritaglio su canvas
 * esisteva già ma era prigioniero di quel componente. `GalleryUpload` inviava
 * il file originale, e la gallery è proprio il posto dove le immagini sono di
 * più: fino a 30 sul piano Max.
 *
 * PERCHÉ CONTA, in due modi distinti.
 *
 * 1. Chiude un bug attivo. `GalleryUpload` dichiara un tetto di 5 MB, ma il body
 *    di una funzione Vercel si ferma a 4,5 MB: una foto fra 4,5 e 5 MB — cioè un
 *    normale scatto da smartphone — fallisce OGGI in produzione con un 413 opaco
 *    che non arriva nemmeno al nostro codice. Comprimere prima dell'invio lo
 *    elimina alla radice.
 *
 * 2. Un video lo scarichi solo se qualcuno preme play; un'immagine la scarichi a
 *    ogni visita, da chiunque, anche da chi rimbalza dopo due secondi. Una foto
 *    da iPhone 12 MP (4032×3024) pesa 4-6 MB e scende a ~250 KB: comprimere non
 *    significa degradare, significa smettere di trasferire dati che nessuno può
 *    percepire.
 *
 * ⚠️ Modulo di SOLO BROWSER: usa canvas, Image e createImageBitmap.
 */

export type ImageKind = "artist" | "event" | "event_home" | "avatar" | "venue" | "format" | "blog";

export type ImageTarget = { w: number; h: number; aspect: string };

/**
 * Dimensioni di uscita del ritaglio, per destinazione. Spostate qui da
 * ImageUpload perché ora servono a due chiamanti.
 */
export const IMAGE_TARGETS: Readonly<Record<ImageKind, ImageTarget>> = {
  artist: { w: 900, h: 1200, aspect: "3 / 4" },
  event: { w: 1600, h: 900, aspect: "16 / 9" },
  event_home: { w: 900, h: 1200, aspect: "3 / 4" },
  avatar: { w: 400, h: 400, aspect: "1 / 1" },
  venue: { w: 1600, h: 900, aspect: "16 / 9" },
  format: { w: 900, h: 1200, aspect: "3 / 4" },
  blog: { w: 1600, h: 900, aspect: "16 / 9" },
};

/** Qualità JPEG del ritaglio. Identica a prima dell'estrazione: l'output non cambia. */
export const CROP_QUALITY = 0.88;

/** Lato lungo massimo per le foto della gallery, che non vengono ritagliate. */
const GALLERY_MAX_EDGE = 1600;

/** Oltre questo peso si riprova con una qualità più bassa. */
const GALLERY_MAX_BYTES = 400 * 1024;

/** Sotto questo peso non si tocca niente: ricomprimere peggiorerebbe e basta. */
const ALREADY_SMALL_BYTES = 400 * 1024;

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Conversione immagine fallita"))),
      type,
      quality
    );
  });
}

export type CropParams = {
  img: CanvasImageSource & { width: number; height: number };
  targetW: number;
  targetH: number;
  zoom: number;
  offset: { x: number; y: number };
  background?: string;
};

/**
 * Dipinge il ritaglio su un contesto 2D.
 *
 * Chiamata da DUE posti: l'anteprima dal vivo di ImageUpload, che dipinge sul
 * canvas visibile mentre l'utente trascina, e la generazione del file. Prima la
 * matematica era scritta una volta sola ma dentro il componente, quindi
 * inaccessibile; ora è qui, e le due strade non possono divergere.
 */
export function paintCrop(ctx: CanvasRenderingContext2D, p: CropParams): void {
  ctx.fillStyle = p.background ?? "#000";
  ctx.fillRect(0, 0, p.targetW, p.targetH);

  const dw = p.img.width * p.zoom;
  const dh = p.img.height * p.zoom;
  ctx.drawImage(
    p.img,
    (p.targetW - dw) / 2 + p.offset.x,
    (p.targetH - dh) / 2 + p.offset.y,
    dw,
    dh
  );
}

/** Ritaglio su canvas fuori dal DOM, per chi non ha un'anteprima da mostrare. */
export async function drawCropToBlob(p: CropParams & { quality?: number }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = p.targetW;
  canvas.height = p.targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  paintCrop(ctx, p);
  return canvasToBlob(canvas, "image/jpeg", p.quality ?? CROP_QUALITY);
}

/**
 * Decodifica un file immagine rispettando l'orientamento EXIF.
 *
 * ⚠️ È la trappola numero uno di questo modulo. Una foto verticale scattata con
 * un telefono ha `Orientation = 6` e i pixel memorizzati in orizzontale: passata
 * a `drawImage` senza correzione esce ruotata di 90°. `createImageBitmap` con
 * `imageOrientation: "from-image"` applica la rotazione; dove non è disponibile
 * (Safari più vecchi) si ricade su `<img>`, che i browser orientano da soli.
 */
async function decodeOriented(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // opzione non supportata: si continua col percorso <img>
    }
  }
  return loadImageElement(file);
}

/** Carica un file in un `<img>`. Esportata perché ImageUpload ne ha bisogno per il ritaglio interattivo. */
export function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lettura del file fallita"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Immagine non leggibile"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Ridimensiona un'immagine dentro un riquadro, SENZA ritagliarla, e la comprime
 * in JPEG. Per le foto della gallery, dove l'inquadratura è dell'artista e non
 * nostra: si riduce il peso, non si decide la composizione.
 *
 * Se il file è già leggero e dentro le dimensioni viene restituito immutato.
 */
export async function compressToFit(
  file: File,
  opts: { maxEdge?: number; maxBytes?: number; quality?: number } = {}
): Promise<File> {
  const maxEdge = opts.maxEdge ?? GALLERY_MAX_EDGE;
  const maxBytes = opts.maxBytes ?? GALLERY_MAX_BYTES;

  const source = await decodeOriented(file);
  const sw = source.width;
  const sh = source.height;
  if (!sw || !sh) throw new Error("Immagine non leggibile");

  const longestEdge = Math.max(sw, sh);
  if (file.size <= ALREADY_SMALL_BYTES && longestEdge <= maxEdge) {
    if ("close" in source) source.close();
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "foto";

  // Degradazione progressiva: prima si abbassa la qualità, poi le dimensioni.
  // Ridurre la qualità si vede molto meno che rimpicciolire l'immagine.
  const attempts: Array<{ edge: number; quality: number }> = [
    { edge: maxEdge, quality: opts.quality ?? 0.85 },
    { edge: maxEdge, quality: 0.75 },
    { edge: maxEdge, quality: 0.65 },
    { edge: Math.round(maxEdge * 0.75), quality: 0.75 },
  ];

  let best: Blob | null = null;
  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.edge / longestEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non disponibile");

    // Sfondo BIANCO e non nero: un PNG con trasparenza convertito in JPEG
    // prende il colore di riempimento, e su una gallery il nero sembra un
    // errore di caricamento.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);

    best = await canvasToBlob(canvas, "image/jpeg", attempt.quality);
    if (best.size <= maxBytes) break;
  }

  if ("close" in source) source.close();
  if (!best) throw new Error("Compressione fallita");

  // Se anche l'ultimo tentativo resta sopra la soglia si carica comunque: è pur
  // sempre molto più piccolo dell'originale, e rifiutare la foto dell'artista
  // sarebbe peggio del file grande.
  return new File([best], `${name}.jpg`, { type: "image/jpeg" });
}
