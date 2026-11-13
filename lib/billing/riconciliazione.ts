import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { sincronizzaDaStripe } from "@/lib/stripe/sincronizza";
import { elaboraEvento, EVENTI_GESTITI, gestisciAnomaliaSync } from "@/lib/stripe/eventi";
import { chiudiEvento, prendiEvento, segnaErroreEvento } from "@/lib/stripe/coda";
import { funzioneAssente, rpcSenzaTipi } from "@/lib/billing/rpc";
import { logger } from "@/lib/logger";

/**
 * Riconciliazione del ledger con Stripe, ogni notte (/api/cron/abbonamenti).
 *
 * Il webhook è la strada principale, ma un evento può non arrivare mai
 * (endpoint giù per ore, evento non abilitato, errore che Stripe smette di
 * ritentare dopo 3 giorni). Senza questa passata, un abbonamento disdetto
 * resterebbe «active» nel ledger per sempre, o un pagamento riuscito non
 * attiverebbe mai il piano.
 *
 * Tutto passa dalla STESSA funzione di scrittura del webhook
 * (`sincronizzaDaStripe`). Niente si cancella e niente si declassa per
 * ipotesi: se Stripe dice che l'abbonamento non esiste, si annota e si avvisa.
 */

const AREA = "billing/riconciliazione";
const GIORNO_MS = 86_400_000;

type RigaLedger = {
  user_id: string;
  stripe_subscription_id: string;
  tier: string;
  billing_interval: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type EsitoRiconciliazione = {
  controllati: number;
  /** Righe che Stripe ha corretto: il webhook aveva perso qualcosa. */
  discrepanze: string[];
  /** Abbonamenti inesistenti su Stripe, annotati per la prima volta. */
  mancanti: string[];
  errori: string[];
};

const giorno = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export async function riconciliaAbbonamenti(limite = 60): Promise<EsitoRiconciliazione> {
  const esito: EsitoRiconciliazione = { controllati: 0, discrepanze: [], mancanti: [], errori: [] };
  const admin = createAdminClient();
  const colonne = "user_id, stripe_subscription_id, tier, billing_interval, status, current_period_end, cancel_at_period_end";

  // 1. Vivi (o in uno stato che può ancora cambiare), dai meno aggiornati:
  //    a rotazione, ogni notte un blocco diverso.
  // 2. Vivi con il periodo già finito: il caso più sospetto (rinnovo o
  //    cessazione mai arrivati), sempre in testa.
  const [rotazione, scaduti] = await Promise.all([
    admin
      .from("subscriptions")
      .select(colonne)
      .in("status", ["trialing", "active", "past_due", "incomplete", "unpaid", "paused"])
      .order("stripe_updated_at", { ascending: true, nullsFirst: true })
      .limit(limite),
    admin
      .from("subscriptions")
      .select(colonne)
      .in("status", ["trialing", "active", "past_due"])
      .lt("current_period_end", new Date(Date.now() - 3_600_000).toISOString())
      .order("current_period_end", { ascending: true })
      .limit(Math.ceil(limite / 2)),
  ]);
  if (rotazione.error || scaduti.error) {
    const m = rotazione.error?.message ?? scaduti.error?.message ?? "lettura fallita";
    logger.error(AREA, "ledger non leggibile:", m);
    esito.errori.push(`Ledger non leggibile: ${m}. Nessuna riconciliazione eseguita.`);
    return esito;
  }

  const righe = new Map<string, RigaLedger>();
  for (const r of [...(scaduti.data ?? []), ...(rotazione.data ?? [])] as RigaLedger[]) {
    if (!righe.has(r.stripe_subscription_id)) righe.set(r.stripe_subscription_id, r);
  }

  for (const prima of righe.values()) {
    esito.controllati++;
    try {
      const sync = await sincronizzaDaStripe(prima.stripe_subscription_id, [prima.user_id]);
      if (sync.esito === "ok") {
        const cambi: string[] = [];
        if (sync.status !== prima.status) cambi.push(`stato ${prima.status} → ${sync.status}`);
        if (sync.tier !== prima.tier) cambi.push(`piano ${prima.tier} → ${sync.tier}`);
        if (sync.interval !== prima.billing_interval) cambi.push(`periodicità ${prima.billing_interval} → ${sync.interval}`);
        if (sync.cancelAtPeriodEnd !== prima.cancel_at_period_end) {
          cambi.push(sync.cancelAtPeriodEnd ? "disdetta a fine periodo" : "disdetta revocata");
        }
        if (giorno(sync.currentPeriodEnd) !== giorno(prima.current_period_end)) {
          cambi.push(`fine periodo ${giorno(prima.current_period_end)} → ${giorno(sync.currentPeriodEnd)}`);
        }
        if (cambi.length > 0) esito.discrepanze.push(`${prima.stripe_subscription_id}: ${cambi.join(", ")}`);
        continue;
      }
      if (sync.esito === "mancante") {
        // Non si cancella e non si declassa: si annota (una volta) e si avvisa.
        const { data: nuova, error } = await rpcSenzaTipi<boolean>("abbonamenti_segna_mancante", {
          p_stripe_subscription_id: prima.stripe_subscription_id,
        });
        if (error && !funzioneAssente(error)) logger.warn(AREA, "annotazione non scritta:", error.message);
        if (nuova === true || error) {
          esito.mancanti.push(
            `${prima.stripe_subscription_id} (utente ${prima.user_id}, ${prima.tier}, «${prima.status}» nel ledger)`,
          );
        }
        continue;
      }
      await gestisciAnomaliaSync(sync, "riconciliazione notturna");
      esito.errori.push(`${prima.stripe_subscription_id}: ${sync.esito}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      logger.error(AREA, prima.stripe_subscription_id, m);
      esito.errori.push(`${prima.stripe_subscription_id}: ${m}`);
    }
  }
  return esito;
}

export type EsitoRipresa = { ripresi: number; abbandonati: string[]; errori: string[] };

/**
 * Eventi del webhook rimasti a metà (processed_at null) da più di 15 minuti:
 * si rieseguono con la stessa logica del webhook. Oltre i 7 giorni si chiudono
 * con una nota e si segnalano al root, invece di ritentarli per sempre.
 */
export async function riprendiEventi(limite = 25): Promise<EsitoRipresa> {
  const esito: EsitoRipresa = { ripresi: 0, abbandonati: [], errori: [] };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_webhook_events")
    .select("id, type, payload, received_at, error")
    .is("processed_at", null)
    .lt("received_at", new Date(Date.now() - 15 * 60_000).toISOString())
    .order("received_at", { ascending: true })
    .limit(limite);
  if (error) {
    logger.error(AREA, "coda eventi non leggibile:", error.message);
    esito.errori.push(`Coda eventi non leggibile: ${error.message}`);
    return esito;
  }

  for (const riga of data ?? []) {
    const etichetta = `${riga.id} (${riga.type})`;
    try {
      if (new Date(riga.received_at).getTime() < Date.now() - 7 * GIORNO_MS) {
        const presa = await prendiEvento(riga.id);
        if (presa === "occupata" || presa === "errore") continue;
        await chiudiEvento(riga.id, `abbandonato dopo 7 giorni: ${riga.error ?? "nessun errore annotato"}`.slice(0, 2000));
        esito.abbandonati.push(`${etichetta}: ${riga.error ?? "—"}`);
        continue;
      }
      const evento = riga.payload as unknown as Stripe.Event;
      if (!evento || typeof evento !== "object" || evento.id !== riga.id || !EVENTI_GESTITI.has(evento.type)) {
        const presa = await prendiEvento(riga.id);
        if (presa === "occupata" || presa === "errore") continue;
        await chiudiEvento(riga.id, "payload non valido o tipo non gestito: chiuso dal cron");
        esito.errori.push(`${etichetta}: payload non valido, chiuso`);
        continue;
      }

      const presa = await prendiEvento(riga.id);
      if (presa === "occupata") continue; // in lavorazione altrove, o appena chiuso
      if (presa === "errore") {
        esito.errori.push(`${etichetta}: presa in carico non riuscita`);
        continue;
      }
      try {
        const r = await elaboraEvento(evento);
        await chiudiEvento(riga.id, r.nota);
        esito.ripresi++;
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        await segnaErroreEvento(riga.id, m);
        esito.errori.push(`${etichetta}: ${m}`);
      }
    } catch (e) {
      esito.errori.push(`${etichetta}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return esito;
}
