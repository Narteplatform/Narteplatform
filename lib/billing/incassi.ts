import "server-only";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";
import { giornoRoma, inizioMeseRoma } from "@/lib/billing/fuso-roma";

/**
 * Incassi degli abbonamenti, per il commercialista.
 *
 * N'arte è in regime forfettario: nessuna IVA, ma ogni incasso va fatturato
 * elettronicamente tramite SdI, anche verso i privati, e sopra 77,47 € serve la
 * marca da bollo di 2 €. Stripe non trasmette al Sistema di Interscambio: questa
 * lettura raccoglie, mese per mese, i dati che servono a emettere le fatture —
 * cliente, indirizzo, partita IVA o codice fiscale, importo — senza dover
 * entrare nel pannello di Stripe.
 *
 * Oltre alle fatture pagate riporta, con importo NEGATIVO, i rimborsi e le note
 * di credito del mese (recessi, rimborsi fatti dal pannello): servono le note
 * di credito elettroniche corrispondenti.
 *
 * I confini del mese sono quelli di Europe/Rome, con l'ora legale: un incasso
 * delle 00:30 del 1° (ora italiana) appartiene al nuovo mese.
 *
 * SOLA LETTURA: elenca, non crea né modifica nulla su Stripe.
 */

export type TipoMovimento = "incasso" | "rimborso" | "nota_di_credito";

export type Incasso = {
  tipo: TipoMovimento;
  data: string;
  numeroStripe: string;
  cliente: string;
  email: string;
  indirizzo: string;
  /** «privato» / «partita IVA» dai metadata dell'abbonamento; vuoto se ignoto. */
  acquirente: string;
  codiceFiscaleOPartitaIva: string;
  descrizione: string;
  /** Negativo per rimborsi e note di credito. */
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

function acquirenteDa(metadata: Record<string, string> | null | undefined): string {
  const a = metadata?.acquirente;
  if (a === "consumatore") return "privato";
  if (a === "professionista") return "partita IVA";
  return "";
}

/** Codice fiscale salvato dal checkout nei metadata del customer (vedi lib/stripe/eventi.ts). */
function cfDelCustomer(c: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string {
  if (!c || typeof c === "string" || ("deleted" in c && c.deleted)) return "";
  return (c as Stripe.Customer).metadata?.codice_fiscale ?? "";
}

/** `mese` nel formato YYYY-MM, confini in ora di Roma. */
export async function incassiDelMese(mese: string): Promise<EsitoIncassi> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mese)) return { ok: false, error: "Mese non valido" };
  if (!isStripeConfigured()) return { ok: false, error: "Stripe non è configurato su questo ambiente." };

  const [anno, m] = mese.split("-").map(Number);
  const da = inizioMeseRoma(anno, m);
  const a = m === 12 ? inizioMeseRoma(anno + 1, 1) : inizioMeseRoma(anno, m + 1);

  try {
    const stripe = getStripe();
    const incassi: Incasso[] = [];

    // Cache dei customer (per il codice fiscale dei rimborsi) e delle fatture.
    const customers = new Map<string, string>();
    const cfDi = async (id: string | null | undefined): Promise<string> => {
      if (!id) return "";
      if (customers.has(id)) return customers.get(id) ?? "";
      let cf = "";
      try {
        cf = cfDelCustomer(await stripe.customers.retrieve(id));
      } catch (e) {
        logger.warn("billing/incassi", "customer non leggibile:", e instanceof Error ? e.message : String(e));
      }
      customers.set(id, cf);
      return cf;
    };

    // 1. Fatture pagate del mese.
    for await (const inv of stripe.invoices.list({
      status: "paid",
      created: { gte: da, lt: a },
      limit: 100,
      expand: ["data.customer"],
    })) {
      if (!inv.amount_paid) continue;
      const taxId = (inv.customer_tax_ids ?? []).map((t) => t.value).filter(Boolean).join(" ");
      const acquirente = acquirenteDa(inv.parent?.subscription_details?.metadata);
      incassi.push({
        tipo: "incasso",
        data: giornoRoma(inv.status_transitions?.paid_at ?? inv.created),
        numeroStripe: inv.number ?? "",
        cliente: inv.customer_name ?? "",
        email: inv.customer_email ?? "",
        indirizzo: indirizzo(inv.customer_address),
        acquirente: acquirente || (taxId ? "partita IVA" : ""),
        codiceFiscaleOPartitaIva: taxId || cfDelCustomer(inv.customer),
        descrizione: inv.lines.data[0]?.description ?? "Abbonamento N'arte",
        importoCent: inv.amount_paid,
        bolloDovuto: inv.amount_paid > SOGLIA_BOLLO_CENT,
        idFattura: inv.id ?? "",
      });
    }

    // 2. Note di credito emesse nel mese (non annullate).
    const rimborsiConNota = new Set<string>();
    for await (const cn of stripe.creditNotes.list({
      created: { gte: da, lt: a },
      limit: 100,
      expand: ["data.invoice"],
    })) {
      for (const r of cn.refunds ?? []) {
        const id = typeof r.refund === "string" ? r.refund : r.refund?.id;
        if (id) rimborsiConNota.add(id);
      }
      if (cn.status === "void" || !cn.total) continue;
      const inv = typeof cn.invoice === "string" ? null : cn.invoice;
      const taxId = (inv?.customer_tax_ids ?? []).map((t) => t.value).filter(Boolean).join(" ");
      const customerId = typeof cn.customer === "string" ? cn.customer : cn.customer?.id;
      incassi.push({
        tipo: "nota_di_credito",
        data: giornoRoma(cn.created),
        numeroStripe: cn.number ?? "",
        cliente: inv?.customer_name ?? "",
        email: inv?.customer_email ?? "",
        indirizzo: indirizzo(inv?.customer_address),
        acquirente: acquirenteDa(inv?.parent?.subscription_details?.metadata) || (taxId ? "partita IVA" : ""),
        codiceFiscaleOPartitaIva: taxId || (await cfDi(customerId)),
        descrizione: `Nota di credito${inv?.number ? ` sulla fattura ${inv.number}` : ""}`,
        importoCent: -cn.total,
        bolloDovuto: cn.total > SOGLIA_BOLLO_CENT,
        idFattura: inv?.id ?? (typeof cn.invoice === "string" ? cn.invoice : ""),
      });
    }

    // 3. Rimborsi del mese senza nota di credito (es. recesso del consumatore,
    //    rimborso dal pannello): la nota di credito elettronica va emessa.
    const fatture = new Map<string, Stripe.Invoice | null>();
    for await (const rf of stripe.refunds.list({
      created: { gte: da, lt: a },
      limit: 100,
      expand: ["data.charge"],
    })) {
      if (rimborsiConNota.has(rf.id)) continue;
      if (rf.status !== "succeeded" && rf.status !== "pending") continue;
      const charge = rf.charge && typeof rf.charge !== "string" ? rf.charge : null;
      const customerId = charge ? (typeof charge.customer === "string" ? charge.customer : charge.customer?.id) : null;

      const idFattura = rf.metadata?.invoice ?? "";
      let inv: Stripe.Invoice | null = null;
      if (idFattura) {
        if (!fatture.has(idFattura)) {
          try {
            fatture.set(idFattura, await stripe.invoices.retrieve(idFattura));
          } catch {
            fatture.set(idFattura, null);
          }
        }
        inv = fatture.get(idFattura) ?? null;
      }
      const taxId = (inv?.customer_tax_ids ?? []).map((t) => t.value).filter(Boolean).join(" ");
      const recesso = rf.metadata?.tipo === "recesso_consumatore";
      incassi.push({
        tipo: "rimborso",
        data: giornoRoma(rf.created),
        numeroStripe: inv?.number ?? "",
        cliente: inv?.customer_name ?? charge?.billing_details?.name ?? "",
        email: inv?.customer_email ?? charge?.billing_details?.email ?? "",
        indirizzo: indirizzo(inv?.customer_address ?? charge?.billing_details?.address),
        acquirente: acquirenteDa(inv?.parent?.subscription_details?.metadata) || (recesso ? "privato" : ""),
        codiceFiscaleOPartitaIva: taxId || (await cfDi(customerId)),
        descrizione: `${recesso ? "Rimborso per recesso" : "Rimborso"}${inv?.number ? ` sulla fattura ${inv.number}` : ""}`,
        importoCent: -rf.amount,
        bolloDovuto: rf.amount > SOGLIA_BOLLO_CENT,
        idFattura: inv?.id ?? idFattura,
      });
    }

    incassi.sort((x, y) => x.data.localeCompare(y.data));
    return { ok: true, incassi };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("billing/incassi", msg);
    return { ok: false, error: "Non è stato possibile leggere gli incassi da Stripe." };
  }
}

const TIPO_LABEL: Record<TipoMovimento, string> = {
  incasso: "Incasso",
  rimborso: "Rimborso",
  nota_di_credito: "Nota di credito",
};

export function tipoMovimentoLabel(t: TipoMovimento): string {
  return TIPO_LABEL[t];
}

/** CSV con separatore `;` e virgola decimale, come lo aprono Excel e i gestionali italiani. */
export function incassiCsv(incassi: Incasso[]): string {
  const cella = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const euro = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const righe = [
    [
      "Tipo",
      "Data",
      "Numero Stripe",
      "Cliente",
      "Email",
      "Indirizzo",
      "Acquirente",
      "CF / P.IVA",
      "Descrizione",
      "Importo €",
      "Bollo 2 € dovuto",
      "ID fattura Stripe",
    ],
    ...incassi.map((i) => [
      TIPO_LABEL[i.tipo],
      i.data,
      i.numeroStripe,
      i.cliente,
      i.email,
      i.indirizzo,
      i.acquirente,
      i.codiceFiscaleOPartitaIva,
      i.descrizione,
      euro(i.importoCent),
      i.bolloDovuto ? "sì" : "no",
      i.idFattura,
    ]),
  ];
  return "\uFEFF" + righe.map((r) => r.map((c) => cella(String(c))).join(";")).join("\r\n");
}
