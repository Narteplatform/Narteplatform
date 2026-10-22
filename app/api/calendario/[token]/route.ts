import { NextResponse } from "next/server";
import { feedDaToken } from "@/lib/calendar/feed";
import { generaIcs } from "@/lib/calendar/ics";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Calendario iCal personale (date confermate), letto da Google Calendar,
 * Apple Calendar o Outlook ogni qualche ora. Nessuna sessione: l'accesso è il
 * token segreto nel percorso (vedi lib/calendar/feed.ts).
 *
 * Un errore di lettura risponde 503 e non un calendario vuoto: Google
 * conserva l'ultima versione buona invece di cancellare le date.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pulito = token.replace(/\.ics$/i, "");

  try {
    const feed = await feedDaToken(pulito);
    if (!feed) return new NextResponse("Calendario non trovato", { status: 404 });
    return new NextResponse(generaIcs(feed.nome, feed.eventi), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="narte.ics"',
        "Cache-Control": "private, max-age=900",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    logger.error("calendario", "feed non generato:", e instanceof Error ? e.message : String(e));
    return new NextResponse("Calendario momentaneamente non disponibile", {
      status: 503,
      headers: { "Retry-After": "900" },
    });
  }
}
