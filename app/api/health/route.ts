import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stato del servizio, per un monitor esterno (UptimeRobot, Better Stack…).
 *
 * PUBBLICA E MINIMALE: `{ ok, time, version }`. Nessun segreto, nessuna query,
 * nessuna informazione sull'ambiente: dice solo che il deploy risponde e quale
 * commit è online. Non va confusa con `/__health`, la pagina di diagnostica
 * riservata al root, che invece mostra le variabili configurate.
 *
 * `?deep=1` con `Authorization: Bearer <CRON_SECRET>` aggiunge una lettura
 * leggera sul DB (HEAD su `formats`, nessuna riga trasferita, nessuna
 * scrittura) e risponde 503 se fallisce: è il controllo che si accorge di
 * Supabase in pausa. Senza segreto valido `deep=1` risponde 401: la lettura
 * sul DB non è un servizio pubblico.
 */

const NO_STORE = { "Cache-Control": "no-store" };

function versione(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 12) : null;
}

export async function GET(req: Request) {
  const base = { time: new Date().toISOString(), version: versione() };
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) return NextResponse.json({ ok: true, ...base }, { headers: NO_STORE });

  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const inizio = Date.now();
  try {
    const { error } = await createAdminClient().from("formats").select("id", { head: true }).limit(1);
    const durataMs = Date.now() - inizio;
    if (error) {
      logger.error("health", `lettura DB fallita: ${error.message}`);
      return NextResponse.json(
        { ok: false, ...base, db: { ok: false, durataMs, error: error.message } },
        { status: 503, headers: NO_STORE }
      );
    }
    return NextResponse.json({ ok: true, ...base, db: { ok: true, durataMs } }, { headers: NO_STORE });
  } catch (e) {
    const messaggio = e instanceof Error ? e.message : String(e);
    logger.error("health", `controllo DB non eseguito: ${messaggio}`);
    return NextResponse.json(
      { ok: false, ...base, db: { ok: false, durataMs: Date.now() - inizio, error: messaggio } },
      { status: 503, headers: NO_STORE }
    );
  }
}
