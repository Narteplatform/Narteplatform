import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { eseguiMisureScadute } from "@/lib/admin/preavviso";
import { avvisaRoot, trovaRoot } from "@/lib/admin/root";
import { eseguiCron } from "@/lib/cron/esegui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Esegue le sospensioni e chiusure programmate con 30 giorni di preavviso
 * (artisti con partita IVA, Reg. UE 2019/1150 art. 4) arrivate a scadenza.
 * Misure reversibili dal pannello: niente modalità di sola conta. Riepilogo al
 * root quando c'è qualcosa da riferire; un fallimento (eccezione o risposta
 * non 2xx) lo avvisa tramite `eseguiCron`, max una volta al giorno.
 */
function autorizzato(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  return eseguiCron("misure-programmate", () => gestisci(req));
}

async function gestisci(req: Request): Promise<Response> {
  if (!autorizzato(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const r = await eseguiMisureScadute();
  if (!r.ok) {
    logger.error("cron/misure-programmate", "lettura fallita, nessuna azione:", r.error);
    return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
  }
  if (r.esiti.length > 0) {
    const root = await trovaRoot();
    if (root) {
      await avvisaRoot(root, {
        kind: "misure_programmate",
        titolo: "Misure programmate eseguite",
        testo: r.esiti.join("\n"),
        adminPath: "/admin/utenti",
      });
    }
  }
  logger.warn("cron/misure-programmate", JSON.stringify(r.esiti));
  return NextResponse.json({ ok: true, esiti: r.esiti });
}
