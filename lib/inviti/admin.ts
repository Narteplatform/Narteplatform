import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { tabellaInvitiAssente } from "@/lib/inviti/codice";
import { inizioAnnoItalia } from "@/lib/inviti/regole";
import type { InviteRewardKind, InviteStatus } from "@/lib/supabase/types";

/**
 * Dati del pannello /admin/inviti. Sola lettura, service role.
 *
 * Il percorso di un link, colonna per colonna:
 *   aperture  → visitatori unici al giorno sulla pagina /invito/{codice} (0079)
 *   clic      → visitatori che hanno premuto «Invia la candidatura» (0079)
 *   candidature → artist_invites, qualunque stato
 *   entrati   → candidature approvate e collegate a un account nuovo
 *   paganti   → primo pagamento reale registrato (paid_at)
 *   premi     → invite_rewards: ognuno vale 1 mese di Pro
 *
 * Se la 0079 non è applicata le aperture valgono `null` (il pannello mostra
 * «—»), il resto funziona. Se manca la 0078 il pannello lo dice.
 */

const AREA = "admin/inviti";
const PAGINA = 1000;

type Errore = { code?: string; message: string };

/** Legge tutte le righe, a pagine: PostgREST ne restituisce al massimo 1000 per volta. */
async function tutte<T>(
  leggi: (da: number, a: number) => PromiseLike<{ data: T[] | null; error: Errore | null }>,
): Promise<{ data: T[]; error: Errore | null }> {
  const righe: T[] = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await leggi(da, da + PAGINA - 1);
    if (error) return { data: [], error };
    righe.push(...(data ?? []));
    if ((data ?? []).length < PAGINA) return { data: righe, error: null };
  }
}

export type ConteggiInviti = {
  aperture: number | null;
  clic: number | null;
  candidature: number;
  entrati: number;
  paganti: number;
  inAttesa: number;
  premi: number;
  premiAnno: number;
  premiGiorniPro: number;
  premiCredito: number;
  /** Credito Stripe accreditato: premi a chi pagava già + giorni convertiti. */
  creditoCent: number;
  oltreLimite: number;
  annullati: number;
};

export type RigaArtistaInviti = ConteggiInviti & {
  userId: string;
  nome: string;
  slug: string | null;
  codice: string;
  creatoIl: string;
  disattivatoIl: string | null;
  aperture30gg: number | null;
  ultimaApertura: string | null;
  /** Fine del Pro guadagnato con gli inviti, se è ancora attivo. */
  proFinoAl: string | null;
};

export type RiepilogoAdmin =
  | {
      ok: true;
      visiteDisponibili: boolean;
      totali: ConteggiInviti & { link: number; linkUsati: number };
      artisti: RigaArtistaInviti[];
    }
  | { ok: false; motivo: "migrazione" | "errore" };

type InvitoMinimo = {
  inviter_user_id: string;
  invitee_user_id: string | null;
  status: InviteStatus;
  paid_at: string | null;
};

type PremioMinimo = {
  user_id: string;
  kind: InviteRewardKind;
  pro_until: string | null;
  amount_cents: number | null;
  converted_cents: number | null;
  created_at: string;
};

function vuoti(): ConteggiInviti {
  return {
    aperture: 0,
    clic: 0,
    candidature: 0,
    entrati: 0,
    paganti: 0,
    inAttesa: 0,
    premi: 0,
    premiAnno: 0,
    premiGiorniPro: 0,
    premiCredito: 0,
    creditoCent: 0,
    oltreLimite: 0,
    annullati: 0,
  };
}

function contaInvito(c: ConteggiInviti, i: InvitoMinimo) {
  c.candidature++;
  if (i.invitee_user_id) c.entrati++;
  if (i.paid_at) c.paganti++;
  if (i.status === "in_attesa") c.inAttesa++;
  if (i.status === "oltre_limite") c.oltreLimite++;
  if (i.status === "annullato") c.annullati++;
}

function contaPremio(c: ConteggiInviti, p: PremioMinimo, inizioAnno: number) {
  c.premi++;
  if (new Date(p.created_at).getTime() >= inizioAnno) c.premiAnno++;
  if (p.kind === "giorni_pro") c.premiGiorniPro++;
  else c.premiCredito++;
  c.creditoCent += (p.kind === "credito_stripe" ? (p.amount_cents ?? 0) : 0) + (p.converted_cents ?? 0);
}

/** Nome e slug del primo profilo di ogni account (lo stesso da cui nasce il codice). */
async function nomiAccount(userIds: string[]): Promise<Map<string, { nome: string; slug: string | null }>> {
  const nomi = new Map<string, { nome: string; slug: string | null }>();
  if (userIds.length === 0) return nomi;
  const admin = createAdminClient();
  for (let i = 0; i < userIds.length; i += 200) {
    const blocco = userIds.slice(i, i + 200);
    const { data, error } = await admin
      .from("artists")
      .select("user_id, stage_name, slug, created_at")
      .in("user_id", blocco)
      .order("created_at", { ascending: true });
    if (error) {
      logger.warn(AREA, "nomi degli artisti non letti:", error.message);
      continue;
    }
    for (const p of data ?? []) {
      if (p.user_id && !nomi.has(p.user_id)) nomi.set(p.user_id, { nome: p.stage_name, slug: p.slug });
    }
  }
  return nomi;
}

export async function riepilogoInvitiAdmin(): Promise<RiepilogoAdmin> {
  const admin = createAdminClient();

  const [codici, inviti, premi, visite] = await Promise.all([
    tutte<{ user_id: string; code: string; created_at: string; disabled_at: string | null }>((da, a) =>
      admin.from("invite_codes").select("user_id, code, created_at, disabled_at").order("created_at").range(da, a),
    ),
    tutte<InvitoMinimo>((da, a) =>
      admin.from("artist_invites").select("inviter_user_id, invitee_user_id, status, paid_at").order("created_at").range(da, a),
    ),
    tutte<PremioMinimo>((da, a) =>
      admin
        .from("invite_rewards")
        .select("user_id, kind, pro_until, amount_cents, converted_cents, created_at")
        .order("created_at")
        .range(da, a),
    ),
    admin.rpc("inviti_conteggi_visite"),
  ]);

  const errore = codici.error ?? inviti.error ?? premi.error;
  if (errore) {
    if (tabellaInvitiAssente(errore)) return { ok: false, motivo: "migrazione" };
    logger.error(AREA, "riepilogo non letto:", errore.message);
    return { ok: false, motivo: "errore" };
  }
  // Senza la 0079 la funzione non esiste: le aperture restano «—».
  const visiteDisponibili = !visite.error;
  if (visite.error && visite.error.code !== "PGRST202" && visite.error.code !== "42883") {
    logger.warn(AREA, "aperture dei link non lette:", visite.error.message);
  }
  const visitePer = new Map((visite.data ?? []).map((v) => [v.user_id, v]));

  const inizioAnno = inizioAnnoItalia().getTime();
  const adesso = Date.now();
  const nomi = await nomiAccount(codici.data.map((c) => c.user_id));

  const righe = new Map<string, RigaArtistaInviti>();
  for (const c of codici.data) {
    const v = visitePer.get(c.user_id);
    const n = nomi.get(c.user_id);
    righe.set(c.user_id, {
      ...vuoti(),
      aperture: visiteDisponibili ? Number(v?.visite ?? 0) : null,
      clic: visiteDisponibili ? Number(v?.clic ?? 0) : null,
      aperture30gg: visiteDisponibili ? Number(v?.visite_30gg ?? 0) : null,
      ultimaApertura: v?.ultima_visita ?? null,
      userId: c.user_id,
      nome: n?.nome ?? "Account senza profilo",
      slug: n?.slug ?? null,
      codice: c.code,
      creatoIl: c.created_at,
      disattivatoIl: c.disabled_at,
      proFinoAl: null,
    });
  }

  for (const i of inviti.data) {
    const r = righe.get(i.inviter_user_id);
    if (r) contaInvito(r, i);
  }
  for (const p of premi.data) {
    const r = righe.get(p.user_id);
    if (!r) continue;
    contaPremio(r, p, inizioAnno);
    if (p.kind === "giorni_pro" && p.pro_until && new Date(p.pro_until).getTime() > adesso) {
      if (!r.proFinoAl || p.pro_until > r.proFinoAl) r.proFinoAl = p.pro_until;
    }
  }

  const artisti = [...righe.values()];
  const totali = { ...vuoti(), link: artisti.length, linkUsati: 0 };
  totali.aperture = visiteDisponibili ? 0 : null;
  totali.clic = visiteDisponibili ? 0 : null;
  for (const r of artisti) {
    if (r.candidature > 0 || (r.aperture ?? 0) > 0) totali.linkUsati++;
    if (totali.aperture !== null) totali.aperture += r.aperture ?? 0;
    if (totali.clic !== null) totali.clic += r.clic ?? 0;
    totali.candidature += r.candidature;
    totali.entrati += r.entrati;
    totali.paganti += r.paganti;
    totali.inAttesa += r.inAttesa;
    totali.premi += r.premi;
    totali.premiAnno += r.premiAnno;
    totali.premiGiorniPro += r.premiGiorniPro;
    totali.premiCredito += r.premiCredito;
    totali.creditoCent += r.creditoCent;
    totali.oltreLimite += r.oltreLimite;
    totali.annullati += r.annullati;
  }

  return { ok: true, visiteDisponibili, totali, artisti };
}

// ─────────────────────────────────────────────────────────── scheda

export type InvitoDettaglio = {
  id: string;
  nome: string;
  status: InviteStatus;
  cancelReason: string | null;
  creatoIl: string;
  paidAt: string | null;
  confirmAfter: string | null;
  confirmedAt: string | null;
  inviteeUserId: string | null;
  premio: {
    kind: InviteRewardKind;
    proFrom: string | null;
    proUntil: string | null;
    amountCents: number | null;
    convertedCents: number | null;
    convertedAt: string | null;
    stripeTxn: string | null;
  } | null;
};

export type SchedaAdmin =
  | {
      ok: true;
      riga: RigaArtistaInviti;
      email: string | null;
      inviti: InvitoDettaglio[];
      /** Aperture e clic degli ultimi 30 giorni, giorno per giorno (solo i giorni con dati). */
      andamento: { giorno: string; aperture: number; clic: number }[] | null;
    }
  | { ok: false; motivo: "migrazione" | "errore" | "assente" };

export async function schedaInvitiAdmin(userId: string): Promise<SchedaAdmin> {
  const riepilogo = await riepilogoInvitiAdmin();
  if (!riepilogo.ok) return riepilogo;
  const riga = riepilogo.artisti.find((a) => a.userId === userId);
  if (!riga) return { ok: false, motivo: "assente" };

  const admin = createAdminClient();
  const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [inviti, premi, utente, visite] = await Promise.all([
    admin
      .from("artist_invites")
      .select("id, invitee_stage_name, invitee_user_id, status, cancel_reason, created_at, paid_at, confirm_after, confirmed_at")
      .eq("inviter_user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("invite_rewards")
      .select("invite_id, kind, pro_from, pro_until, amount_cents, converted_cents, converted_at, stripe_balance_txn_id")
      .eq("user_id", userId),
    admin.auth.admin.getUserById(userId),
    riepilogo.visiteDisponibili
      ? admin
          .from("invite_link_visits")
          .select("visited_on, kind")
          .eq("code_user_id", userId)
          .gte("visited_on", trentaGiorniFa)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (inviti.error || premi.error) {
    logger.error(AREA, "scheda non letta:", inviti.error?.message ?? premi.error?.message);
    return { ok: false, motivo: "errore" };
  }
  if (utente.error) logger.warn(AREA, "email di chi invita non letta:", utente.error.message);

  const premioPer = new Map((premi.data ?? []).map((p) => [p.invite_id, p]));

  let andamento: { giorno: string; aperture: number; clic: number }[] | null = null;
  if (visite.error) {
    logger.warn(AREA, "andamento delle aperture non letto:", visite.error.message);
  } else if (visite.data) {
    const perGiorno = new Map<string, { aperture: number; clic: number }>();
    for (const v of visite.data) {
      const g = perGiorno.get(v.visited_on) ?? { aperture: 0, clic: 0 };
      if (v.kind === "visita") g.aperture++;
      else g.clic++;
      perGiorno.set(v.visited_on, g);
    }
    andamento = [...perGiorno.entries()]
      .map(([giorno, n]) => ({ giorno, ...n }))
      .sort((a, b) => b.giorno.localeCompare(a.giorno));
  }

  return {
    ok: true,
    riga,
    email: utente.data?.user?.email ?? null,
    andamento,
    inviti: (inviti.data ?? []).map((i) => {
      const p = premioPer.get(i.id);
      return {
        id: i.id,
        nome: i.invitee_stage_name,
        status: i.status,
        cancelReason: i.cancel_reason,
        creatoIl: i.created_at,
        paidAt: i.paid_at,
        confirmAfter: i.confirm_after,
        confirmedAt: i.confirmed_at,
        inviteeUserId: i.invitee_user_id,
        premio: p
          ? {
              kind: p.kind,
              proFrom: p.pro_from,
              proUntil: p.pro_until,
              amountCents: p.amount_cents,
              convertedCents: p.converted_cents,
              convertedAt: p.converted_at,
              stripeTxn: p.stripe_balance_txn_id,
            }
          : null,
      };
    }),
  };
}
