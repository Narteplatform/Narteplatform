import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { checkCollectionLimit, getEntitlements } from "@/lib/billing/entitlements";
import { bunnyUploadsEnabled } from "@/lib/storage/bunny/config";
import { presignPut } from "@/lib/storage/bunny/presign";
import { audioExtForMime, mediaKey } from "@/lib/storage/bunny/paths";
import { storageCdnUrl } from "@/lib/storage/bunny/urls";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 25 MB, come il tetto dichiarato oggi in AudioUpload. */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * Firma una PUT diretta browser → Bunny Storage per una traccia audio.
 *
 * PERCHÉ ESISTE.
 * Il body di una funzione Vercel si ferma a 4,5 MB: è un limite di piattaforma,
 * invalicabile. `/api/upload` dichiara 25 MB per l'audio, ma qualunque file
 * sopra i 4,5 MB riceve OGGI un 413 dalla piattaforma prima ancora di
 * raggiungere il nostro codice — cioè un normale MP3 di cinque minuti non è mai
 * arrivato. Questa rotta firma e non trasporta, esattamente come fa
 * /api/upload/video.
 *
 * I GATE SONO GLI STESSI, NELLO STESSO ORDINE di /api/upload/video: sessione,
 * freno di frequenza, dimensione, formato, proprietà dell'artista, tetto di
 * piano. L'unica differenza è cosa viene firmato alla fine.
 *
 * ⚠️ LA CHIAVE LA SCEGLIE IL SERVER. L'URL firmato autorizza la scrittura su
 * QUEL SOLO percorso: il client non può sovrascrivere un file che non è suo. È
 * l'invariante di sicurezza di questo percorso, l'equivalente del prefisso
 * `user.id` usato sui bucket Supabase.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  if (!(await allowByIp(LIMITI.uploadAutenticato))) {
    return NextResponse.json(
      { error: "Troppi caricamenti ravvicinati. Attendi qualche minuto e riprova." },
      { status: 429 }
    );
  }

  // A interruttore spento non c'è niente da firmare: il client ricade sulla
  // POST multipart di /api/upload, cioè sul comportamento di sempre.
  if (!bunnyUploadsEnabled()) {
    return NextResponse.json({ uploadKind: "vercel-proxy" as const });
  }

  let body: { artistId?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { artistId, contentType, size } = body;
  if (!artistId || !contentType || typeof size !== "number") {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  if (size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio troppo grande (max 25MB)" }, { status: 413 });
  }
  const ext = audioExtForMime(contentType);
  if (!ext) {
    return NextResponse.json(
      { error: "Formato audio non supportato (MP3, WAV, M4A, AAC, OGG o FLAC)." },
      { status: 415 }
    );
  }

  const admin = createAdminClient();

  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id, audio_files")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist) {
    return NextResponse.json({ error: "Artista non trovato" }, { status: 404 });
  }
  if (artist.user_id !== user.id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  // Il conteggio va derivato da una lettura di cui si è verificata la forma: se
  // `audio_files` non fosse un array, un `?? []` a valle farebbe passare per
  // "zero tracce" un profilo che ne ha, aprendo il gate del piano.
  const current = Array.isArray(artist.audio_files) ? artist.audio_files.length : 0;
  const ent = await getEntitlements(artistId);
  const audioCheck = checkCollectionLimit(ent, "audio", current, current + 1);
  if (!audioCheck.ok) {
    return NextResponse.json({ error: audioCheck.error }, { status: 409 });
  }

  const key = mediaKey({ scope: "artists", ownerId: artistId, kind: "audio", ext });

  try {
    const signed = presignPut({ key, contentType });
    return NextResponse.json({
      uploadKind: "bunny-presigned" as const,
      uploadUrl: signed.uploadUrl,
      headers: signed.headers,
      publicUrl: storageCdnUrl(key),
      expiresAt: signed.expiresAt,
    });
  } catch (e) {
    logger.error("api/upload/audio/sign", "presign fallita", e);
    return NextResponse.json({ error: "Impossibile avviare il caricamento" }, { status: 500 });
  }
}
