import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  ARTIST_VIDEO_BUCKET,
  MAX_VIDEO_BYTES,
  formatMb,
  isAllowedVideoMime,
} from "@/lib/upload/video-limits";
import { checkCollectionLimit, getEntitlements } from "@/lib/billing/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firma un upload video diretto browser → Supabase Storage.
 *
 * Il file NON passa da qui: questa richiesta è di poche centinaia di byte e
 * restituisce un signed upload URL verso <ref>.supabase.co, dove il browser fa
 * la PUT. È l'unico modo per superare il limite di ~4.5MB sul body delle Route
 * Handler di Vercel.
 *
 * Il signed URL è generato con service role (bypassa RLS), così l'unico gate è
 * qui: senza, servirebbe una policy INSERT sul bucket, che non può discriminare
 * il ruolo artista e aprirebbe la scrittura a ogni account registrato.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: { artistId?: string; fileName?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { artistId, fileName, contentType, size } = body;
  if (!artistId || !fileName || !contentType || typeof size !== "number") {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  if (size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `Video troppo grande (max ${formatMb(MAX_VIDEO_BYTES)})` },
      { status: 413 }
    );
  }
  if (!isAllowedVideoMime(contentType)) {
    return NextResponse.json(
      { error: "Formato video non supportato (solo MP4 e WebM)" },
      { status: 415 }
    );
  }

  const admin = createAdminClient();

  // Ownership: l'artista deve essere suo, oppure chi chiede è superadmin.
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
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

  // Il tetto va verificato anche qui: il client può essere aggirato, e senza
  // questo controllo il file finirebbe comunque nello storage a nostre spese.
  // Questa è la seconda porta d'ingresso dei video (l'altra è addArtistVideo):
  // qui si concede la signed URL, quindi il gate deve precedere l'upload, non
  // seguirlo.
  const ent = await getEntitlements(artistId);
  const { count } = await admin
    .from("artist_videos")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artistId);
  const videoCheck = checkCollectionLimit(ent, "video", count ?? 0, (count ?? 0) + 1);
  if (!videoCheck.ok) {
    return NextResponse.json({ error: videoCheck.error }, { status: 409 });
  }

  // Stesso schema di /api/upload: il prefisso user.id è l'invariante su cui si
  // basano sia deleteArtistVideo sia le policy owner-based di storage.
  const ext = contentType === "video/webm" ? "webm" : "mp4";
  const path = `${user.id}/${Date.now()}-artist-video.${ext}`;

  const { data, error } = await admin.storage
    .from(ARTIST_VIDEO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[api/upload/video] createSignedUploadUrl failed", error);
    return NextResponse.json(
      { error: error?.message ?? "Impossibile avviare il caricamento" },
      { status: 500 }
    );
  }

  const { data: pub } = admin.storage.from(ARTIST_VIDEO_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl: pub.publicUrl,
  });
}
