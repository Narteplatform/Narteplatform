import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conservazione dei dati — conteggio, e solo dopo cancellazione.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ ESISTE.
 * Oggi nessun dato viene mai cancellato. `email_log` conserva gli indirizzi
 * email in chiaro di chiunque abbia mai ricevuto una comunicazione, senza
 * scadenza; `stripe_webhook_events` conserva i messaggi integrali ricevuti da
 * Stripe; `rate_limits` ha una funzione di pulizia scritta e mai chiamata da
 * nessuno. L'informativa promette periodi di conservazione che nella pratica
 * non esistono: tutto è «per sempre».
 *
 * ⛔ PARTE IN SOLA CONTA, E NON È UNA PRUDENZA DI FACCIATA.
 * Con `RETENTION_ENFORCE` diverso da `1` questa rotta **legge e basta**:
 * conta quante righe supererebbero il periodo previsto e le scrive nei log.
 * Nient'altro. Serve a rispondere a una domanda che nessuno può rispondere a
 * priori — «quanto stiamo per cancellare?» — prima di autorizzare una
 * cancellazione su dati di produzione che non esiste modo di annullare.
 *
 * La procedura è: si lascia contare per qualche giorno, si guardano i numeri,
 * si decide se i periodi sono quelli giusti, e SOLO allora si mette
 * `RETENTION_ENFORCE=1`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * I PERIODI NON SONO ANCORA APPROVATI. Sono la proposta scritta in
 * docs/REGISTRO_TRATTAMENTI.md, in attesa della revisione dell'avvocato.
 * Cambiarli qui è cambiare una riga, ma vanno cambiati lì per primi: il
 * documento è quello che fa fede verso l'esterno.
 */

/** Solo tabelle che esistono davvero: un refuso qui non deve compilare. */
type Tabella = keyof Database["public"]["Tables"];

type Regola = {
  tabella: Tabella;
  /** Colonna con la data su cui misurare l'età della riga. */
  colonnaData: string;
  giorni: number;
  /** Perché questo periodo e non un altro. */
  motivo: string;
};

const REGOLE: Regola[] = [
  {
    tabella: "email_log",
    colonnaData: "sent_at",
    giorni: 365,
    motivo: "diagnostica degli invii; contiene indirizzi email in chiaro",
  },
  {
    tabella: "stripe_webhook_events",
    colonnaData: "received_at",
    giorni: 730,
    motivo: "messaggi integrali di Stripe, possono contenere nome ed email",
  },
  {
    tabella: "artist_profile_views",
    colonnaData: "viewed_on",
    giorni: 425,
    motivo: "statistiche del piano Max: serve l'ultimo anno più un margine",
  },
  {
    tabella: "contact_messages",
    colonnaData: "created_at",
    giorni: 730,
    motivo: "gestione della relazione commerciale",
  },
  {
    tabella: "leads",
    colonnaData: "created_at",
    giorni: 730,
    motivo: "gestione della relazione commerciale",
  },
  {
    tabella: "consultations",
    colonnaData: "created_at",
    giorni: 730,
    motivo: "richieste di consulenza, contengono testo libero sulle necessità",
  },
  {
    tabella: "artist_applications",
    colonnaData: "created_at",
    giorni: 365,
    motivo: "candidature non approvate, video inclusi",
  },
];

/**
 * `rate_limits` sta fuori dall'elenco, e non per dimenticanza.
 *
 * Ha già la sua funzione di pulizia — `rate_limits_prune(interval)`, scritta
 * nella migration 0048 e da allora mai chiamata da nessuno. Riscrivere qui la
 * stessa cancellazione significherebbe avere due modi di fare la stessa cosa,
 * destinati a divergere: si chiama quella.
 *
 * Non è conteggiabile in anticipo come le altre — la funzione cancella e
 * restituisce quante righe ha tolto — quindi in sola conta viene saltata.
 * Le sue righe sono pseudonimi tecnici con una settimana di vita: è la
 * categoria su cui c'è meno da decidere.
 */
const RATE_LIMITS_GIORNI = 7;

function autorizzato(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Diversamente dal keep-alive, qui SENZA segreto non si passa: quella rotta
  // fa solo letture innocue, questa può cancellare. Lasciarla aperta
  // significherebbe consegnare a chiunque un pulsante di cancellazione.
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!autorizzato(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cancella = process.env.RETENTION_ENFORCE === "1";
  const admin = createAdminClient();
  const esiti: Array<Record<string, unknown>> = [];

  for (const regola of REGOLE) {
    const soglia = new Date(Date.now() - regola.giorni * 86400_000).toISOString();

    const { count, error } = await admin
      .from(regola.tabella)
      .select("*", { count: "exact", head: true })
      .lt(regola.colonnaData, soglia);

    if (error) {
      // Una tabella o una colonna che non esiste è un errore di questa rotta,
      // non un motivo per fermare le altre. E soprattutto NON si cancella: un
      // conteggio fallito non autorizza niente.
      logger.error("retention", `${regola.tabella}: ${error.message}`);
      esiti.push({ tabella: regola.tabella, errore: error.message });
      continue;
    }

    const daRimuovere = count ?? 0;

    if (!cancella) {
      esiti.push({
        tabella: regola.tabella,
        oltre: `${regola.giorni} giorni`,
        righeCheSarebberoRimosse: daRimuovere,
        motivo: regola.motivo,
      });
      continue;
    }

    if (daRimuovere === 0) {
      esiti.push({ tabella: regola.tabella, rimosse: 0 });
      continue;
    }

    const { error: erroreCancella } = await admin
      .from(regola.tabella)
      .delete()
      .lt(regola.colonnaData, soglia);

    if (erroreCancella) {
      logger.error(
        "retention",
        `cancellazione ${regola.tabella} fallita: ${erroreCancella.message}`
      );
      esiti.push({ tabella: regola.tabella, errore: erroreCancella.message });
      continue;
    }

    logger.warn("retention", `${regola.tabella}: rimosse ${daRimuovere} righe oltre ${regola.giorni} giorni`);
    esiti.push({ tabella: regola.tabella, rimosse: daRimuovere });
  }

  // Il limitatore di frequenza, con la sua funzione dedicata.
  if (cancella) {
    const { data, error } = await admin.rpc("rate_limits_prune", {
      p_older_than: `${RATE_LIMITS_GIORNI} days`,
    });
    if (error) {
      logger.error("retention", `rate_limits_prune fallita: ${error.message}`);
      esiti.push({ tabella: "rate_limits", errore: error.message });
    } else {
      esiti.push({ tabella: "rate_limits", rimosse: data ?? 0 });
    }
  } else {
    esiti.push({
      tabella: "rate_limits",
      nota: `pulita da rate_limits_prune(${RATE_LIMITS_GIORNI} giorni) quando la cancellazione è attiva; non conteggiabile in anticipo`,
    });
  }

  const totale = esiti.reduce(
    (n, e) => n + Number(e.righeCheSarebberoRimosse ?? e.rimosse ?? 0),
    0
  );

  // In sola conta il riepilogo va nei log anche quando è tutto a zero: serve a
  // sapere che il lavoro è girato, non solo che aveva qualcosa da fare.
  logger.warn(
    "retention",
    `${cancella ? "CANCELLAZIONE ATTIVA" : "sola conta"} — ${totale} righe complessive oltre i periodi previsti`
  );

  return NextResponse.json(
    {
      ok: true,
      modalita: cancella ? "cancellazione" : "sola-conta",
      eseguitoIl: new Date().toISOString(),
      totale,
      dettaglio: esiti,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
