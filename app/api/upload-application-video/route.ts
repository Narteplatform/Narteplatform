import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Caricamento del video allegato alla candidatura artista.
 *
 * QUESTA ROTTA È PUBBLICA PER NECESSITÀ: il modulo di candidatura
 * (`app/(public)/candidatura-artista/`) si compila senza account — è il primo
 * contatto con la piattaforma, chiedere una registrazione prima ucciderebbe le
 * candidature. Quindi non si può pretendere autenticazione.
 *
 * Il che la rendeva, prima di questa versione, il punto più esposto del
 * progetto: nessun login, nessun limite di frequenza, nessuna verifica reale
 * del contenuto. Chiunque poteva riempire lo Storage Supabase — a nostre spese,
 * su un piano con 1 GB totale — con uno script di tre righe.
 *
 * Le quattro difese aggiunte, in ordine di costo crescente per chi attacca:
 *
 *  1. LIMITE DI FREQUENZA per IP pseudonimizzato, applicato PRIMA di leggere il
 *     corpo della richiesta. È il controllo più importante: senza, tutto il
 *     resto si paga comunque in banda e memoria.
 *  2. CONTROLLO DELLA DIMENSIONE DICHIARATA via `Content-Length`, sempre prima
 *     di leggere. Rifiutare 200 MB dopo averli caricati in memoria è inutile.
 *  3. TIPO DICHIARATO, come prima.
 *  4. FIRMA REALE DEL FILE: si ispezionano i primi byte. Un `.mp4` rinominato
 *     che in realtà è uno zip o un eseguibile viene rifiutato qui, mentre il
 *     controllo sul solo `file.type` — che arriva dal client — lo lasciava
 *     passare.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "application-videos";
const VIDEO_MIME = /^video\/(mp4|webm|quicktime)$/;
const VIDEO_MAX = 50 * 1024 * 1024; // 50MB

/**
 * Riconosce un contenitore video dai primi byte.
 *
 * - MP4 e MOV (ISO Base Media): i byte 4-8 sono l'ascii "ftyp".
 * - WebM (Matroska): il file inizia con 1A 45 DF A3.
 *
 * Non è un'analisi completa del formato — per quella servirebbe un decoder —
 * ma alza di molto il costo di caricare qualcosa che video non è.
 */
function sembraVideo(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  const ftyp =
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  if (ftyp) return true;

  const matroska =
    bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return matroska;
}

export async function POST(request: Request) {
  // (1) Il freno viene per primo: fermare qui costa una query, fermare dopo
  // costa l'intero trasferimento.
  if (!(await allowByIp(LIMITI.uploadPubblico))) {
    logger.warn("upload-application-video", "limite di frequenza superato");
    return NextResponse.json(
      {
        error:
          "Hai caricato troppi video di seguito. Riprova fra un'ora, oppure scrivici dalla pagina contatti.",
      },
      { status: 429 }
    );
  }

  // (2) Dimensione dichiarata, prima di toccare il corpo. `Content-Length`
  // comprende anche l'involucro del multipart, quindi si concede un margine.
  const dichiarata = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(dichiarata) && dichiarata > VIDEO_MAX + 1024 * 1024) {
    return NextResponse.json({ error: "Video troppo grande (max 50MB)" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData non valido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }

  // (3) Tipo dichiarato dal client.
  if (!VIDEO_MIME.test(file.type)) {
    return NextResponse.json(
      { error: "Formato video non supportato (solo mp4/webm/mov)" },
      { status: 415 }
    );
  }

  if (file.size > VIDEO_MAX) {
    return NextResponse.json({ error: "Video troppo grande (max 50MB)" }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();

  // (4) Firma reale del file: qui il tipo dichiarato non conta più.
  if (!sembraVideo(new Uint8Array(arrayBuffer.slice(0, 16)))) {
    logger.warn("upload-application-video", "file rifiutato: firma non video", {
      dichiarato: file.type,
      bytes: file.size,
    });
    return NextResponse.json(
      { error: "Il file non sembra un video. Carica un mp4, webm o mov." },
      { status: 415 }
    );
  }

  const ext =
    (file.type.split("/")[1] ?? "mp4").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";

  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]/gi, "_")
    .slice(0, 40);

  const path = `applications/${crypto.randomUUID()}-${safeName}.${ext}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) {
    logger.error("upload-application-video", "upload fallito", upErr.message);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({
    url: pub.publicUrl,
    path,
    bucket: BUCKET,
    name: file.name,
    size: file.size,
    contentType: file.type,
  });
}
