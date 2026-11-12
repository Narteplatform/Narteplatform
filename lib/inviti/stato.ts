import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import type { InviteStatus } from "@/lib/supabase/types";
import { modalitaInviti } from "@/lib/inviti/modalita";
import { ottieniOCreaCodice, tabellaInvitiAssente } from "@/lib/inviti/codice";
import { MOTIVO_ESCLUSO, TETTO_ANNUO, inizioAnnoItalia } from "@/lib/inviti/regole";

export type InvitoVista = {
  id: string;
  nome: string;
  status: InviteStatus;
  creatoIl: string;
  confermaIl: string | null;
  motivo: string | null;
};

export type StatoInviti =
  | { disponibile: false; motivo: "spento" | "migrazione" | "errore"; messaggio?: string }
  | {
      disponibile: true;
      code: string;
      link: string;
      inviti: InvitoVista[];
      premiTotali: number;
      inAttesa: number;
      premiAnno: number;
      rimastiAnno: number;
      /** Fine del Pro ottenuto con gli inviti, se è ancora attivo o in coda. */
      proFinoAl: string | null;
      /** Credito accreditato su Stripe (premi + giorni convertiti), in centesimi. */
      creditoCent: number;
    };

/** Stato completo per /dashboard/invita. Crea il codice al primo accesso. */
export async function statoInviti(userId: string): Promise<StatoInviti> {
  if (modalitaInviti() === "spento") return { disponibile: false, motivo: "spento" };

  const codice = await ottieniOCreaCodice(userId);
  if (!codice.ok) {
    return codice.migrazioneMancante
      ? { disponibile: false, motivo: "migrazione" }
      : { disponibile: false, motivo: "errore", messaggio: codice.error };
  }

  const admin = createAdminClient();
  const [inviti, premi] = await Promise.all([
    admin
      .from("artist_invites")
      .select("id, invitee_stage_name, status, created_at, confirm_after, cancel_reason")
      .eq("inviter_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("invite_rewards")
      .select("kind, pro_until, amount_cents, converted_cents, created_at")
      .eq("user_id", userId),
  ]);
  if (inviti.error || premi.error) {
    const e = inviti.error ?? premi.error;
    if (tabellaInvitiAssente(e)) return { disponibile: false, motivo: "migrazione" };
    logger.error("inviti", "stato inviti:", e?.message);
    return { disponibile: false, motivo: "errore", messaggio: "Non riusciamo a leggere i tuoi inviti. Riprova fra poco." };
  }

  const righe = (inviti.data ?? []).filter(
    // Candidature non approvate e inviti scartati dai controlli: non si mostrano.
    // Restano quelli che l'artista ha visto progredire: recesso, rimborso e
    // l'esclusione del team (motivata per email, quindi non va nascosta).
    (i) =>
      !(
        i.status === "annullato" &&
        i.cancel_reason !== "recesso" &&
        i.cancel_reason !== "rimborso" &&
        i.cancel_reason !== MOTIVO_ESCLUSO
      ),
  );
  const listaPremi = premi.data ?? [];
  const inizioAnno = inizioAnnoItalia().getTime();
  const premiAnno = listaPremi.filter((p) => new Date(p.created_at).getTime() >= inizioAnno).length;
  const adesso = Date.now();
  const fineMassima = listaPremi
    .filter((p) => p.kind === "giorni_pro" && p.pro_until)
    .map((p) => new Date(p.pro_until as string).getTime())
    .reduce((m, t) => Math.max(m, t), 0);
  const creditoCent = listaPremi.reduce(
    (tot, p) => tot + (p.kind === "credito_stripe" ? (p.amount_cents ?? 0) : 0) + (p.converted_cents ?? 0),
    0,
  );

  return {
    disponibile: true,
    code: codice.code,
    link: `${getSiteUrl()}/invito/${codice.code}`,
    inviti: righe.map((i) => ({
      id: i.id,
      nome: i.invitee_stage_name,
      status: i.status,
      creatoIl: i.created_at,
      confermaIl: i.confirm_after,
      motivo: i.cancel_reason,
    })),
    premiTotali: listaPremi.length,
    inAttesa: righe.filter((i) => i.status === "in_attesa").length,
    premiAnno,
    rimastiAnno: Math.max(TETTO_ANNUO - premiAnno, 0),
    proFinoAl: fineMassima > adesso ? new Date(fineMassima).toISOString() : null,
    creditoCent,
  };
}

/**
 * Riassunto leggero per la pagina Abbonamento: nessuna creazione di codice.
 * Null se non c'è nulla da dire (o se la lettura fallisce: è un di più).
 */
export async function premioInviti(userId: string): Promise<{ proFinoAl: string | null; creditoCent: number } | null> {
  if (modalitaInviti() === "spento") return null;
  const { data, error } = await createAdminClient()
    .from("invite_rewards")
    .select("kind, pro_until, amount_cents, converted_cents")
    .eq("user_id", userId);
  if (error || !data || data.length === 0) return null;
  const adesso = Date.now();
  const fine = data
    .filter((p) => p.kind === "giorni_pro" && p.pro_until)
    .map((p) => new Date(p.pro_until as string).getTime())
    .reduce((m, t) => Math.max(m, t), 0);
  return {
    proFinoAl: fine > adesso ? new Date(fine).toISOString() : null,
    creditoCent: data.reduce(
      (tot, p) => tot + (p.kind === "credito_stripe" ? (p.amount_cents ?? 0) : 0) + (p.converted_cents ?? 0),
      0,
    ),
  };
}
