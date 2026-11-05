"use server";

import { logger } from "@/lib/logger";
import { avvisaTeam } from "@/lib/notifications/team";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { teamMessageSchema, type TeamMessageInput } from "@/lib/validators/schemas";
import { creaNotificheAdmin } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createElement } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { emailAlTeam } from "@/lib/notifications/team";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { buildConsultationParams } from "@/lib/emails/consultation-params";
import ConsultationRequestEmail from "@/lib/emails/templates/ConsultationRequestEmail";
import { checkMonthlyQuota, getEntitlementsForUser } from "@/lib/billing/entitlements";
import { resolveActiveArtist } from "@/lib/artist/current";
import { adminRecipients } from "@/lib/emails/admin-recipients";

// Notifiche al team: la casella interna configurata, altrimenti il recapito unico.
const ADMIN_EMAIL = adminRecipients({ fallback: true });

const bookSchema = z.object({
  slotId: z.string().uuid(),
  needs: z.string().trim().max(1000).optional(),
});

export async function bookConsultationAsArtist(input: {
  slotId: string;
  needs?: string;
}) {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Devi accedere come artista" };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "artist" && role !== "superadmin") {
    return { ok: false as const, error: "Solo artisti possono prenotare con auto-conferma" };
  }

  // Quota di piano. Il superadmin non ha un profilo artista collegato e non
  // viene limitato: prenota per conto del team.
  if (role === "artist") {
    const ctx = await getEntitlementsForUser(user.id);
    if (ctx) {
      const quota = await checkMonthlyQuota(
        { artistId: ctx.artistId, userId: user.id },
        ctx.entitlements,
        "consultation"
      );
      if (!quota.ok) return { ok: false as const, error: quota.error };
    }
  }

  const { data: slot } = await admin
    .from("consultant_slots")
    .select("id, slot_at, duration_min, consultant_id, is_active")
    .eq("id", parsed.data.slotId)
    .maybeSingle();
  if (!slot || !slot.is_active) {
    return { ok: false as const, error: "Slot non disponibile" };
  }

  // Verifica che non sia già preso
  const { data: existing } = await admin
    .from("consultations")
    .select("id")
    .eq("slot_id", parsed.data.slotId)
    .in("status", ["requested", "confirmed"])
    .maybeSingle();
  if (existing) {
    return { ok: false as const, error: "Slot già prenotato" };
  }

  // Recupera nome artista
  let displayName = (profile as { full_name?: string | null } | null)?.full_name ?? null;
  if (!displayName) {
    // Profilo attivo: con più profili, .maybeSingle() qui andrebbe in errore.
    const active = await resolveActiveArtist(user.id);
    displayName = active?.stage_name ?? "Artista";
  }

  const { error } = await admin.from("consultations").insert({
    slot_id: parsed.data.slotId,
    user_id: user.id,
    name: displayName,
    email: user.email ?? "",
    phone: null,
    needs: parsed.data.needs ?? null,
    status: "confirmed",
  });
  if (error) return { ok: false as const, error: error.message };

  // Email notifica
  const slotAt = new Date(slot.slot_at).toLocaleString("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const needsText = parsed.data.needs ?? "Prenotazione artista (auto-confermata).";
  const mailParams = await buildConsultationParams(admin, {
    slotAt: slot.slot_at,
    durationMin: slot.duration_min,
    consultantId: slot.consultant_id,
    name: displayName ?? "Artista",
    email: user.email ?? "",
    phone: "",
    notes: needsText,
    statusLabel: "Confermato",
    panelPath: "/dashboard/consulenza",
  });
  await Promise.all([
    user.email
      ? dispatchEmail({
          key: "consultation_confirmed_artist",
          to: user.email,
          params: mailParams,
          fallback: {
            subject: `Appuntamento confermato con N'arte · ${slotAt}`,
            template: "ConsultationConfirmedArtist",
            react: createElement(ConsultationRequestEmail, {
              toRole: "user",
              name: displayName ?? "Artista",
              slotAt,
              needs: needsText,
            }),
          },
        }).catch((e) => console.error("[email] artist book:", e))
      : Promise.resolve(),
    dispatchEmail({
      key: "consultation_confirmed_admin",
      to: ADMIN_EMAIL,
      params: mailParams,
      fallback: {
        subject: `Artista ha prenotato consulenza · ${displayName}`,
        template: "ConsultationConfirmedAdmin",
        react: createElement(ConsultationRequestEmail, {
          toRole: "admin",
          name: displayName ?? "Artista",
          email: user.email ?? undefined,
          slotAt,
          needs: needsText,
        }),
      },
    }).catch((e) => console.error("[email] artist book admin:", e)),
    creaNotificheAdmin({
      kind: "admin_consulenza",
      title: `Consulenza prenotata: ${displayName ?? "Artista"}`,
      body: slotAt,
      href: "/admin/consulenza/confermati",
    }),
  ]);

  revalidatePath("/dashboard/consulenza");
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}

/**
 * Disdetta di una consulenza da parte dell'artista (doc. 03, art. 8).
 *
 * Prima si poteva disdire solo scrivendo ai contatti. Ora la disdetta è in
 * autonomia fino a 24 ore prima dell'appuntamento; dopo, resta il contatto con
 * il team. Una consulenza disdetta non consuma la quota del mese.
 */
const PREAVVISO_MS = 24 * 3600 * 1000;

export async function cancelConsultationAsArtist(consultationId: string) {
  const idOk = z.string().uuid().safeParse(consultationId);
  if (!idOk.success) return { ok: false as const, error: "Consulenza non valida" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Devi accedere" };

  const admin = createAdminClient();
  const { data: c, error: readErr } = await admin
    .from("consultations")
    .select("id, user_id, status, slot_id, name")
    .eq("id", idOk.data)
    .maybeSingle();
  if (readErr) return { ok: false as const, error: "Non è stato possibile leggere la consulenza." };
  if (!c || c.user_id !== user.id) return { ok: false as const, error: "Consulenza non trovata" };
  if (c.status !== "requested" && c.status !== "confirmed") {
    return { ok: false as const, error: "Questa consulenza non è più attiva." };
  }

  const { data: slot, error: slotErr } = c.slot_id
    ? await admin.from("consultant_slots").select("slot_at").eq("id", c.slot_id).maybeSingle()
    : { data: null, error: null };
  if (slotErr) return { ok: false as const, error: "Non è stato possibile leggere l'appuntamento." };
  if (slot && new Date(slot.slot_at).getTime() - Date.now() < PREAVVISO_MS) {
    return {
      ok: false as const,
      error: "Mancano meno di 24 ore: per disdire scrivi al team dalla pagina contatti.",
    };
  }

  const { data: aggiornate, error } = await admin
    .from("consultations")
    .update({ status: "cancelled" })
    .eq("id", c.id)
    .in("status", ["requested", "confirmed"])
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "La consulenza è cambiata nel frattempo: ricarica la pagina." };
  }

  const quando = slot
    ? new Date(slot.slot_at).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" })
    : "data da definire";
  await emailAlTeam({
    to: ADMIN_EMAIL,
    oggetto: `Consulenza disdetta dall'artista · ${c.name ?? "Artista"} · ${quando}`,
    messaggio: `${c.name ?? "Artista"} ha disdetto dalla propria area la consulenza del ${quando}. Lo slot è di nuovo libero.`,
    adminPath: "/admin/consulenza",
  });
  await creaNotificheAdmin({
    kind: "admin_consulenza",
    title: `Consulenza disdetta: ${c.name ?? "Artista"}`,
    body: quando,
    href: "/admin/consulenza",
  });

  revalidatePath("/dashboard/consulenza");
  revalidatePath("/admin/consulenza");
  return { ok: true as const };
}

/** Al massimo un messaggio al minuto e 10 al giorno per account. */
const LIMITE_GIORNO = 10;

/**
 * «Scrivi al team» dalla pagina Consulente: serve soprattutto quando non ci
 * sono slot liberi. Il messaggio si salva in team_messages (visibile in
 * /admin/consulenza/messaggi), arriva come notifica in tempo reale ai
 * superadmin e per email alla casella del team, con risposta diretta
 * all'artista. Senza la tabella (0076 non applicata) parte solo l'email.
 */
export async function inviaMessaggioAlTeam(input: TeamMessageInput) {
  const parsed = teamMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Devi accedere" };

  const admin = createAdminClient();
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profErr) return { ok: false as const, error: "Non è stato possibile verificare il tuo account." };
  const role = profile?.role === "organizer" ? "organizer" : profile?.role === "artist" ? "artist" : null;
  if (!role) return { ok: false as const, error: "Funzione riservata ad artisti e organizzatori." };

  const attivo = role === "artist" ? await resolveActiveArtist(user.id) : null;

  // Tetto per account indipendente da team_messages: vale anche prima della
  // 0076, quando parte solo l'email (senza, un invio in loop sommergerebbe
  // la casella del team).
  if (!(await checkRateLimit({ scope: "team-message", windowSeconds: 86_400, max: LIMITE_GIORNO }, user.id))) {
    return { ok: false as const, error: "Hai già scritto più volte oggi: ti risponderemo al più presto." };
  }

  // Limite anti-raffica, letto dalla tabella stessa. Se la lettura fallisce
  // per tabella mancante si prosegue (solo email); per altri errori ci si ferma.
  let tabellaPresente = true;
  const giorno = new Date(Date.now() - 86_400_000).toISOString();
  const { data: recenti, error: recErr } = await admin
    .from("team_messages")
    .select("created_at")
    .eq("user_id", user.id)
    .gt("created_at", giorno)
    .order("created_at", { ascending: false })
    .limit(LIMITE_GIORNO);
  if (recErr) {
    if (recErr.code === "42P01" || recErr.code === "PGRST205") tabellaPresente = false;
    else {
      logger.error("team", "lettura messaggi recenti:", recErr.message);
      return { ok: false as const, error: "Non è stato possibile inviare il messaggio. Riprova tra poco." };
    }
  } else {
    const righe = recenti ?? [];
    if (righe.length >= LIMITE_GIORNO) {
      return { ok: false as const, error: "Hai già scritto più volte oggi: ti risponderemo al più presto." };
    }
    if (righe[0] && Date.now() - new Date(righe[0].created_at).getTime() < 60_000) {
      return { ok: false as const, error: "Hai appena inviato un messaggio: attendi un minuto." };
    }
  }

  if (tabellaPresente) {
    const { error } = await admin.from("team_messages").insert({
      user_id: user.id,
      artist_id: attivo?.id ?? null,
      role,
      subject: parsed.data.subject,
      body: parsed.data.body,
    });
    if (error) {
      logger.error("team", "salvataggio messaggio:", error.message);
      return { ok: false as const, error: "Non è stato possibile inviare il messaggio. Riprova tra poco." };
    }
  }

  const nome = profile?.full_name || user.email || "Utente";
  const chi = attivo ? `${nome} · Artista «${attivo.stage_name}»` : `${nome} · ${role === "artist" ? "Artista" : "Organizzatore"}`;
  await avvisaTeam({
    kind: "admin_messaggio_team",
    titolo: `Messaggio al team da ${chi}`,
    anteprima: parsed.data.subject,
    adminPath: tabellaPresente ? "/admin/consulenza/messaggi" : "/admin/consulenza",
    mittente: { nome: chi, email: user.email ?? null },
    oggettoEmail: `Messaggio dalla pagina Consulente: ${parsed.data.subject}`,
    messaggio: parsed.data.body,
  });

  revalidatePath("/admin/consulenza/messaggi");
  return { ok: true as const };
}
