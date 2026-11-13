import "server-only";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { creaNotifica } from "@/lib/notifications";
import { trovaRoot } from "@/lib/admin/root";
import { getSiteUrl } from "@/lib/site-url";
import { dataRoma } from "@/lib/date/roma";
import { logger } from "@/lib/logger";

/**
 * Esecuzione dei cron con avviso al root in caso di fallimento.
 *
 * PERCHÉ. Un cron che fallisce su Vercel compare in rosso in una pagina che
 * nessuno apre: i promemoria non partono, il keep-alive non tiene sveglio
 * Supabase, la conservazione non gira, e lo si scopre settimane dopo. Qui il
 * fallimento diventa un avviso al root (notifica in-app + email), lo stesso
 * canale di `avvisaRoot` (lib/admin/root.ts): chiave `contact_message`, nessun
 * template nuovo su Brevo.
 *
 * COSA CONTA COME FALLIMENTO
 *  - un'eccezione non gestita nel corpo del cron (la rotta risponde 500);
 *  - una risposta non 2xx, TRANNE 401: una chiamata senza segreto è di chi
 *    bussa da fuori, e lasciarla avvisare permetterebbe a chiunque di
 *    consumare l'avviso del giorno e coprire un fallimento vero;
 *  - una risposta 2xx con JSON `{ ok: false }` (fallimento parziale: il corpo
 *    ha finito ma qualcosa non è andato). Il motivo si legge da `error` o
 *    `errori`, se presenti.
 *
 * ANTI-SPAM: al massimo un avviso per cron per giorno (di Roma).
 *  1. memoria del processo, per le chiamate ripetute sulla stessa istanza;
 *  2. `email_log`: una riga `sent` con meta `{ avviso: "cron_fallito", cron,
 *     giorno }` vuol dire che l'avviso di oggi è già partito.
 * Se `email_log` non è leggibile (DB in pausa: proprio il caso del keep-alive)
 * si invia lo stesso: un avviso in più è meglio di un fallimento muto, e i
 * cron girano una volta al giorno.
 *
 * Se il root non è identificabile (DB irraggiungibile) l'email va comunque a
 * SUPERADMIN_EMAIL; manca solo la notifica in-app, che vive nel DB.
 *
 * Tutto qui è best-effort: l'avviso non solleva mai e non cambia la risposta
 * del cron.
 */

const GIA_AVVISATI = new Map<string, string>();

type Motivo = { status: number; dettaglio: string };

/**
 * Esegue il corpo di un cron. Uso:
 *
 *   export async function GET(req: Request) {
 *     return eseguiCron("retention", () => gestisci(req));
 *   }
 */
export async function eseguiCron(nome: string, corpo: () => Promise<Response>): Promise<Response> {
  const inizio = Date.now();
  let risposta: Response;
  try {
    risposta = await corpo();
  } catch (e) {
    const messaggio = e instanceof Error ? e.message : String(e);
    logger.error("cron", JSON.stringify({ cron: nome, esito: "eccezione", durataMs: Date.now() - inizio, errore: messaggio }));
    await avvisaFallimentoCron(nome, { status: 500, dettaglio: `Eccezione non gestita: ${messaggio}` });
    return NextResponse.json(
      { ok: false, error: "Errore interno" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const motivo = await motivoFallimento(risposta);
  if (motivo) {
    logger.error(
      "cron",
      JSON.stringify({ cron: nome, esito: "fallito", status: motivo.status, durataMs: Date.now() - inizio, errore: motivo.dettaglio })
    );
    await avvisaFallimentoCron(nome, motivo);
  }
  return risposta;
}

async function motivoFallimento(risposta: Response): Promise<Motivo | null> {
  if (risposta.status === 401) return null;
  let corpo: unknown = null;
  try {
    corpo = await risposta.clone().json();
  } catch {
    corpo = null;
  }
  const oggetto = corpo && typeof corpo === "object" ? (corpo as Record<string, unknown>) : null;
  const okFalse = oggetto?.ok === false;
  if (risposta.ok && !okFalse) return null;

  let dettaglio = "";
  if (typeof oggetto?.error === "string") dettaglio = oggetto.error;
  else if (Array.isArray(oggetto?.errori)) dettaglio = oggetto.errori.filter((x) => typeof x === "string").join(" | ");
  else if (Array.isArray(oggetto?.failures)) dettaglio = oggetto.failures.filter((x) => typeof x === "string").join(" | ");
  if (!dettaglio) dettaglio = risposta.ok ? "risposta con ok: false" : `risposta HTTP ${risposta.status}`;
  return { status: risposta.status, dettaglio: dettaglio.slice(0, 1500) };
}

/**
 * Avvisa il root che il cron `nome` è fallito, al massimo una volta al giorno.
 * Esportata per i casi in cui il cron vuole avvisare senza passare da
 * `eseguiCron` (non solleva mai).
 */
export async function avvisaFallimentoCron(nome: string, motivo: Motivo): Promise<void> {
  try {
    const giorno = dataRoma(new Date());
    if (GIA_AVVISATI.get(nome) === giorno) return;

    const meta = { avviso: "cron_fallito", cron: nome, giorno };
    const { count, error } = await createAdminClient()
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("template", "contact_message")
      .eq("status", "sent")
      .contains("meta", meta);
    if (error) {
      logger.warn("cron", `email_log non leggibile, l'avviso per «${nome}» parte comunque: ${error.message}`);
    } else if ((count ?? 0) > 0) {
      GIA_AVVISATI.set(nome, giorno);
      return;
    }
    GIA_AVVISATI.set(nome, giorno);

    const root = await trovaRoot().catch(() => null);
    const destinatario = root?.email ?? (process.env.SUPERADMIN_EMAIL ?? "").trim();
    if (!destinatario) {
      logger.error("cron", `avviso per «${nome}» non inviabile: SUPERADMIN_EMAIL non impostata`);
      return;
    }

    const titolo = `Cron «${nome}» non riuscito`;
    const adminPath = "/admin";
    const testo = [
      `Il processo automatico «${nome}» non è andato a buon fine (${giorno}, HTTP ${motivo.status}).`,
      "",
      motivo.dettaglio,
      "",
      "Cosa fare: aprire i log della funzione su Vercel (Deployments → Functions → /api/…)",
      "e seguire docs/OPERATIVITA.md, sezione «Se un cron fallisce».",
      "Questo avviso parte al massimo una volta al giorno per ciascun processo.",
    ].join("\n");

    const esiti = await Promise.allSettled([
      root
        ? creaNotifica({ userId: root.id, kind: "cron_fallito", title: titolo, body: testo.slice(0, 300), href: adminPath })
        : Promise.resolve(),
      dispatchEmail({
        key: "contact_message",
        to: destinatario,
        params: {
          name: "N'arte — processo automatico",
          email: "",
          subject: titolo,
          message: testo,
          adminUrl: `${getSiteUrl()}${adminPath}`,
        },
        subjectPreview: titolo,
        meta,
      }),
    ]);
    for (const e of esiti) {
      if (e.status === "rejected") logger.warn("cron", `avviso per «${nome}» non riuscito:`, String(e.reason));
    }
  } catch (e) {
    logger.error("cron", `avviso per «${nome}» non riuscito:`, e instanceof Error ? e.message : String(e));
  }
}
