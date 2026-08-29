import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { bunnyUploadsEnabled } from "@/lib/storage/bunny/config";
import { putObject } from "@/lib/storage/bunny/storage";
import { videoPosterKey, videoPosterUrl } from "@/lib/storage/bunny/urls";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Un fotogramma JPEG ridimensionato nel browser: sta ampiamente sotto. */
const MAX_POSTER_BYTES = 1024 * 1024;

/**
 * Riceve il fotogramma estratto dal browser e lo salva su Bunny Storage.
 *
 * La chiave è DERIVATA dal guid del video (video-posters/{guid}.jpg), non
 * scelta dal client: chi carica non può scrivere altrove, e chi legge non ha
 * bisogno di una colonna in più per ritrovare il file.
 *
 * ⚠️ Il guid non viene creduto sulla parola: si controlla che esista una riga
 * `artist_videos` con quel guid e che sia dell'artista di chi sta chiedendo.
 * Senza, chiunque potrebbe sovrascrivere il poster del video di un altro.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  if (!(await allowByIp(LIMITI.uploadAutenticato))) {
    return NextResponse.json({ error: "Troppi caricamenti ravvicinati." }, { status: 429 });
  }

  if (!bunnyUploadsEnabled()) {
    return NextResponse.json({ skipped: "bunny-disabled" });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData non valido" }, { status: 400 });
  }

  const file = form.get("file");
  const guid = String(form.get("guid") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(guid)) {
    return NextResponse.json({ error: "Guid non valido" }, { status: 400 });
  }
  if (file.size > MAX_POSTER_BYTES) {
    return NextResponse.json({ error: "Poster troppo grande" }, { status: 413 });
  }
  if (file.type !== "image/jpeg") {
    return NextResponse.json({ error: "Formato poster non valido" }, { status: 415 });
  }

  const admin = createAdminClient();
  const { data: video } = await admin
    .from("artist_videos")
    .select("id, artist_id, artists!inner(user_id)")
    .eq("bunny_guid", guid)
    .maybeSingle();
  if (!video) return NextResponse.json({ error: "Video non trovato" }, { status: 404 });

  const owner = (video as unknown as { artists: { user_id: string | null } }).artists;
  if (owner?.user_id !== user.id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  try {
    await putObject({
      key: videoPosterKey(guid),
      body: await file.arrayBuffer(),
      contentType: "image/jpeg",
    });
  } catch (e) {
    // Un poster mancante non è un errore che valga la pena mostrare
    // all'artista: il video è già caricato e funzionante.
    logger.warn("api/upload/video/poster", "salvataggio poster fallito", e);
    return NextResponse.json({ skipped: "put-failed" });
  }

  return NextResponse.json({ url: videoPosterUrl(guid) });
}
