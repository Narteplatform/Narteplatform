"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { normalizzaEmail } from "@/lib/referrals/optout";
import { meseCorrente, tabellaAssente } from "@/lib/referrals/periodo";
import { logger } from "@/lib/logger";
import { registraAzione } from "@/lib/moderation/decisioni";
import { colonnaAssente } from "@/lib/admin/schema-compat";

/**
 * Registro delle segnalazioni promozionali del piano Max.
 *
 * Dal parere legale di novembre 2026 la segnalazione è un INVIO DI MATERIALE
 * PUBBLICITARIO fatto dal Team fuori dalla piattaforma, per conto dell'artista,
 * a strutture del settore. La piattaforma non invia nulla: qui si registra
 * soltanto l'invio, perché è la prova che la quota mensile del Max è stata
 * rispettata. Niente destinatari privati (persone fisiche): erano il punto
 * critico dell'art. 130 del Codice privacy.
 */

export type SegnalazioneState = { error?: string; ok?: string };

const MSG_MIGRATION = "Registro delle segnalazioni assente: applica la migration 0068 dal SQL editor.";

const schema = z.object({
  artistId: z.string().uuid("Scegli un artista"),
  // "venue:<uuid>" | "org:<uuid>" | "manual"
  recipient: z.string().min(1, "Scegli la struttura"),
  manualName: z.string().trim().max(120).optional(),
  manualEmail: z.string().trim().max(200).optional(),
  note: z
    .string()
    .trim()
    .min(5, "Descrivi cosa è stato inviato e come (almeno 5 caratteri).")
    .max(500, "La descrizione può avere al massimo 500 caratteri"),
});

const emailSchema = z.string().email();
const uuidSchema = z.string().uuid();

type Destinatario = {
  name: string;
  /** Facoltativa: l'invio avviene fuori piattaforma. "" se assente. */
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
    if (name.length < 2) return { ok: false, error: "Inserisci il nome della struttura." };
    if (email !== "" && !emailSchema.safeParse(email).success) {
      return { ok: false, error: "Email della struttura non valida (puoi lasciarla vuota)." };
    }
    return { ok: true, dest: { name, email, organizerId: null, venueId: null } };
  }

  const [kind, id] = d.recipient.split(":");
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: "Struttura non valida." };

  if (kind === "venue") {
    const { data, error } = await admin
      .from("venues")
      .select("id, name, email, organizer_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, error: "Non riesco a leggere la struttura. Riprova." };
    if (!data) return { ok: false, error: "Struttura non trovata." };
    return {
      ok: true,
      dest: {
        name: data.name,
        email: normalizzaEmail(data.email ?? ""),
        organizerId: data.organizer_id,
        venueId: data.id,
      },
    };
  }

  if (kind === "org") {
    let res = await admin
      .from("organizers")
      .select("id, display_name, is_private, approval_status")
      .eq("id", id)
      .maybeSingle();
    // approval_status arriva con la 0071: senza, sono tutti approvati.
    if (colonnaAssente(res.error, "approval_status")) {
      res = (await admin
        .from("organizers")
        .select("id, display_name, is_private")
        .eq("id", id)
        .maybeSingle()) as typeof res;
    }
    if (res.error) return { ok: false, error: "Non riesco a leggere l'organizzatore. Riprova." };
    const o = res.data;
    if (!o) return { ok: false, error: "Organizzatore non trovato." };
    if (o.is_private) return { ok: false, error: "Le segnalazioni vanno solo a strutture, non a privati." };
    if ("approval_status" in o && (o.approval_status ?? "approved") !== "approved") {
      return { ok: false, error: "L'organizzatore non è ancora approvato." };
    }
    return { ok: true, dest: { name: o.display_name, email: "", organizerId: o.id, venueId: null } };
  }

  return { ok: false, error: "Struttura non valida." };
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

  // 1. L'artista deve avere il piano Max.
  const { data: artist, error: aErr } = await admin
    .from("artists")
    .select("id, stage_name, tier")
    .eq("id", data.artistId)
    .maybeSingle();
  if (aErr) return { error: "Non riesco a leggere l'artista. Riprova." };
  if (!artist) return { error: "Artista non trovato." };
  if (artist.tier !== "max") return { error: "L'artista non ha il piano Max." };

  // 2. La struttura, riletta dal server: dal client arrivano solo gli id.
  const ris = await risolviDestinatario(admin, data);
  if (!ris.ok) return { error: ris.error };
  const dest = ris.dest;

  // 3. Stessa coppia artista/struttura già registrata questo mese: si evita il doppione.
  const periodo = meseCorrente();
  let doppione = admin
    .from("profile_referrals")
    .select("id")
    .eq("artist_id", artist.id)
    .eq("period_month", periodo)
    .eq("email_status", "inviata")
    .limit(1);
  doppione = dest.venueId
    ? doppione.eq("venue_id", dest.venueId)
    : dest.organizerId
      ? doppione.eq("organizer_id", dest.organizerId)
      : doppione.ilike("recipient_name", dest.name);
  const { data: gia, error: gErr } = await doppione;
  if (gErr) {
    if (tabellaAssente(gErr.code)) return { error: MSG_MIGRATION };
    logger.error("referrals", "controllo doppioni fallito:", gErr.message);
    return { error: "Non riesco a controllare le segnalazioni già registrate. Riprova." };
  }
  if ((gia ?? []).length > 0) {
    return { error: "Per questo artista un invio a questa struttura è già registrato nel mese in corso." };
  }

  // 4. Registro. «inviata» = invio fuori piattaforma effettuato: è ciò che conta nella quota.
  const { data: riga, error: insErr } = await admin
    .from("profile_referrals")
    .insert({
      artist_id: artist.id,
      sent_by: user.id,
      recipient_name: dest.name,
      recipient_email: dest.email,
      organizer_id: dest.organizerId,
      venue_id: dest.venueId,
      note: data.note,
      period_month: periodo,
      email_status: "inviata",
    })
    .select("id")
    .single();
  if (insErr || !riga) {
    if (insErr && tabellaAssente(insErr.code)) return { error: MSG_MIGRATION };
    logger.error("referrals", "registrazione segnalazione fallita:", insErr?.message);
    return { error: "Non sono riuscito a registrare l'invio. Riprova." };
  }

  await registraAzione({
    actorId: user.id,
    targetType: "segnalazione_profilo",
    targetId: riga.id,
    action: "segnalazione_profilo_registrata",
    descrizione: `Materiale promozionale di «${artist.stage_name}» inviato a ${dest.name} (fuori piattaforma).`,
  });

  revalidatePath("/admin/proposte");
  revalidatePath("/dashboard/overview");

  return { ok: `Invio a ${dest.name} registrato.` };
}
