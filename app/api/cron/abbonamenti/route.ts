import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { avvisaRoot, trovaRoot } from "@/lib/admin/root";
import { isStripeConfigured } from "@/lib/stripe/client";
import { riconciliaAbbonamenti, riprendiEventi } from "@/lib/billing/riconciliazione";
import { inviaAvvisiSospensione, ricalcolaPianiScaduti } from "@/lib/billing/scadenze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Abbonamenti, ogni notte:
 *   a) riconciliazione del ledger con Stripe (abbonamenti vivi o con il
 *      periodo già finito), con la stessa scrittura del webhook;
 *   b) ripresa degli eventi del webhook rimasti a metà da più di 15 minuti;
 *   c) ricalcolo della cache dei piani scaduti (omaggi, premi inviti) e delle
 *      sospensioni dei profili, con l'email `profiles_suspended`;
 *   d) riepilogo al root se c'è qualcosa da sapere.
 *
 * Idempotente e con un tetto di elementi per esecuzione. Non annulla, non
 * rimborsa, non declassa per ipotesi: legge Stripe e riallinea il ledger.
 */
function autorizzato(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!autorizzato(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const stripeOk = isStripeConfigured();
  const riconciliazione = stripeOk
    ? await riconciliaAbbonamenti(60)
    : { controllati: 0, discrepanze: [], mancanti: [], errori: [] as string[] };
  const ripresa = stripeOk ? await riprendiEventi(25) : { ripresi: 0, abbandonati: [], errori: [] as string[] };
  const ricalcolo = await ricalcolaPianiScaduti(200);
  const sospensioni = await inviaAvvisiSospensione({ giorni: 3 });

  if (riconciliazione.discrepanze.length > 0 || (ricalcolo.ok && ricalcolo.account > 0)) {
    revalidatePath("/dashboard/abbonamento");
    revalidatePath("/dashboard/profili");
    revalidatePath("/artisti");
  }

  const righe: string[] = [];
  if (riconciliazione.discrepanze.length > 0) {
    righe.push(
      "Abbonamenti corretti dalla riconciliazione (il webhook non li aveva aggiornati):",
      ...riconciliazione.discrepanze.map((d) => `- ${d}`),
      "",
    );
  }
  if (riconciliazione.mancanti.length > 0) {
    righe.push(
      "Abbonamenti del ledger INESISTENTI su Stripe (non declassati né cancellati: verificare a mano):",
      ...riconciliazione.mancanti.map((d) => `- ${d}`),
      "",
    );
  }
  if (ripresa.abbandonati.length > 0) {
    righe.push(
      "Eventi Stripe non elaborati per 7 giorni, chiusi senza effetto (verificare a mano):",
      ...ripresa.abbandonati.map((d) => `- ${d}`),
      "",
    );
  }
  const errori = [
    ...riconciliazione.errori,
    ...ripresa.errori,
    ...(ricalcolo.ok ? [] : [`Ricalcolo dei piani non eseguito: ${ricalcolo.error}`]),
  ];
  if (errori.length > 0) righe.push("Errori:", ...errori.map((e) => `- ${e}`), "");
  if (ricalcolo.ok && ricalcolo.via === "inviti") {
    righe.push("Nota: migration 0082 non applicata, ricalcolo dei piani limitato alle ultime 48 ore e senza sospensioni.");
  }

  if (righe.length > 0) {
    const root = await trovaRoot();
    if (root) {
      await avvisaRoot(root, {
        kind: "abbonamenti_cron",
        titolo: "Abbonamenti: riepilogo della notte",
        testo: righe.join("\n").trim(),
        adminPath: "/admin/abbonamenti",
      });
    }
  }

  const riepilogo = {
    controllati: riconciliazione.controllati,
    discrepanze: riconciliazione.discrepanze.length,
    mancanti: riconciliazione.mancanti.length,
    eventiRipresi: ripresa.ripresi,
    eventiAbbandonati: ripresa.abbandonati.length,
    pianiRicalcolati: ricalcolo.ok ? ricalcolo.account : null,
    ricalcoloVia: ricalcolo.ok ? ricalcolo.via : null,
    avvisiSospensione: sospensioni,
    errori: errori.length,
  };
  logger.warn("cron/abbonamenti", JSON.stringify(riepilogo));
  return NextResponse.json({ ok: errori.length === 0, ...riepilogo });
}
