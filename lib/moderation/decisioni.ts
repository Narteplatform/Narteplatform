import "server-only";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Registro e comunicazione delle decisioni di moderazione.
 *
 * Ogni intervento del Team su un contenuto o su un account passa di qui:
 * rifiuto di una candidatura, profilo nascosto o eliminato, media respinto,
 * recensione oscurata, blocco in chat, esito di una segnalazione. La funzione
 * fa due cose, sempre insieme:
 *
 *   1. scrive la decisione in `moderation_actions`, con chi, cosa e perché;
 *   2. la comunica all'interessato con il motivo e il collegamento per
 *      contestarla (art. 17 DSA; doc. 06 del fascicolo legale).
 *
 * PERCHÉ INSIEME. Una decisione registrata e non comunicata, o comunicata e non
 * registrata, è esattamente la situazione che i termini escludono. Tenerle in
 * una sola funzione impedisce che un nuovo punto del pannello ne faccia una
 * sola.
 *
 * SE LA TABELLA NON C'È ANCORA (migration 0065 non applicata) la decisione non
 * viene bloccata: si registra un avviso nei log e l'email parte comunque, con
 * un riferimento generato qui. Bloccare il pannello per un registro mancante
 * lascerebbe il Team senza strumenti di moderazione.
 */

export const MOTIVAZIONE_MIN = 10;

export type ComunicazioneDecisione = {
  /** Frase completa su cosa è stato deciso: «Abbiamo nascosto il tuo profilo dal catalogo.» */
  decision: string;
  /** L'elemento interessato, in chiaro: «Profilo "Trio Esempio"». */
  target: string;
  /** Effetti e durata, se ce ne sono. */
  consequences?: string;
  /** False per le decisioni imposte da un'autorità, che la piattaforma non può riesaminare. */
  contestable?: boolean;
};

export type DecisioneInput = {
  actorId: string;
  targetType: string;
  targetId?: string | null;
  action: string;
  /** Il motivo, con il riferimento alla regola violata. Almeno 10 caratteri. */
  reason: string;
  affectedUserId?: string | null;
  /** Per chi non ha un account (es. un candidato). Se assente, si ricava dall'utente. */
  affectedEmail?: string | null;
  affectedName?: string | null;
  reportId?: string | null;
  /** `false` per registrare senza avvisare (es. l'interessato non è raggiungibile). */
  notify: ComunicazioneDecisione | false;
};

export type DecisioneEsito =
  | { ok: true; reference: string; notified: boolean }
  | { ok: false; error: string };

function riferimento(id: string): string {
  return `D-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Il collegamento con cui l'interessato presenta reclamo contro una decisione. */
export function urlReclamo(reference: string): string {
  return `${getSiteUrl()}/segnalazioni?reclamo=${encodeURIComponent(reference)}`;
}

export async function registraDecisione(input: DecisioneInput): Promise<DecisioneEsito> {
  const reason = input.reason.trim();
  if (reason.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }

  const admin = createAdminClient();

  const { data: riga, error: insErr } = await admin
    .from("moderation_actions")
    .insert({
      actor_id: input.actorId,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      affected_user_id: input.affectedUserId ?? null,
      affected_email: input.affectedEmail ?? null,
      action: input.action,
      reason,
      report_id: input.reportId ?? null,
    })
    .select("id")
    .single();

  let id: string | null = riga?.id ?? null;
  if (insErr) {
    logger.warn(
      "moderation",
      `registro decisioni non disponibile (${insErr.code}: ${insErr.message}). Applicare la migration 0065. La decisione prosegue.`,
    );
  }
  const reference = riferimento(id ?? crypto.randomUUID());

  if (input.notify === false) return { ok: true, reference, notified: false };

  // Destinatario: l'email esplicita, altrimenti quella dell'account.
  let email = input.affectedEmail ?? null;
  let nome = input.affectedName ?? null;
  if (!email && input.affectedUserId) {
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(input.affectedUserId);
    if (uErr) logger.warn("moderation", "utente non leggibile per la notifica:", uErr.message);
    email = u?.user?.email ?? null;
    if (!nome) {
      const meta = u?.user?.user_metadata as { full_name?: string } | undefined;
      nome = meta?.full_name ?? null;
    }
  }
  if (!email) {
    await segnaNotifica(id, null, "nessun indirizzo email per l'interessato");
    return { ok: true, reference, notified: false };
  }

  const n = input.notify;
  const contestUrl = n.contestable === false ? "" : urlReclamo(reference);
  const saluto = nome?.trim() || "ciao";
  const res = await dispatchEmail({
    key: "moderation_decision",
    to: email,
    params: {
      name: saluto,
      decision: n.decision,
      target: n.target,
      reason,
      consequences: n.consequences ?? "",
      contestUrl,
      reference,
    },
    meta: { reference, target_type: input.targetType, action: input.action },
    fallback: {
      subject: "Una decisione che riguarda il tuo account — N'arte",
      template: "moderation_decision",
      react: createElement(NoticeEmail, {
        preview: "Cosa abbiamo deciso, perché, e come puoi contestarlo.",
        heading: "Una decisione che ti riguarda",
        paragraphs: [
          `Ciao ${saluto}, ${n.decision}`,
          contestUrl
            ? "Se ritieni la decisione sbagliata puoi presentare reclamo entro sei mesi: la riesamina una persona del team e ti rispondiamo con una nuova motivazione. Restano salvi gli altri rimedi previsti dalla legge."
            : "Questa decisione dà seguito a un provvedimento di un'autorità e non può essere riesaminata dalla piattaforma. Restano salvi i rimedi previsti dalla legge.",
        ],
        rows: [
          { label: "Contenuto", value: n.target },
          { label: "Motivo", value: reason },
          { label: "Effetti", value: n.consequences ?? "" },
          { label: "Riferimento", value: reference },
        ],
        button: contestUrl ? { label: "Contesta la decisione", href: contestUrl } : undefined,
      }),
    },
  });

  await segnaNotifica(id, res.ok ? new Date().toISOString() : null, res.ok ? null : "invio non riuscito");
  return { ok: true, reference, notified: res.ok };
}

export type AzioneInput = {
  actorId: string;
  targetType: string;
  targetId?: string | null;
  action: string;
  /** Cosa è stato fatto, in chiaro. Se più corto del minimo, se ne compone una standard. */
  descrizione: string;
  affectedUserId?: string | null;
};

/**
 * Registra un'azione del team che non è una decisione verso un interessato
 * (approvazioni, modifiche di servizio, aperture di conversazione...). Stessa
 * tabella di `registraDecisione`, nessuna email. Non lancia mai: un registro
 * che non risponde non deve bloccare il lavoro del team; l'esito è nel
 * valore di ritorno e nei log.
 */
export async function registraAzione(input: AzioneInput): Promise<DecisioneEsito> {
  try {
    let descrizione = (input.descrizione ?? "").trim();
    if (descrizione.length < MOTIVAZIONE_MIN) {
      descrizione = `Azione ${input.action} su ${input.targetType}${input.targetId ? ` ${input.targetId}` : ""}`;
    }
    const esito = await registraDecisione({
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      action: input.action,
      reason: descrizione.slice(0, 1000),
      affectedUserId: input.affectedUserId ?? null,
      notify: false,
    });
    if (!esito.ok) logger.warn("moderation", "azione non registrata:", esito.error);
    return esito;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("moderation", "azione non registrata:", msg);
    return { ok: false, error: msg };
  }
}

async function segnaNotifica(id: string | null, notifiedAt: string | null, errore: string | null) {
  if (!id) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("moderation_actions")
    .update({ notified_at: notifiedAt, notify_error: errore })
    .eq("id", id);
  if (error) logger.warn("moderation", "esito notifica non registrato:", error.message);
}
