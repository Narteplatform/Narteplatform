import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { logger } from "@/lib/logger";
import type { InviteStatus } from "@/lib/supabase/types";
import { modalitaInviti } from "@/lib/inviti/modalita";
import { tabellaInvitiAssente, type ArtistaCheInvita } from "@/lib/inviti/codice";
import { avvisaChiInvita, emailPremioAccreditato } from "@/lib/inviti/avvisi";
import { accreditaSuStripe } from "@/lib/inviti/stripe-credito";
import {
  CREDITO_PREMIO_CENT,
  GIORNI_ATTESA,
  GIORNI_PREMIO,
  TETTO_ANNUO,
  aggiungiGiorni,
  centDaGiorni,
  formatData,
  formatEuro,
  giorniFra,
  inizioAnnoItalia,
} from "@/lib/inviti/regole";

/**
 * Ciclo di vita di un invito.
 *
 *   candidatura ─approvazione─▶ approvato ─primo pagamento─▶ in_attesa
 *   in_attesa ─cron dopo 14 gg─▶ confermato | annullato | oltre_limite
 *
 * REGOLE DI SCRITTURA (CLAUDE.md, «mai distruggere»):
 *   - ogni lettura controlla `error` e, se fallisce, la funzione si FERMA:
 *     nessuna scrittura derivata da un dato mancante;
 *   - ogni transizione è condizionata allo stato di partenza (`.eq("status")`):
 *     due esecuzioni parallele non possono far avanzare due volte lo stesso
 *     invito;
 *   - nessuna funzione cancella righe.
 *
 * Tutte le funzioni chiamate dai flussi esistenti (candidatura, approvazione,
 * webhook, recesso) sono best-effort: non lanciano mai.
 */

const AREA = "inviti";
const STATI_VIVI = ["trialing", "active", "past_due"] as const;

type Invito = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_stage_name: string;
  status: InviteStatus;
  stripe_invoice_id: string | null;
  paid_at: string | null;
  confirm_after: string | null;
};

const COLONNE_INVITO =
  "id, inviter_user_id, invitee_user_id, invitee_stage_name, status, stripe_invoice_id, paid_at, confirm_after";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function aggiornaStato(
  id: string,
  da: InviteStatus,
  campi: { status: InviteStatus } & Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("artist_invites")
    .update({ ...campi, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", da)
    .select("id");
  if (error) {
    logger.error(AREA, `transizione ${da}→${campi.status} di ${id}:`, error.message);
    return false;
  }
  return (data ?? []).length === 1;
}

// ─────────────────────────────────────────────────────────── 1. candidatura

/**
 * Una candidatura è arrivata dal link di un artista (`chi`, già risolto lato
 * server dal cookie dell'invito: vedi invitoDaCookie).
 */
export async function registraCandidatura(input: {
  applicationId: string;
  chi: ArtistaCheInvita;
  email: string;
  stageName: string;
}): Promise<void> {
  try {
    if (modalitaInviti() === "spento") return;
    const { chi } = input;

    const admin = createAdminClient();
    // Auto-invito: chi invita non può candidarsi col proprio link.
    const { data: utente, error: errUtente } = await admin.auth.admin.getUserById(chi.userId);
    if (errUtente) {
      logger.error(AREA, "email di chi invita non leggibile:", errUtente.message);
      return;
    }
    if (utente?.user?.email && utente.user.email.toLowerCase() === input.email.trim().toLowerCase()) {
      logger.warn(AREA, "auto-invito scartato per la candidatura", input.applicationId);
      return;
    }

    const { data, error } = await admin
      .from("artist_invites")
      .insert({
        inviter_user_id: chi.userId,
        application_id: input.applicationId,
        invitee_stage_name: input.stageName.slice(0, 200),
        status: "candidatura",
      })
      .select("id")
      .single();
    if (error) {
      if (!tabellaInvitiAssente(error) && error.code !== "23505") {
        logger.error(AREA, "invito non registrato:", error.message);
      }
      return;
    }
    await avvisaChiInvita({
      inviterUserId: chi.userId,
      inviteId: data.id,
      title: `${input.stageName} si è candidato dal tuo link`,
      body: "Il team N'arte valuterà la candidatura. Ti avvisiamo appena entra.",
    });
  } catch (e) {
    logger.error(AREA, "registraCandidatura:", msg(e));
  }
}

/**
 * Candidatura non approvata: l'invito si chiude e sparisce dalla pagina di
 * chi invita (nessun giudizio del Team mostrato a terzi).
 */
export async function chiudiCandidaturaNonApprovata(applicationId: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("artist_invites")
      .update({ status: "annullato", cancel_reason: "non_approvata", updated_at: new Date().toISOString() })
      .eq("application_id", applicationId)
      .eq("status", "candidatura");
    if (error && !tabellaInvitiAssente(error)) logger.error(AREA, "chiusura invito:", error.message);
  } catch (e) {
    logger.error(AREA, "chiudiCandidaturaNonApprovata:", msg(e));
  }
}

// ─────────────────────────────────────────────────────────── 2. approvazione

/**
 * La candidatura è stata approvata e l'account creato. L'invito vale solo per
 * un artista NUOVO: niente auto-invito, nessun profilo precedente, nessun
 * abbonamento mai avuto.
 */
export async function collegaApprovazione(input: { applicationId: string; userId: string | null }): Promise<void> {
  try {
    if (!input.userId) return;
    const admin = createAdminClient();
    const { data: invito, error } = await admin
      .from("artist_invites")
      .select(COLONNE_INVITO)
      .eq("application_id", input.applicationId)
      .eq("status", "candidatura")
      .maybeSingle();
    if (error) {
      if (!tabellaInvitiAssente(error)) logger.error(AREA, "lettura invito all'approvazione:", error.message);
      return;
    }
    if (!invito) return;

    const chiudi = (motivo: string) =>
      aggiornaStato(invito.id, "candidatura", { status: "annullato", cancel_reason: motivo });

    if (input.userId === invito.inviter_user_id) {
      await chiudi("auto_invito");
      return;
    }

    const [profili, abbonamenti] = await Promise.all([
      admin.from("artists").select("id", { count: "exact", head: true }).eq("user_id", input.userId),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", input.userId),
    ]);
    if (profili.error || abbonamenti.error) {
      logger.error(AREA, "verifica artista nuovo:", profili.error?.message ?? abbonamenti.error?.message);
      return; // resta in `candidatura`: nessuna decisione su un dato mancante
    }
    // Il profilo appena creato conta 1: di più vuol dire che esisteva già.
    if ((profili.count ?? 0) > 1 || (abbonamenti.count ?? 0) > 0) {
      await chiudi("account_non_nuovo");
      return;
    }

    const { data: agg, error: errAgg } = await admin
      .from("artist_invites")
      .update({ status: "approvato", invitee_user_id: input.userId, updated_at: new Date().toISOString() })
      .eq("id", invito.id)
      .eq("status", "candidatura")
      .select("id");
    if (errAgg) {
      // 23505: questo account è già collegato a un altro invito.
      if (errAgg.code === "23505") await chiudi("gia_invitato");
      else logger.error(AREA, "collegamento invito:", errAgg.message);
      return;
    }
    if ((agg ?? []).length !== 1) return;

    await avvisaChiInvita({
      inviterUserId: invito.inviter_user_id,
      inviteId: invito.id,
      title: `${invito.invitee_stage_name} è entrato su N'arte`,
      body: "Quando si abbona a un piano a pagamento, il tuo mese di Pro è in arrivo.",
    });
  } catch (e) {
    logger.error(AREA, "collegaApprovazione:", msg(e));
  }
}

// ─────────────────────────────────────────────────────────── 3. pagamento

/**
 * Primo pagamento reale dell'invitato (fattura pagata con importo > 0). Un
 * coupon al 100% non conta: scatterà la prima fattura pagata davvero.
 */
export async function registraPrimoPagamento(input: {
  userId: string;
  invoiceId: string;
  amountPaid: number;
  paidAt: Date;
}): Promise<void> {
  try {
    if (input.amountPaid <= 0) return;
    const { data: invito, error } = await createAdminClient()
      .from("artist_invites")
      .select(COLONNE_INVITO)
      .eq("invitee_user_id", input.userId)
      .eq("status", "approvato")
      .maybeSingle();
    if (error) {
      if (!tabellaInvitiAssente(error)) logger.error(AREA, "lettura invito al pagamento:", error.message);
      return;
    }
    if (!invito) return;

    const conferma = aggiungiGiorni(input.paidAt, GIORNI_ATTESA);
    const ok = await aggiornaStato(invito.id, "approvato", {
      status: "in_attesa",
      stripe_invoice_id: input.invoiceId,
      paid_at: input.paidAt.toISOString(),
      confirm_after: conferma.toISOString(),
    });
    if (!ok) return;

    await avvisaChiInvita({
      inviterUserId: invito.inviter_user_id,
      inviteId: invito.id,
      title: `${invito.invitee_stage_name} si è abbonato`,
      body: `Il tuo mese di Pro arriva il ${formatData(conferma)}, passati i 14 giorni di recesso.`,
    });
  } catch (e) {
    logger.error(AREA, "registraPrimoPagamento:", msg(e));
  }
}

/** L'invitato ha esercitato il recesso: niente premio. */
export async function annullaPerRecesso(userId: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("artist_invites")
      .update({ status: "annullato", cancel_reason: "recesso", updated_at: new Date().toISOString() })
      .eq("invitee_user_id", userId)
      .eq("status", "in_attesa");
    if (error && !tabellaInvitiAssente(error)) logger.error(AREA, "annullamento per recesso:", error.message);
  } catch (e) {
    logger.error(AREA, "annullaPerRecesso:", msg(e));
  }
}

// ─────────────────────────────────────────────────────────── 4. premio

async function customerDi(userId: string): Promise<{ ok: true; id: string | null } | { ok: false }> {
  const { data, error } = await createAdminClient()
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.error(AREA, "cliente Stripe non leggibile:", error.message);
    return { ok: false };
  }
  return { ok: true, id: data?.stripe_customer_id ?? null };
}

async function haAbbonamentoVivo(userId: string): Promise<boolean | null> {
  const { count, error } = await createAdminClient()
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", [...STATI_VIVI]);
  if (error) {
    logger.error(AREA, "abbonamento di chi invita non leggibile:", error.message);
    return null;
  }
  return (count ?? 0) > 0;
}

async function premiNellAnno(userId: string): Promise<number | null> {
  const { count, error } = await createAdminClient()
    .from("invite_rewards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", inizioAnnoItalia().toISOString());
  if (error) {
    logger.error(AREA, "conteggio premi dell'anno:", error.message);
    return null;
  }
  return count ?? 0;
}

type EsitoPremio = { ok: true; dettaglio: string } | { ok: false; error: string };

/**
 * Assegna il premio di un invito. Idempotente: il vincolo unico su
 * `invite_rewards.invite_id` impedisce il doppio premio, e il credito Stripe
 * ha la propria protezione (vedi accreditaSuStripe).
 */
async function assegnaPremio(invito: Invito): Promise<EsitoPremio> {
  const admin = createAdminClient();
  const vivo = await haAbbonamentoVivo(invito.inviter_user_id);
  if (vivo === null) return { ok: false, error: "abbonamento non leggibile" };

  // Premio già scritto in un'esecuzione precedente interrotta a metà?
  const { data: esistente, error: errEsistente } = await admin
    .from("invite_rewards")
    .select("id, kind, pro_until, amount_cents, stripe_balance_txn_id")
    .eq("invite_id", invito.id)
    .maybeSingle();
  if (errEsistente) return { ok: false, error: errEsistente.message };

  if (esistente?.kind === "giorni_pro" || (!esistente && !vivo)) {
    const { data: riga, error } = await admin.rpc("inviti_assegna_giorni_pro", {
      p_invite_id: invito.id,
      p_user_id: invito.inviter_user_id,
      p_giorni: GIORNI_PREMIO,
    });
    if (error || !riga) return { ok: false, error: error?.message ?? "premio non scritto" };
    return { ok: true, dettaglio: `Pro attivo fino al ${formatData(riga.pro_until ?? new Date())}` };
  }

  // Credito Stripe: prima la riga (riserva il premio), poi Stripe, poi l'id.
  const cliente = await customerDi(invito.inviter_user_id);
  if (!cliente.ok) return { ok: false, error: "cliente Stripe non leggibile" };
  if (!cliente.id) return { ok: false, error: "cliente Stripe assente per un account con abbonamento" };

  let premioId = esistente?.id ?? null;
  if (!premioId) {
    const { data: riga, error } = await admin
      .from("invite_rewards")
      .insert({
        invite_id: invito.id,
        user_id: invito.inviter_user_id,
        kind: "credito_stripe",
        amount_cents: CREDITO_PREMIO_CENT,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    premioId = riga.id;
  }
  if (!esistente?.stripe_balance_txn_id) {
    let txn: string;
    try {
      txn = await accreditaSuStripe({
        customerId: cliente.id,
        cent: CREDITO_PREMIO_CENT,
        descrizione: "Invita un artista: 1 mese di N'arte Pro",
        chiave: `invito-premio-${invito.id}`,
        metadata: { tipo: "invita_un_artista", invite_id: invito.id, reward_id: premioId },
      });
    } catch (e) {
      // La riga resta senza id Stripe: il prossimo giro del cron ritenta.
      return { ok: false, error: `Stripe: ${msg(e)}` };
    }
    const { error: errTxn } = await admin
      .from("invite_rewards")
      .update({ stripe_balance_txn_id: txn })
      .eq("id", premioId);
    if (errTxn) logger.error(AREA, `credito ${txn} scritto su Stripe ma non annotato sul premio ${premioId}:`, errTxn.message);
  }
  return {
    ok: true,
    dettaglio: `${formatEuro(CREDITO_PREMIO_CENT)} di credito, scalati dalla prossima fattura`,
  };
}

/**
 * La fattura del primo pagamento è ancora pagata e non rimborsata? `true`
 * pagata e intatta, `false` no, `null` se Stripe non risponde (si riprova).
 */
async function pagamentoAncoraValido(invoiceId: string): Promise<boolean | null> {
  try {
    const stripe = getStripe();
    const fattura = await stripe.invoices.retrieve(invoiceId);
    if (fattura.status !== "paid" || (fattura.amount_paid ?? 0) <= 0) return false;
    const pagamenti = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 10 });
    for (const p of pagamenti.data) {
      const pi = p.payment?.payment_intent;
      const ch = p.payment?.charge;
      const filtro: Stripe.RefundListParams = pi
        ? { payment_intent: typeof pi === "string" ? pi : pi.id, limit: 10 }
        : ch
          ? { charge: typeof ch === "string" ? ch : ch.id, limit: 10 }
          : { limit: 0 };
      if (!filtro.payment_intent && !filtro.charge) continue;
      const rimborsi = await stripe.refunds.list(filtro);
      if (rimborsi.data.some((r) => r.status === "succeeded" || r.status === "pending")) return false;
    }
    return true;
  } catch (e) {
    logger.error(AREA, `verifica fattura ${invoiceId}:`, msg(e));
    return null;
  }
}

async function haReceduto(userId: string): Promise<boolean | null> {
  const { count, error } = await createAdminClient()
    .from("subscription_withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    logger.error(AREA, "lettura recessi:", error.message);
    return null;
  }
  return (count ?? 0) > 0;
}

export type RiepilogoConferme = {
  modalita: "conta" | "attivo";
  esaminati: number;
  confermati: number;
  annullati: number;
  oltreLimite: number;
  rinviati: number;
  esiti: string[];
};

/**
 * Cron: gli inviti `in_attesa` arrivati alla data di conferma. In modalità
 * `conta` decide e riferisce, ma non scrive nulla (né DB né Stripe).
 */
export async function confermaScaduti(): Promise<{ ok: true; riepilogo: RiepilogoConferme } | { ok: false; error: string }> {
  const modalita = modalitaInviti();
  if (modalita === "spento") return { ok: false, error: "programma spento" };
  const scrivi = modalita === "attivo";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artist_invites")
    .select(COLONNE_INVITO)
    .eq("status", "in_attesa")
    .lte("confirm_after", new Date().toISOString())
    .order("confirm_after", { ascending: true })
    .limit(100);
  if (error) {
    if (tabellaInvitiAssente(error)) return { ok: false, error: "migration 0078 non applicata" };
    return { ok: false, error: error.message };
  }

  const r: RiepilogoConferme = { modalita, esaminati: 0, confermati: 0, annullati: 0, oltreLimite: 0, rinviati: 0, esiti: [] };
  // Premi già contati in questo giro, per il tetto di chi ne riceve più d'uno.
  const assegnatiOra = new Map<string, number>();

  for (const invito of (data ?? []) as Invito[]) {
    r.esaminati++;
    const etichetta = `${invito.invitee_stage_name} (invito ${invito.id.slice(0, 8)})`;

    if (!invito.invitee_user_id || !invito.stripe_invoice_id) {
      r.rinviati++;
      r.esiti.push(`${etichetta}: dati incompleti, da controllare a mano`);
      continue;
    }

    const [valido, receduto] = await Promise.all([
      pagamentoAncoraValido(invito.stripe_invoice_id),
      haReceduto(invito.invitee_user_id),
    ]);
    if (valido === null || receduto === null) {
      r.rinviati++;
      r.esiti.push(`${etichetta}: verifica non riuscita, si riprova domani`);
      continue;
    }
    if (!valido || receduto) {
      r.annullati++;
      r.esiti.push(`${etichetta}: ${receduto ? "recesso" : "pagamento rimborsato"}, nessun premio`);
      if (scrivi) {
        await aggiornaStato(invito.id, "in_attesa", {
          status: "annullato",
          cancel_reason: receduto ? "recesso" : "rimborso",
        });
      }
      continue;
    }

    const contati = await premiNellAnno(invito.inviter_user_id);
    if (contati === null) {
      r.rinviati++;
      r.esiti.push(`${etichetta}: conteggio premi non riuscito, si riprova domani`);
      continue;
    }
    const totale = contati + (assegnatiOra.get(invito.inviter_user_id) ?? 0);
    if (totale >= TETTO_ANNUO) {
      r.oltreLimite++;
      r.esiti.push(`${etichetta}: oltre il tetto di ${TETTO_ANNUO} premi dell'anno`);
      if (scrivi) {
        const ok = await aggiornaStato(invito.id, "in_attesa", { status: "oltre_limite", confirmed_at: new Date().toISOString() });
        if (ok) {
          await avvisaChiInvita({
            inviterUserId: invito.inviter_user_id,
            inviteId: invito.id,
            title: `${invito.invitee_stage_name} si è abbonato`,
            body: `Hai già raggiunto i ${TETTO_ANNUO} mesi di quest'anno: i premi ripartono dal 1° gennaio.`,
          });
        }
      }
      continue;
    }

    if (!scrivi) {
      r.confermati++;
      r.esiti.push(`${etichetta}: premio DA ASSEGNARE (modalità conta, nulla scritto)`);
      continue;
    }

    const premio = await assegnaPremio(invito);
    if (!premio.ok) {
      r.rinviati++;
      r.esiti.push(`${etichetta}: premio non assegnato (${premio.error}), si riprova domani`);
      continue;
    }
    const ok = await aggiornaStato(invito.id, "in_attesa", { status: "confermato", confirmed_at: new Date().toISOString() });
    if (!ok) {
      r.esiti.push(`${etichetta}: premio assegnato ma stato non aggiornato`);
      continue;
    }
    assegnatiOra.set(invito.inviter_user_id, (assegnatiOra.get(invito.inviter_user_id) ?? 0) + 1);
    r.confermati++;
    r.esiti.push(`${etichetta}: premio assegnato — ${premio.dettaglio}`);

    const usati = totale + 1;
    await avvisaChiInvita({
      inviterUserId: invito.inviter_user_id,
      inviteId: invito.id,
      title: "Hai guadagnato 1 mese di Pro",
      body: `Grazie a ${invito.invitee_stage_name}. ${premio.dettaglio}.`,
    });
    await emailPremioAccreditato({
      inviterUserId: invito.inviter_user_id,
      inviteId: invito.id,
      inviteeName: invito.invitee_stage_name,
      rewardDetail: premio.dettaglio,
      yearLabel: `${usati} ${usati === 1 ? "premio" : "premi"} su ${TETTO_ANNUO} quest'anno`,
    });
  }
  return { ok: true, riepilogo: r };
}

// ─────────────────────────────────────────────────────────── 5. conversione

/**
 * L'account si è appena abbonato mentre aveva giorni di Pro dei premi ancora
 * da godere: i giorni restanti diventano credito Stripe (9,99 € ogni 30
 * giorni), così abbonarsi prima della scadenza non fa perdere nulla.
 */
export async function convertiGiorniInCredito(userId: string): Promise<void> {
  try {
    if (modalitaInviti() !== "attivo") return;
    const admin = createAdminClient();
    const adesso = new Date();
    const { data, error } = await admin
      .from("invite_rewards")
      .select("id, pro_from, pro_until")
      .eq("user_id", userId)
      .eq("kind", "giorni_pro")
      .is("converted_at", null)
      .gt("pro_until", adesso.toISOString());
    if (error) {
      if (!tabellaInvitiAssente(error)) logger.error(AREA, "lettura giorni da convertire:", error.message);
      return;
    }
    const premi = (data ?? []) as { id: string; pro_from: string; pro_until: string }[];
    if (premi.length === 0) return;

    const cliente = await customerDi(userId);
    if (!cliente.ok || !cliente.id) {
      logger.error(AREA, `conversione giorni→credito di ${userId}: cliente Stripe assente`);
      return;
    }

    for (const p of premi) {
      const da = new Date(Math.max(new Date(p.pro_from).getTime(), adesso.getTime()));
      const giorni = giorniFra(da, new Date(p.pro_until));
      const cent = centDaGiorni(giorni);
      // Nuova fine: adesso, o l'inizio se il periodo era ancora in coda.
      const nuovaFine = new Date(Math.max(new Date(p.pro_from).getTime(), adesso.getTime())).toISOString();
      let txn: string | null = null;
      if (cent > 0) {
        try {
          txn = await accreditaSuStripe({
            customerId: cliente.id,
            cent,
            descrizione: `Invita un artista: ${giorni} giorni di Pro non goduti`,
            chiave: `invito-conversione-${p.id}`,
            metadata: { tipo: "invita_un_artista_conversione", reward_id: p.id },
          });
        } catch (e) {
          logger.error(AREA, `conversione del premio ${p.id} non riuscita:`, msg(e));
          continue; // i giorni restano: meglio Pro in più che credito perso
        }
      }
      const { error: errUpd } = await admin
        .from("invite_rewards")
        .update({
          pro_until: nuovaFine,
          converted_at: adesso.toISOString(),
          converted_cents: cent,
          converted_balance_txn_id: txn,
        })
        .eq("id", p.id)
        .is("converted_at", null);
      if (errUpd) logger.error(AREA, `credito ${txn} scritto ma premio ${p.id} non aggiornato:`, errUpd.message);
    }
  } catch (e) {
    logger.error(AREA, "convertiGiorniInCredito:", msg(e));
  }
}

// ─────────────────────────────────────────────────────────── 6. promemoria

/**
 * Promemoria 3 giorni prima della fine del Pro ottenuto con gli inviti. Si
 * considera la fine dell'ULTIMO periodo dell'account (i periodi si accodano).
 */
export async function avvisaScadenzeVicine(): Promise<number> {
  try {
    const admin = createAdminClient();
    const adesso = Date.now();
    const da = new Date(adesso + 2 * 24 * 3600 * 1000).toISOString();
    const a = new Date(adesso + 3 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await admin
      .from("invite_rewards")
      .select("user_id, pro_until")
      .eq("kind", "giorni_pro")
      .is("converted_at", null)
      .gt("pro_until", da)
      .lte("pro_until", a);
    if (error) {
      if (!tabellaInvitiAssente(error)) logger.error(AREA, "lettura scadenze:", error.message);
      return 0;
    }
    let n = 0;
    for (const riga of (data ?? []) as { user_id: string; pro_until: string }[]) {
      // C'è un periodo successivo in coda? Allora non scade davvero.
      const { count, error: errDopo } = await admin
        .from("invite_rewards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", riga.user_id)
        .eq("kind", "giorni_pro")
        .gt("pro_until", riga.pro_until);
      if (errDopo || (count ?? 0) > 0) continue;
      const vivo = await haAbbonamentoVivo(riga.user_id);
      if (vivo !== false) continue;
      await avvisaChiInvita({
        inviterUserId: riga.user_id,
        inviteId: `scadenza-${riga.pro_until.slice(0, 10)}`,
        title: "Il tuo Pro scade fra 3 giorni",
        body: `Il Pro ottenuto con gli inviti finisce il ${formatData(riga.pro_until)}. Invita un altro artista o scegli un piano per non perderlo.`,
      });
      n++;
    }
    return n;
  } catch (e) {
    logger.error(AREA, "avvisaScadenzeVicine:", msg(e));
    return 0;
  }
}
