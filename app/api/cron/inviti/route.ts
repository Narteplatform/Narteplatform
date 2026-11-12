import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/server";
import { avvisaRoot, trovaRoot } from "@/lib/admin/root";
import { modalitaInviti } from "@/lib/inviti/modalita";
import { avvisaScadenzeVicine, confermaScaduti } from "@/lib/inviti/ciclo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * «Invita un artista», ogni giorno:
 *   1. conferma gli inviti passati i 14 giorni dal primo pagamento (premio,
 *      annullamento per recesso/rimborso, oltre il tetto annuale);
 *   2. ricalcola il piano degli account con un premio o un omaggio scaduto da
 *      poco (la cache artists.tier non scade da sola);
 *   3. avvisa chi ha il Pro dei premi in scadenza fra 3 giorni.
 *
 * Con INVITI_ATTIVI=conta il punto 1 decide e riferisce senza scrivere nulla.
 * Riepilogo al root quando c'è qualcosa da riferire.
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
  const modalita = modalitaInviti();
  if (modalita === "spento") return NextResponse.json({ ok: true, modalita, skipped: true });

  const conferme = await confermaScaduti();
  if (!conferme.ok) {
    logger.error("cron/inviti", "conferme non eseguite:", conferme.error);
  }

  // Il ricalcolo dei piani scaduti vale anche per gli omaggi: si fa in ogni
  // modalità diversa da spento, perché non assegna nulla, riallinea soltanto.
  let ricalcolati = 0;
  const { data: n, error: errSync } = await createAdminClient().rpc("inviti_sync_scaduti");
  if (errSync) logger.error("cron/inviti", "ricalcolo piani scaduti:", errSync.message);
  else ricalcolati = n ?? 0;

  const promemoria = modalita === "attivo" ? await avvisaScadenzeVicine() : 0;

  const righe = conferme.ok ? conferme.riepilogo.esiti : [`Conferme non eseguite: ${conferme.error}`];
  if (righe.length > 0) {
    const root = await trovaRoot();
    if (root) {
      const intestazione =
        modalita === "conta"
          ? "Modalità CONTA: nessun premio è stato scritto, né su N'arte né su Stripe."
          : "Premi del programma Invita un artista.";
      await avvisaRoot(root, {
        kind: "inviti_cron",
        titolo: "Invita un artista: riepilogo",
        testo: [intestazione, "", ...righe].join("\n"),
        adminPath: "/admin/abbonamenti",
      });
    }
  }

  const riepilogo = conferme.ok ? conferme.riepilogo : null;
  logger.warn("cron/inviti", JSON.stringify({ modalita, riepilogo, ricalcolati, promemoria }));
  return NextResponse.json({ ok: conferme.ok, modalita, riepilogo, ricalcolati, promemoria });
}
