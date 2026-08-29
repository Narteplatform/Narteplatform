import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ARTIST_VIDEO_BUCKET, formatMb, videoLimitsFor } from "@/lib/upload/video-limits";
import { checkCollectionLimit, getEntitlements } from "@/lib/billing/entitlements";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { bunnyUploadsEnabled } from "@/lib/storage/bunny/config";
import { createStreamVideo, deleteStreamVideo, signTusUpload } from "@/lib/storage/bunny/stream";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firma un upload video diretto dal browser, senza far transitare il file.
 *
 * Il file NON passa da qui: questa richiesta è di poche centinaia di byte. È
 * l'unico modo per superare il limite di 4,5 MB sul body delle Route Handler di
 * Vercel, che è un vincolo di piattaforma e non si aggira in nessun altro modo.
 *
 * Le credenziali sono generate lato server (service role su Supabase, API key
 * su Bunny), così l'UNICO gate è questo: senza, servirebbe una policy INSERT
 * sul bucket, che non può discriminare il ruolo artista e aprirebbe la
 * scrittura a ogni account registrato.
 *
 * DUE DESTINAZIONI, GLI STESSI GATE.
 * `BUNNY_UPLOADS_ENABLED` decide dove va il file; i controlli di sessione,
 * dimensione, formato, proprietà e piano sono identici nei due rami e restano
 * nell'ordine di sempre. È il server a decidere: il client riceve `uploadKind`
 * ed esegue.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Questa rotta non aveva alcun freno di frequenza, mentre /api/upload sì.
  // Con file da 500 MB la mancanza pesa di più: una firma concessa è un
  // trasferimento che paghiamo, anche se poi la riga non viene mai confermata.
  if (!(await allowByIp(LIMITI.uploadAutenticato))) {
    return NextResponse.json(
      { error: "Troppi caricamenti ravvicinati. Attendi qualche minuto e riprova." },
      { status: 429 }
    );
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

  const target = bunnyUploadsEnabled() ? "bunny" : "supabase";
  const limits = videoLimitsFor(target);

  if (size > limits.maxBytes) {
    return NextResponse.json(
      { error: `Video troppo grande (max ${formatMb(limits.maxBytes)})` },
      { status: 413 }
    );
  }
  if (!limits.mime.includes(contentType)) {
    // Il messaggio sta qui e non nel client perché solo il server sa quale
    // destinazione è attiva: su Bunny il .mov è perfettamente valido, ed è
    // proprio il caso che l'integrazione risolve.
    const error =
      contentType === "video/quicktime"
        ? "I file .mov non sono ancora supportati: usano quasi sempre il codec HEVC, che non si riproduce su Chrome, Firefox e Android. Esporta il video in MP4. Su iPhone: Impostazioni → Fotocamera → Formati → «Massima compatibilità»."
        : "Formato video non supportato (accettiamo MP4 e WebM).";
    return NextResponse.json({ error }, { status: 415 });
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
  // Il gate deve precedere l'upload, non seguirlo.
  const ent = await getEntitlements(artistId);
  const { count } = await admin
    .from("artist_videos")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artistId);
  const videoCheck = checkCollectionLimit(ent, "video", count ?? 0, (count ?? 0) + 1);
  if (!videoCheck.ok) {
    return NextResponse.json({ error: videoCheck.error }, { status: 409 });
  }

  const title = fileName.replace(/\.[^.]+$/, "").slice(0, 120) || "Video";

  // -------------------------------------------------------------------------
  // Ramo Bunny Stream
  // -------------------------------------------------------------------------
  if (target === "bunny") {
    const { guid } = await createStreamVideo({ title });

    // LA RIGA NASCE QUI, prima del trasferimento, e non dopo. Tre motivi:
    //  - il guid non torna dal client come token di fiducia: è già nostro, e
    //    non c'è nessun `startsWith` da inventare per validarlo;
    //  - il conteggio del piano diventa privo di corsa, perché lo slot è
    //    occupato nell'istante in cui viene concesso;
    //  - un upload abbandonato resta visibile e cancellabile invece di essere
    //    un video fantasma che paghiamo su Bunny senza saperlo.
    const { data: row, error } = await admin
      .from("artist_videos")
      .insert({
        artist_id: artistId,
        provider: "bunny",
        bunny_guid: guid,
        bunny_status: 0,
        playback_state: "processing",
        upload_state: "pending",
        title,
        size_bytes: size,
        mime_type: contentType,
        url: null,
        storage_path: null,
      })
      .select("id")
      .single();

    if (error || !row) {
      // Senza questa pulizia resterebbe su Bunny un video che nessuna riga
      // nomina: invisibile, incancellabile dall'interfaccia, e a pagamento.
      await deleteStreamVideo(guid).catch(() => undefined);
      logger.error("api/upload/video", "insert artist_videos fallito", error);
      return NextResponse.json(
        { error: error?.message ?? "Impossibile avviare il caricamento" },
        { status: 500 }
      );
    }

    // Al client vanno solo guid, libraryId, expire e signature.
    // La API key non lascia mai il server: è ciò che viene firmato, non ciò
    // che viene spedito.
    const tus = signTusUpload(guid);
    return NextResponse.json({
      uploadKind: "bunny-tus" as const,
      videoId: row.id,
      videoGuid: guid,
      libraryId: tus.libraryId,
      signature: tus.signature,
      expire: tus.expire,
      tusEndpoint: tus.endpoint,
      title,
    });
  }

  // -------------------------------------------------------------------------
  // Ramo Supabase Storage — il percorso di sempre, invariato
  // -------------------------------------------------------------------------
  // Il prefisso user.id è l'invariante su cui si basano sia deleteArtistVideo
  // sia le policy owner-based di storage.
  const ext = contentType === "video/webm" ? "webm" : "mp4";
  const path = `${user.id}/${Date.now()}-artist-video.${ext}`;

  const { data, error } = await admin.storage
    .from(ARTIST_VIDEO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    logger.error("api/upload/video", "createSignedUploadUrl fallita", error);
    return NextResponse.json(
      { error: error?.message ?? "Impossibile avviare il caricamento" },
      { status: 500 }
    );
  }

  const { data: pub } = admin.storage.from(ARTIST_VIDEO_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    uploadKind: "supabase-signed" as const,
    signedUrl: data.signedUrl,
    path,
    publicUrl: pub.publicUrl,
  });
}
