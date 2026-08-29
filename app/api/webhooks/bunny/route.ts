import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { bunnyStreamConfig } from "@/lib/storage/bunny/config";
import { verifyStreamWebhook } from "@/lib/storage/bunny/stream";
import { findVideoByGuid, reconcileBunnyVideo } from "@/lib/artist/video-status";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook di Bunny Stream: notifica i cambi di stato di un video.
 *
 * Modellato su app/api/stripe/webhook/route.ts, che nel progetto è già il
 * riferimento corretto per questa forma di endpoint.
 *
 * ⚠️ L'ORDINE NON È NEGOZIABILE. Il corpo va letto GREZZO con `request.text()`
 * prima di qualsiasi parsing: un `request.json()` seguito da `JSON.stringify`
 * produce byte diversi da quelli firmati e la verifica non tornerà mai.
 *
 * IDEMPOTENTE PER COSTRUZIONE. Non serve una tabella di eventi come per Stripe:
 * questo endpoint non applica il payload, lo usa solo come innesco per
 * rileggere lo stato autorevole da Bunny. Ricevere due volte lo stesso evento,
 * o riceverli fuori ordine, non cambia il risultato.
 */
export async function POST(request: Request) {
  // Corpo GREZZO, prima di tutto.
  const raw = await request.text();
  const signature = request.headers.get("x-bunnystream-signature");

  let libraryId: string;
  let valid = false;
  try {
    libraryId = bunnyStreamConfig().libraryId;
    valid = verifyStreamWebhook(raw, signature);
  } catch (e) {
    // Fallire CHIUSO: senza la chiave non si può distinguere un webhook
    // autentico da uno inventato, e un webhook non autenticato potrebbe
    // marcare "pronto" un video mai caricato.
    logger.error("webhooks/bunny", "configurazione mancante", e);
    return NextResponse.json({ error: "Webhook non configurato" }, { status: 500 });
  }

  if (!valid) {
    logger.warn("webhooks/bunny", "firma non valida");
    return NextResponse.json({ error: "Firma non valida" }, { status: 401 });
  }

  let payload: { VideoLibraryId?: number; VideoGuid?: string; Status?: number };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  // Un webhook di un'altra library non è un errore nostro, è rumore.
  if (Number(payload.VideoLibraryId) !== Number(libraryId)) {
    return NextResponse.json({ received: true, ignored: "library" });
  }

  const guid = payload.VideoGuid;
  if (!guid) {
    return NextResponse.json({ received: true, ignored: "no-guid" });
  }

  const row = await findVideoByGuid(guid);
  if (!row) {
    // Riga cancellata nel frattempo. Si risponde 200, non 404: un 4xx farebbe
    // ritentare Bunny all'infinito su qualcosa che non tornerà più.
    return NextResponse.json({ received: true, ignored: "unknown-video" });
  }

  // Non si applica `payload.Status`: si rilegge lo stato autorevole. Gli stati
  // di Bunny non sono una scala monotona (il 4 precede il 3, il 9 e il 10
  // arrivano dopo), quindi fidarsi del numero ricevuto è proprio il modo di
  // sbagliare. La logica sta tutta in reconcileBunnyVideo.
  const updated = await reconcileBunnyVideo(row);
  if (!updated) {
    return NextResponse.json({ received: true, changed: false });
  }

  revalidatePath("/dashboard/profilo-artista");
  revalidatePath("/artisti");
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("slug")
    .eq("id", row.artist_id)
    .maybeSingle();
  if (artist?.slug) revalidatePath(`/artisti/${artist.slug}`);

  return NextResponse.json({ received: true, changed: true });
}
