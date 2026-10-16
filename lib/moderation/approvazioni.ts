import "server-only";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Email di esito positivo: contenuti approvati e profilo di nuovo visibile.
 *
 * Sono comunicazioni di cortesia, non decisioni contestabili: non passano da
 * `registraDecisione` (che è per i rifiuti). Non lanciano mai e non bloccano
 * l'azione del team: se la lettura del proprietario o l'invio falliscono si
 * scrive un avviso nei log e si prosegue.
 */

type Destinatario = {
  email: string;
  nome: string;
  profileName: string;
  profileUrl: string;
};

async function destinatarioDelProfilo(artistId: string): Promise<Destinatario | null> {
  try {
    const admin = createAdminClient();
    const { data: artista, error } = await admin
      .from("artists")
      .select("user_id, stage_name, slug")
      .eq("id", artistId)
      .maybeSingle();
    if (error) {
      logger.warn("approvazioni", "profilo non leggibile, email non inviata:", error.message);
      return null;
    }
    if (!artista?.user_id) return null;

    const { data: u, error: uErr } = await admin.auth.admin.getUserById(artista.user_id);
    if (uErr) {
      logger.warn("approvazioni", "proprietario non leggibile, email non inviata:", uErr.message);
      return null;
    }
    const email = u?.user?.email ?? null;
    if (!email) return null;
    const meta = u?.user?.user_metadata as { full_name?: string } | undefined;
    return {
      email,
      nome: meta?.full_name?.trim() || artista.stage_name || "ciao",
      profileName: artista.stage_name,
      profileUrl: `${getSiteUrl()}/artisti/${artista.slug}`,
    };
  } catch (e) {
    logger.warn("approvazioni", "destinatario non determinabile:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** Una sola email per azione, anche quando gli elementi approvati sono molti. */
export async function notificaMediaApprovati(artistId: string | null, itemsLabel: string): Promise<void> {
  if (!artistId) return;
  const d = await destinatarioDelProfilo(artistId);
  if (!d) return;
  try {
    await dispatchEmail({
      key: "media_approved",
      to: d.email,
      params: { name: d.nome, itemsLabel, profileUrl: d.profileUrl },
      meta: { artist_id: artistId },
      fallback: {
        subject: "I tuoi contenuti sono online — N'arte",
        template: "media_approved",
        react: createElement(NoticeEmail, {
          preview: "Il team ha approvato quello che hai caricato.",
          heading: "Contenuti approvati",
          paragraphs: [
            `Ciao ${d.nome}, il team ha esaminato e approvato quello che hai caricato. Da adesso è visibile sul tuo profilo pubblico.`,
          ],
          rows: [{ label: "Contenuti", value: itemsLabel }],
          button: { label: "Guarda il tuo profilo", href: d.profileUrl },
        }),
      },
    });
  } catch (e) {
    logger.warn("approvazioni", "email contenuti approvati non inviata:", e instanceof Error ? e.message : String(e));
  }
}

/** Il profilo è tornato `approved` da `pending` o `rejected`. */
export async function notificaProfiloRiattivato(artistId: string): Promise<void> {
  const d = await destinatarioDelProfilo(artistId);
  if (!d) return;
  try {
    await dispatchEmail({
      key: "profile_reactivated",
      to: d.email,
      params: { name: d.nome, profileName: d.profileName, profileUrl: d.profileUrl },
      meta: { artist_id: artistId },
      fallback: {
        subject: "Il tuo profilo è di nuovo nel catalogo — N'arte",
        template: "profile_reactivated",
        react: createElement(NoticeEmail, {
          preview: "Il profilo è di nuovo visibile nel catalogo pubblico.",
          heading: "Profilo di nuovo visibile",
          paragraphs: [`Ciao ${d.nome}, abbiamo concluso la verifica: il tuo profilo è tornato nel catalogo pubblico.`],
          rows: [{ label: "Profilo", value: d.profileName }],
          button: { label: "Guarda il tuo profilo", href: d.profileUrl },
        }),
      },
    });
  } catch (e) {
    logger.warn("approvazioni", "email profilo riattivato non inviata:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Il profilo non è mai stato nel catalogo? `pending` da solo non basta a dirlo:
 * anche un profilo sospeso torna `pending`. Si guarda il registro: se esiste
 * una sospensione o una precedente approvazione, era già stato pubblicato.
 * Nel dubbio (lettura fallita) si risponde `false`, cioè il testo «di nuovo
 * nel catalogo», che era il comportamento di sempre.
 */
export async function profiloMaiPubblicato(artistId: string, statoPrecedente: string): Promise<boolean> {
  if (statoPrecedente !== "pending") return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("moderation_actions")
      .select("id")
      .eq("target_type", "profilo")
      .eq("target_id", artistId)
      .in("action", ["profilo_sospeso", "profilo_approvato"])
      .limit(1);
    if (error) {
      logger.warn("approvazioni", "storico del profilo non leggibile:", error.message);
      return false;
    }
    return (data?.length ?? 0) === 0;
  } catch (e) {
    logger.warn("approvazioni", "storico del profilo non determinabile:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * Profilo approvato dal team: «approvato» per il nuovo profilo mai pubblicato,
 * «di nuovo nel catalogo» per uno sospeso o rifiutato che torna visibile.
 * `nuovo` va calcolato con `profiloMaiPubblicato` PRIMA di scrivere la riga
 * «profilo_approvato» nel registro, altrimenti il profilo risulterebbe già
 * pubblicato.
 */
export async function notificaProfiloApprovato(artistId: string, nuovo: boolean): Promise<void> {
  if (!nuovo) {
    await notificaProfiloRiattivato(artistId);
    return;
  }
  const d = await destinatarioDelProfilo(artistId);
  if (!d) return;
  try {
    await dispatchEmail({
      key: "profile_approved_new",
      to: d.email,
      params: { name: d.nome, profileName: d.profileName, profileUrl: d.profileUrl },
      meta: { artist_id: artistId },
      fallback: {
        subject: "Il tuo nuovo profilo è stato approvato — N'arte",
        template: "profile_approved_new",
        react: createElement(NoticeEmail, {
          preview: "Il tuo nuovo profilo è nel catalogo pubblico.",
          heading: "Profilo approvato",
          paragraphs: [`Ciao ${d.nome}, il tuo nuovo profilo è stato approvato ed è nel catalogo.`],
          rows: [{ label: "Profilo", value: d.profileName }],
          button: { label: "Guarda il tuo profilo", href: d.profileUrl },
        }),
      },
    });
  } catch (e) {
    logger.warn("approvazioni", "email profilo approvato non inviata:", e instanceof Error ? e.message : String(e));
  }
}

/** «2 foto, 1 traccia audio e 1 video», senza voci a zero. */
export function etichettaContenuti(foto: number, audio: number, video: number): string {
  const parti: string[] = [];
  if (foto > 0) parti.push(foto === 1 ? "1 foto" : `${foto} foto`);
  if (audio > 0) parti.push(audio === 1 ? "1 traccia audio" : `${audio} tracce audio`);
  if (video > 0) parti.push(video === 1 ? "1 video" : `${video} video`);
  if (parti.length === 0) return "i tuoi contenuti";
  if (parti.length === 1) return parti[0];
  return `${parti.slice(0, -1).join(", ")} e ${parti[parti.length - 1]}`;
}
