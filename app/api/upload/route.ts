import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { bunnyUploadsEnabled } from "@/lib/storage/bunny/config";
import { putObject } from "@/lib/storage/bunny/storage";
import { audioExtForMime, imageExtForMime, mediaKey } from "@/lib/storage/bunny/paths";
import { storageCdnUrl } from "@/lib/storage/bunny/urls";
import { recordMediaAsset } from "@/lib/storage/bunny/registry";
import { logger } from "@/lib/logger";
import {
  SIGNATURE_BYTES,
  detectImageMime,
  looksLikeAudio,
  looksLikeVideo,
} from "@/lib/security/file-signature";
import { checkCollectionLimit, getEntitlementsForUser } from "@/lib/billing/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKETS = {
  artist: "artist-images",
  event: "event-covers",
  event_home: "event-covers",
  avatar: "artist-images",
  venue: "venue-images",
  audio: "artist-audio",
  "artist-video": "artist-videos",
  "event-video": "event-videos",
  "format": "format-covers",
  "format-video": "event-videos",
  "blog": "blog-covers",
  // Foto e loghi del sito gestiti da /admin/contenuti: bucket editoriale pubblico.
  "site": "blog-covers",
  "site-logo": "blog-covers",
} as const;

type Kind = keyof typeof BUCKETS;

/**
 * Destinazioni editoriali: contenuti che appaiono sul sito pubblico a nome di
 * N'arte, non del singolo utente.
 *
 * Prima erano raggiungibili da CHIUNQUE fosse autenticato. Il controllo qui
 * sopra verificava solo che esistesse una sessione, non chi fosse: un
 * organizzatore, o un utente registrato per curiosare fra gli artisti, poteva
 * caricare la copertina di un articolo del blog o di un format. Non era
 * sfruttabile per pubblicare qualcosa — le pagine si scrivono dal pannello
 * admin — ma lasciava scrivere nello Storage a spese nostre e in un'area che
 * non ha nulla a che fare con quell'utente.
 */
const KIND_SOLO_ADMIN: ReadonlySet<Kind> = new Set(["blog", "format", "format-video", "site", "site-logo"]);

/**
 * Foto e loghi del sito: solo formati raster. Un SVG puo' contenere script, e
 * questi file finiscono su una pagina pubblica a nome di N'arte.
 */
const SITE_IMAGE_MIME = /^image\/(jpeg|png|webp)$/;

const VIDEO_MIME = /^video\/(mp4|webm|quicktime)$/;
const VIDEO_EXT: Readonly<Record<string, string>> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const AUDIO_MAX = 25 * 1024 * 1024; // 25MB
const VIDEO_MAX = 50 * 1024 * 1024; // 50MB
/**
 * 4 MB, non 5.
 *
 * ⚠️ Il body di una funzione Vercel si ferma a 4,5 MB, ed è un limite di
 * piattaforma. Il vecchio tetto di 5 MB mentiva: una foto fra 4,5 e 5 MB — uno
 * scatto normale da smartphone — riceveva un 413 opaco dalla piattaforma senza
 * mai arrivare qui. Con 4 MB l'errore è nostro, arriva prima ed è leggibile.
 * Le foto della gallery vengono comunque compresse nel browser (~250 KB) prima
 * di partire, quindi in pratica non lo tocca nessuno.
 */
const IMAGE_MAX = 4 * 1024 * 1024;

export async function POST(request: Request) {
  // Auth check: solo utenti loggati possono caricare
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Freno di frequenza: la soglia è alta perché un artista che compone la
  // propria gallery carica legittimamente molte immagini di seguito. Serve a
  // fermare uno script, non a intralciare l'uso normale.
  if (!(await allowByIp(LIMITI.uploadAutenticato))) {
    return NextResponse.json(
      { error: "Troppi caricamenti ravvicinati. Attendi qualche minuto e riprova." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData non valido" }, { status: 400 });
  }

  const file = form.get("file");
  const kindRaw = (form.get("kind") ?? "artist").toString();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (!(kindRaw in BUCKETS)) {
    return NextResponse.json({ error: "Kind non valido" }, { status: 400 });
  }
  const kind = kindRaw as Kind;
  const bucket = BUCKETS[kind];

  // Le destinazioni editoriali richiedono il ruolo, non la sola sessione.
  // Lettura via service role: le policy su `profiles` si auto-referenziano e
  // con il client di sessione andrebbero in ricorsione (stessa ragione per cui
  // lo fanno middleware.ts e lib/auth/guards.ts).
  if (KIND_SOLO_ADMIN.has(kind)) {
    const gate = createAdminClient();
    const { data: profile } = await gate
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  const isVideo = kind === "artist-video" || kind === "event-video" || kind === "format-video";
  const isImage = kind !== "audio" && !isVideo;

  // Prima della lettura del file: per i limiti bastano dimensione e tipo
  // dichiarato, e un file già fuori misura non va nemmeno caricato in memoria.
  if (kind === "audio") {
    if (file.size > AUDIO_MAX) {
      return NextResponse.json({ error: "Audio troppo grande (max 25MB)" }, { status: 413 });
    }
    // Stesso elenco chiuso della rotta di firma Bunny: prima bastava `audio/*`.
    if (!audioExtForMime(file.type)) {
      return NextResponse.json(
        { error: "Formato audio non supportato (MP3, WAV, M4A, AAC, OGG o FLAC)." },
        { status: 415 }
      );
    }
  } else if (isVideo) {
    if (file.size > VIDEO_MAX) {
      return NextResponse.json({ error: "Video troppo grande (max 50MB)" }, { status: 413 });
    }
    if (!VIDEO_MIME.test(file.type)) {
      return NextResponse.json(
        { error: "Formato video non supportato (solo mp4/webm/mov)" },
        { status: 415 }
      );
    }
  } else {
    if (file.size > IMAGE_MAX) {
      return NextResponse.json({ error: "Immagine troppo grande (max 4MB)" }, { status: 413 });
    }
    // Elenco chiuso su ENTRAMBI i rami (Bunny e Supabase). Prima il ramo
    // Supabase accettava qualunque `image/*`, SVG compreso: un SVG può
    // contenere script ed era servito da un dominio pubblico.
    if (!imageExtForMime(file.type)) {
      return NextResponse.json(
        { error: "Formato immagine non supportato (JPEG, PNG, WebP, AVIF o GIF)." },
        { status: 415 }
      );
    }
  }

  // Tetto di piano PRIMA del salvataggio, per l'audio: senza, il file finisce
  // nello Storage anche quando il salvataggio del profilo verrà poi rifiutato.
  // Stesso controllo della rotta di firma /api/upload/audio/sign; qui il client
  // non manda l'artista, quindi vale il profilo attivo dell'account. Il
  // superadmin (che carica per conto di altri) e chi non ha profili artista non
  // hanno un piano da applicare: decide comunque la Server Action al salvataggio.
  if (kind === "audio") {
    const gate = createAdminClient();
    const { data: ruolo, error: ruoloErr } = await gate
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (ruoloErr) {
      logger.error("api/upload", "lettura ruolo fallita", ruoloErr);
      return NextResponse.json({ error: "Caricamento non riuscito, riprova" }, { status: 503 });
    }
    if (ruolo?.role !== "superadmin") {
      const attivo = await getEntitlementsForUser(user.id);
      if (attivo) {
        const { data: artista, error: artistaErr } = await gate
          .from("artists")
          .select("audio_files")
          .eq("id", attivo.artistId)
          .maybeSingle();
        // Una lettura fallita non è «zero tracce»: farebbe passare il gate.
        if (artistaErr || !artista) {
          logger.error("api/upload", "lettura tracce audio fallita", artistaErr);
          return NextResponse.json({ error: "Caricamento non riuscito, riprova" }, { status: 503 });
        }
        const attuali = Array.isArray(artista.audio_files) ? artista.audio_files.length : 0;
        const verifica = checkCollectionLimit(attivo.entitlements, "audio", attuali, attuali + 1);
        if (!verifica.ok) {
          return NextResponse.json({ error: verifica.error }, { status: 409 });
        }
      }
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const head = new Uint8Array(arrayBuffer, 0, Math.min(SIGNATURE_BYTES, arrayBuffer.byteLength));

  // Il tipo con cui il file verrà SERVITO lo decidono i suoi byte, non il
  // browser che lo dichiara (vedi lib/security/file-signature.ts).
  let contentType = file.type;
  if (isImage) {
    const reale = detectImageMime(head);
    if (!reale) {
      return NextResponse.json(
        { error: "Il file non è un'immagine valida (JPEG, PNG, WebP, AVIF o GIF)." },
        { status: 415 }
      );
    }
    if ((kind === "site" || kind === "site-logo") && !SITE_IMAGE_MIME.test(reale)) {
      return NextResponse.json({ error: "Usa un file JPG, PNG o WebP." }, { status: 415 });
    }
    contentType = reale;
  } else if (kind === "audio") {
    if (!looksLikeAudio(head)) {
      return NextResponse.json({ error: "Il file non è un audio valido." }, { status: 415 });
    }
  } else if (!looksLikeVideo(head)) {
    return NextResponse.json({ error: "Il file non è un video valido." }, { status: 415 });
  }

  // -------------------------------------------------------------------------
  // Ramo Bunny Storage — solo le immagini
  // -------------------------------------------------------------------------
  // Audio e video NON passano di qui a interruttore acceso: hanno rotte di
  // firma dedicate (/api/upload/audio/sign, /api/upload/video) perché non
  // possono attraversare una funzione Vercel. Restano su questa rotta solo
  // finché l'interruttore è spento, cioè come percorso di ripiego.
  if (bunnyUploadsEnabled() && isImage) {
    const bunnyExt = imageExtForMime(contentType);
    if (!bunnyExt) {
      return NextResponse.json(
        { error: "Formato immagine non supportato (JPEG, PNG, WebP, AVIF o GIF)." },
        { status: 415 }
      );
    }

    // Lo scope è l'utente e non l'entità: quando si carica la copertina di un
    // evento in creazione, quell'evento non ha ancora un id. Vedi la nota in
    // lib/storage/bunny/paths.ts.
    const key = mediaKey({ scope: "users", ownerId: user.id, kind, ext: bunnyExt });

    try {
      await putObject({ key, body: arrayBuffer, contentType });
    } catch (e) {
      logger.error("api/upload", "putObject su Bunny fallita", e);
      return NextResponse.json({ error: "Caricamento non riuscito" }, { status: 500 });
    }

    const url = storageCdnUrl(key);
    // Best-effort: un errore qui non deve far fallire un upload riuscito.
    await recordMediaAsset({
      storageKey: key,
      publicUrl: url,
      kind: "image",
      ownerUserId: user.id,
      bytes: file.size,
      mimeType: contentType,
    });

    // Stessa forma di risposta del ramo Supabase: ImageUpload, GalleryUpload,
    // RichTextEditor ed EventVideoUpload non devono accorgersi di niente.
    return NextResponse.json({
      url,
      path: key,
      bucket: null,
      name: file.name,
      size: file.size,
      contentType,
    });
  }

  // -------------------------------------------------------------------------
  // Ramo Supabase Storage — il percorso di sempre, invariato
  // -------------------------------------------------------------------------
  // Estensione da elenchi chiusi, non dal tipo dichiarato dal client: prima
  // `file.type.split("/")[1]` lasciava scegliere a lui con che estensione il
  // file sarebbe stato servito (es. `svg+xml` → `.svgxml`).
  const ext = isImage
    ? imageExtForMime(contentType) ?? "jpg"
    : kind === "audio"
    ? audioExtForMime(contentType) ?? "mp3"
    : VIDEO_EXT[contentType] ?? "mp4";
  const safeKind = kind.replace(/[^a-z0-9_-]/gi, "_");
  const path = `${user.id}/${Date.now()}-${safeKind}.${ext}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({
    url: pub.publicUrl,
    path,
    bucket,
    name: file.name,
    size: file.size,
    contentType,
  });
}
