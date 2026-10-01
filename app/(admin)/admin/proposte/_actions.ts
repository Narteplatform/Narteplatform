"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { dispatchEmail } from "@/lib/emails/dispatch";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { creaTokenOptout, hashEmail, normalizzaEmail } from "@/lib/referrals/optout";
import { meseCorrente, tabellaAssente } from "@/lib/referrals/periodo";
import { logger } from "@/lib/logger";
import { registraAzione } from "@/lib/moderation/decisioni";

export type SegnalazioneState = { error?: string; ok?: string };

const MSG_MIGRATION = "Registro delle segnalazioni assente: applica la migration 0068 dal SQL editor.";

const schema = z.object({
  artistId: z.string().uuid("Scegli un artista"),
  // "venue:<uuid>" | "org:<uuid>" | "manual"
  recipient: z.string().min(1, "Scegli il destinatario"),
  manualName: z.string().trim().max(120).optional(),
  manualEmail: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500, "La nota può avere al massimo 500 caratteri").optional(),
});

const emailSchema = z.string().email();
const uuidSchema = z.string().uuid();

type Destinatario = {
  name: string;
  email: string;
  organizerId: string | null;
  venueId: string | null;
};

type Risolto = { ok: true; dest: Destinatario } | { ok: false; error: string };

async function risolviDestinatario(
  admin: ReturnType<typeof createAdminClient>,
  d: z.infer<typeof schema>,
): Promise<Risolto> {
  if (d.recipient === "manual") {
    const name = (d.manualName ?? "").trim();
    const email = normalizzaEmail(d.manualEmail ?? "");
    if (name.length < 2) return { ok: false, error: "Inserisci il nome del destinatario." };
    if (!emailSchema.safeParse(email).success) return { ok: false, error: "Email del destinatario non valida." };
    return { ok: true, dest: { name, email, organizerId: null, venueId: null } };
  }

  const [kind, id] = d.recipient.split(":");
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Destinatario non valido." };

  if (kind === "venue") {
    const { data, error } = await admin
      .from("venues")
      .select("id, name, email, organizer_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, error: "Non riesco a leggere la struttura. Riprova." };
    if (!data) return { ok: false, error: "Struttura non trovata." };
    const email = normalizzaEmail(data.email ?? "");
    if (!emailSchema.safeParse(email).success) return { ok: false, error: "La struttura non ha un'email valida." };
    return { ok: true, dest: { name: data.name, email, organizerId: data.organizer_id, venueId: data.id } };
  }

  if (kind === "org") {
    const { data, error } = await admin
      .from("organizers")
      .select("id, user_id, display_name")
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, error: "Non riesco a leggere l'organizzatore. Riprova." };
    if (!data) return { ok: false, error: "Organizzatore non trovato." };
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(data.user_id);
    if (uErr) return { ok: false, error: "Non riesco a leggere l'email dell'organizzatore. Riprova." };
    const email = normalizzaEmail(u?.user?.email ?? "");
    if (!emailSchema.safeParse(email).success) return { ok: false, error: "L'organizzatore non ha un'email valida." };
    return { ok: true, dest: { name: data.display_name, email, organizerId: data.id, venueId: null } };
  }

  return { ok: false, error: "Destinatario non valido." };
}

export async function inviaSegnalazioneProfilo(
  _prev: SegnalazioneState,
  formData: FormData,
): Promise<SegnalazioneState> {
  const user = await requireAdminPageAccess("proposte");

  const parsed = schema.safeParse({
    artistId: formData.get("artistId"),
    recipient: formData.get("recipient") ?? "",
    manualName: String(formData.get("manualName") ?? ""),
    manualEmail: String(formData.get("manualEmail") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const data = parsed.data;

  const admin = createAdminClient();

  // 1. L'artista: deve avere il piano Max e un profilo pubblico (il link deve aprirsi).
  const { data: artist, error: aErr } = await admin
    .from("artists")
    .select("id, stage_name, slug, genre, instruments, city, tier, is_public")
    .eq("id", data.artistId)
    .maybeSingle();
  if (aErr) return { error: "Non riesco a leggere l'artista. Riprova." };
  if (!artist) return { error: "Artista non trovato." };
  if (artist.tier !== "max") return { error: "L'artista non ha il piano Max." };
  if (!artist.is_public) return { error: "Il profilo non è pubblico: il link non si aprirebbe." };

  // 2. Il destinatario, riletto dal server: dal client arrivano solo gli id.
  const ris = await risolviDestinatario(admin, data);
  if (!ris.ok) return { error: ris.error };
  const dest = ris.dest;

  // 3. Opt-out.
  const { data: optout, error: oErr } = await admin
    .from("referral_optouts")
    .select("email_hash")
    .eq("email_hash", hashEmail(dest.email))
    .maybeSingle();
  if (oErr) {
    if (tabellaAssente(oErr.code)) return { error: MSG_MIGRATION };
    logger.error("referrals", "lettura opt-out fallita:", oErr.message);
    return { error: "Non riesco a verificare le disattivazioni. Non invio nulla: riprova." };
  }
  if (optout) {
    return { error: "Questo destinatario ha disattivato le segnalazioni. Non è possibile inviargliene." };
  }

  const token = creaTokenOptout(dest.email);
  if (!token) return { error: "Segreto per il link di disattivazione non configurato (REFERRAL_OPTOUT_SECRET)." };

  // 4. Stessa coppia artista/destinatario già segnalata questo mese: si evita il doppione.
  const periodo = meseCorrente();
  const { data: gia, error: gErr } = await admin
    .from("profile_referrals")
    .select("id")
    .eq("artist_id", artist.id)
    .eq("period_month", periodo)
    .eq("recipient_email", dest.email)
    .eq("email_status", "inviata")
    .limit(1);
  if (gErr) {
    if (tabellaAssente(gErr.code)) return { error: MSG_MIGRATION };
    logger.error("referrals", "controllo doppioni fallito:", gErr.message);
    return { error: "Non riesco a controllare le segnalazioni già inviate. Riprova." };
  }
  if ((gia ?? []).length > 0) {
    return { error: "Questo destinatario ha già ricevuto la segnalazione di questo artista nel mese in corso." };
  }

  // 5. Registro prima dell'invio: se l'email parte, la traccia esiste già.
  const nota = (data.note ?? "").trim();
  const { data: riga, error: insErr } = await admin
    .from("profile_referrals")
    .insert({
      artist_id: artist.id,
      sent_by: user.id,
      recipient_name: dest.name,
      recipient_email: dest.email,
      organizer_id: dest.organizerId,
      venue_id: dest.venueId,
      note: nota === "" ? null : nota,
      period_month: periodo,
    })
    .select("id")
    .single();
  if (insErr || !riga) {
    if (insErr && tabellaAssente(insErr.code)) return { error: MSG_MIGRATION };
    logger.error("referrals", "registrazione segnalazione fallita:", insErr?.message);
    return { error: "Non sono riuscito a registrare la segnalazione, quindi non l'ho inviata." };
  }

  // 6. Invio.
  const siteUrl = getSiteUrl();
  const profileUrl = `${siteUrl}/artisti/${artist.slug}`;
  const unsubscribeUrl = `${siteUrl}/segnalazioni/stop?t=${encodeURIComponent(token)}`;
  const summary = [
    (artist.genre ?? []).slice(0, 3).join(", "),
    (artist.instruments ?? []).slice(0, 3).join(", "),
    artist.city ?? "",
  ]
    .filter((s) => s.trim() !== "")
    .join(" · ");

  const res = await dispatchEmail({
    key: "profile_referral",
    to: dest.email,
    params: {
      recipientName: dest.name,
      artistName: artist.stage_name,
      artistSummary: summary,
      profileUrl,
      note: nota,
      unsubscribeUrl,
    },
    meta: { referral_id: riga.id, artist_id: artist.id },
    fallback: {
      subject: `Ti segnaliamo ${artist.stage_name} — N'Arte`,
      template: "profile_referral",
      react: createElement(NoticeEmail, {
        preview: "Un profilo che potrebbe interessarvi.",
        heading: `Vi segnaliamo ${artist.stage_name}`,
        paragraphs: [
          `Ciao ${dest.name}, pensiamo che questo profilo possa interessarvi.`,
          "Se l'artista vi interessa, contattatelo direttamente dalla piattaforma con una richiesta di booking. N'arte non partecipa alla trattativa, non stabilisce il compenso e non è parte dell'accordo. L'artista ha un abbonamento Max, che include questa segnalazione.",
        ],
        rows: [
          { label: "Artista", value: artist.stage_name },
          { label: "In breve", value: summary },
          { label: "Nota", value: nota },
        ],
        button: { label: "Guarda il profilo", href: profileUrl },
        footnote: `Non volete ricevere altre segnalazioni? Disattivatele qui: ${unsubscribeUrl}`,
      }),
    },
  });

  if (res.ok) {
    const { error: upErr } = await admin
      .from("profile_referrals")
      .update({ email_status: "inviata" })
      .eq("id", riga.id);
    if (upErr) {
      logger.error("referrals", "esito invio non registrato (email partita):", upErr.message);
    }
  }

  await registraAzione({
    actorId: user.id,
    targetType: "segnalazione_profilo",
    targetId: riga.id,
    action: res.ok ? "segnalazione_profilo_inviata" : "segnalazione_profilo_registrata",
    descrizione: `Profilo «${artist.stage_name}» segnalato a ${dest.name}${res.ok ? "" : " (email non partita)"}.`,
  });

  revalidatePath("/admin/proposte");
  revalidatePath("/dashboard/overview");

  if (!res.ok) {
    return {
      error:
        "La segnalazione è registrata ma l'email non è partita. Controlla il registro email e riprova fra un momento.",
    };
  }
  return { ok: `Segnalazione inviata a ${dest.name}.` };
}
