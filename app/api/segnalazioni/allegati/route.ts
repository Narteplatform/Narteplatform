import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { allowByIp, LIMITI } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import {
  nomeSicuro,
  REPORT_BUCKET,
  REPORT_MAX_BYTES,
  REPORT_MIME,
} from "@/lib/security/report-attachments";

export const runtime = "nodejs";

/**
 * Firma il caricamento di UN allegato di una segnalazione.
 *
 * Il file non passa da qui: il corpo di una funzione Vercel si ferma a 4,5 MB.
 * Il server sceglie il percorso (provvisorio, `pending/…`) e restituisce un URL
 * firmato valido solo per quel percorso. All'invio della segnalazione la
 * server action controlla i byte veri del file e lo sposta sotto il
 * riferimento; quello che non supera il controllo viene cancellato.
 */
const schema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(REPORT_MIME),
  size: z.number().int().positive().max(REPORT_MAX_BYTES),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "File non ammesso: immagini (jpg, png, webp) o PDF fino a 5 MB." },
      { status: 400 },
    );
  }
  if (!(await allowByIp(LIMITI.segnalazioneAllegato))) {
    return NextResponse.json({ ok: false, error: "Troppi tentativi. Riprova fra un'ora." }, { status: 429 });
  }

  const path = `pending/${crypto.randomUUID()}-${nomeSicuro(parsed.data.name)}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(REPORT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    logger.warn("segnalazioni", "firma allegato non riuscita:", error?.message);
    return NextResponse.json(
      { ok: false, error: "Allegati temporaneamente non disponibili: invia la segnalazione senza, o descrivi il contenuto." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, path, token: data.token });
}
