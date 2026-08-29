import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { bunnyUploadsEnabled } from "@/lib/storage/bunny/config";
import { createStreamVideo, signTusUpload } from "@/lib/storage/bunny/stream";
import { streamEmbedUrl } from "@/lib/storage/bunny/urls";
import { videoLimitsFor } from "@/lib/upload/video-limits";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firma un upload video su Bunny Stream per i contenuti che NON sono video
 * dell'artista: eventi, format e video di candidatura.
 *
 * I video artista hanno una rotta propria (/api/upload/video) perché hanno
 * anche una tabella propria, un tetto di piano e una nozione di proprietà. Qui
 * niente di tutto ciò: il risultato è un URL di embed che il chiamante salva
 * dentro un array di testo (`events.videos`, `formats.videos`) o in una colonna
 * (`artist_applications.video_url`).
 *
 * PERCHÉ ANCHE QUESTI PASSANO DA BUNNY. Oggi vanno su Supabase attraverso una
 * funzione Vercel, il cui body si ferma a 4,5 MB: `/api/upload` dichiara 50 MB
 * per i video di evento e `/api/upload-application-video` altrettanto, ma
 * qualunque file più pesante riceve un 413 dalla piattaforma prima di arrivare
 * al nostro codice. Sono percorsi che, sopra quella soglia, non hanno mai
 * funzionato.
 */

const KINDS = ["event-video", "format-video", "application-video"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Il video di candidatura ha un tetto più basso degli altri, e non è una
 * distinzione estetica: quella rotta è PUBBLICA e non autenticata. Il freno di
 * frequenza limita a 3 tentativi l'ora per IP, quindi il costo massimo che uno
 * script può farci sostenere è questo numero moltiplicato per tre.
 */
const MAX_BYTES: Record<Kind, number> = {
  "event-video": 500 * 1024 * 1024,
  "format-video": 500 * 1024 * 1024,
  "application-video": 200 * 1024 * 1024,
};

export async function POST(request: Request) {
  let body: { kind?: string; fileName?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const kind = body.kind as Kind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Kind non valido" }, { status: 400 });
  }

  const isPublic = kind === "application-video";

  // ⚠️ Il freno di frequenza è il PRIMO controllo sulla rotta pubblica, prima
  // di qualunque lavoro: è la stessa scelta di /api/upload-application-video.
  const limite = isPublic ? LIMITI.uploadPubblico : LIMITI.uploadAutenticato;
  if (!(await allowByIp(limite))) {
    return NextResponse.json(
      { error: "Troppi caricamenti ravvicinati. Attendi qualche minuto e riprova." },
      { status: 429 }
    );
  }

  // Eventi e format sono contenuti editoriali: appaiono sul sito pubblico a
  // nome di N'arte, non del singolo utente. Serve il ruolo, non la sola
  // sessione — stessa regola di KIND_SOLO_ADMIN in /api/upload.
  if (!isPublic) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
  }

  // A interruttore spento il client ricade sul percorso di sempre.
  if (!bunnyUploadsEnabled()) {
    return NextResponse.json({ uploadKind: "vercel-proxy" as const });
  }

  const { fileName, contentType, size } = body;
  if (!fileName || !contentType || typeof size !== "number") {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const maxBytes = MAX_BYTES[kind];
  if (size > maxBytes) {
    return NextResponse.json(
      { error: `Video troppo grande (max ${Math.round(maxBytes / 1024 / 1024)}MB)` },
      { status: 413 }
    );
  }
  if (!videoLimitsFor("bunny").mime.includes(contentType)) {
    return NextResponse.json({ error: "Formato video non supportato" }, { status: 415 });
  }

  const title = `${kind} — ${fileName.replace(/\.[^.]+$/, "").slice(0, 100)}`;

  try {
    const { guid } = await createStreamVideo({ title });
    const tus = signTusUpload(guid);
    return NextResponse.json({
      uploadKind: "bunny-tus" as const,
      videoGuid: guid,
      libraryId: tus.libraryId,
      signature: tus.signature,
      expire: tus.expire,
      tusEndpoint: tus.endpoint,
      // È QUESTO che il chiamante salva. Il guid resta rileggibile dall'URL con
      // bunnyStreamGuidFromUrl, quindi non serve una colonna in più.
      embedUrl: streamEmbedUrl(guid),
    });
  } catch (e) {
    logger.error("api/upload/stream/sign", "creazione video fallita", e);
    return NextResponse.json({ error: "Impossibile avviare il caricamento" }, { status: 500 });
  }
}
