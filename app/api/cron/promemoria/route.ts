import { NextResponse } from "next/server";
import { inviaPromemoria } from "@/lib/reminders/promemoria";
import { logger } from "@/lib/logger";
import { eseguiCron } from "@/lib/cron/esegui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Promemoria giornalieri: evento di domani (artista e organizzatore), invito a
 * recensire l'evento di ieri (organizzatore), consulenza di domani.
 *
 * Gira una volta al giorno (vercel.json, 07:00 UTC = 08:00/09:00 a Roma).
 * Autenticazione come le altre rotte cron: `Authorization: Bearer $CRON_SECRET`,
 * e senza segreto configurato non si passa.
 *
 * `?dry=1` calcola cosa partirebbe e lo restituisce SENZA inviare né scrivere
 * nulla (indirizzi mascherati). La logica anti-doppione sta in
 * lib/reminders/promemoria.ts.
 *
 * Avvisi: `eseguiCron` avvisa il root (max una volta al giorno) se la rotta
 * fallisce o se risponde `ok: false`, cioè quando una lettura non è riuscita
 * (`errori`) o un invio è fallito (`falliti`): in quei casi qualcuno può non
 * aver ricevuto il promemoria. I saltati per chiave non attiva non contano.
 */
export async function GET(req: Request) {
  return eseguiCron("promemoria", () => gestisci(req));
}

async function gestisci(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const riepilogo = await inviaPromemoria({ dry });
    logger.warn(
      "promemoria",
      `${dry ? "DRY " : ""}inviati ${riepilogo.inviati}, da inviare ${riepilogo.daInviare}, già inviati ${riepilogo.giaInviati}, saltati ${riepilogo.saltati}, falliti ${riepilogo.falliti}, errori ${riepilogo.errori.length}`
    );
    const ok = riepilogo.errori.length === 0 && riepilogo.falliti === 0;
    return NextResponse.json(
      {
        ...riepilogo,
        ok,
        ...(ok ? {} : { error: [...riepilogo.errori, ...(riepilogo.falliti > 0 ? [`${riepilogo.falliti} invii falliti`] : [])].join(" | ") }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const messaggio = e instanceof Error ? e.message : String(e);
    logger.error("promemoria", messaggio);
    return NextResponse.json({ ok: false, error: `Errore interno: ${messaggio}` }, { status: 500 });
  }
}
