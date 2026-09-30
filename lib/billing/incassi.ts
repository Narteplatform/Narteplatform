import "server-only";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";

/**
 * Incassi degli abbonamenti, per il commercialista.
 *
 * N'arte è in regime forfettario: nessuna IVA, ma ogni incasso va fatturato
 * elettronicamente tramite SdI, anche verso i privati, e sopra 77,47 € serve la
 * marca da bollo di 2 €. Stripe non trasmette al Sistema di Interscambio: questa
 * lettura raccoglie, mese per mese, i dati che servono a emettere le fatture —
 * cliente, indirizzo, eventuale partita IVA, importo — senza dover entrare nel
 * pannello di Stripe.
 *
 * SOLA LETTURA: elenca fatture già pagate, non crea né modifica nulla su Stripe.
 */

export type Incasso = {
  data: string;
  numeroStripe: string;
  cliente: string;
  email: string;
  indirizzo: string;
  codiceFiscaleOPartitaIva: string;
  descrizione: string;
  importoCent: number;
  bolloDovuto: boolean;
  idFattura: string;
};

export type EsitoIncassi = { ok: true; incassi: Incasso[] } | { ok: false; error: string };

const SOGLIA_BOLLO_CENT = 7747;

function indirizzo(a: Stripe.Address | null | undefined): string {
  if (!a) return "";
  return [a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state, a.country]
    .filter((x) => x && String(x).trim() !== "")
    .join(", ");
}

/** `mese` nel formato YYYY-MM, fuso Europe/Rome approssimato a UTC+1. */
export async function incassiDelMese(mese: string): Promise<EsitoIncassi> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mese)) return { ok: false, error: "Mese non valido" };
  if (!isStripeConfigured()) return { ok: false, error: "Stripe non è configurato su questo ambiente." };

  const [anno, m] = mese.split("-").map(Number);
  const da = Math.floor(Date.UTC(anno, m - 1, 1, -1) / 1000);
  const a = Math.floor(Date.UTC(anno, m, 1, -1) / 1000);

  try {
    const stripe = getStripe();
    const incassi: Incasso[] = [];
    for await (const inv of stripe.invoices.list({
      status: "paid",
      created: { gte: da, lt: a },
      limit: 100,
    })) {
      if (!inv.amount_paid) continue;
      const taxId = (inv.customer_tax_ids ?? []).map((t) => t.value).filter(Boolean).join(" ");
      incassi.push({
        data: new Date((inv.status_transitions?.paid_at ?? inv.created) * 1000).toISOString().slice(0, 10),
        numeroStripe: inv.number ?? "",
        cliente: inv.customer_name ?? "",
        email: inv.customer_email ?? "",
        indirizzo: indirizzo(inv.customer_address),
        codiceFiscaleOPartitaIva: taxId,
        descrizione: inv.lines.data[0]?.description ?? "Abbonamento N'arte",
        importoCent: inv.amount_paid,
        bolloDovuto: inv.amount_paid > SOGLIA_BOLLO_CENT,
        idFattura: inv.id ?? "",
      });
    }
    return { ok: true, incassi };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("billing/incassi", msg);
    return { ok: false, error: "Non è stato possibile leggere gli incassi da Stripe." };
  }
}

/** CSV con separatore `;` e virgola decimale, come lo aprono Excel e i gestionali italiani. */
export function incassiCsv(incassi: Incasso[]): string {
  const cella = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const euro = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const righe = [
    ["Data", "Numero Stripe", "Cliente", "Email", "Indirizzo", "CF / P.IVA", "Descrizione", "Importo €", "Bollo 2 € dovuto", "ID fattura Stripe"],
    ...incassi.map((i) => [
      i.data,
      i.numeroStripe,
      i.cliente,
      i.email,
      i.indirizzo,
      i.codiceFiscaleOPartitaIva,
      i.descrizione,
      euro(i.importoCent),
      i.bolloDovuto ? "sì" : "no",
      i.idFattura,
    ]),
  ];
  return "﻿" + righe.map((r) => r.map((c) => cella(String(c))).join(";")).join("\r\n");
}
