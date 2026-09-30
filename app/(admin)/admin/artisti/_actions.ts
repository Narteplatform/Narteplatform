"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";
import { artistSchema, type ArtistInput } from "@/lib/validators/schemas";
import { sendEmail, sendBookingCancelledByAdminEmail } from "@/lib/emails/send";
import ArtistApprovedEmail from "@/lib/emails/templates/ArtistApprovedEmail";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { registraDecisione, MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";
import { verificaProprietarioNonSospeso } from "@/lib/admin/sospensione";
import { nascondiRecensioniDiBookingAnnullato } from "@/lib/feedback/moderation";
import { logger } from "@/lib/logger";

// Una Server Action è un endpoint HTTP raggiungibile direttamente (non solo
// dalla UI): il solo controllo `role === "superadmin"` non bastava, perché un
// superadmin delegato a cui la pagina "Artisti" è nascosta poteva comunque
// invocare queste azioni (es. regalarsi un piano Max via updateArtistTier).
// requireAdminPageAccess verifica anche il permesso per-pagina e, se manca,
// ridireziona — lo stesso comportamento già applicato alla pagina.

/**
 * La motivazione di una decisione viene inviata all'interessato e registrata
 * (art. 17 DSA): stesso minimo di lib/moderation/decisioni.ts.
 */
function motivazione(raw: string | undefined | null, obbligatoria: boolean):
  | { ok: true; reason: string | null }
  | { ok: false; error: string } {
  const r = (raw ?? "").trim();
  if (r.length === 0 && !obbligatoria) return { ok: true, reason: null };
  if (r.length < MOTIVAZIONE_MIN) {
    return {
      ok: false,
      error: `Indica la motivazione (almeno ${MOTIVAZIONE_MIN} caratteri): viene inviata all'interessato.`,
    };
  }
  return { ok: true, reason: r.slice(0, 1000) };
}

const tierOverrideSchema = z.object({
  tier: z.enum(["free", "pro", "max"]),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
});

export type TierOverrideInput = z.infer<typeof tierOverrideSchema>;

/**
 * Concede (o revoca) un override manuale del piano — un omaggio, una
 * partnership, un comp.
 *
 * NON scrive `artists.tier`: quella colonna è una cache derivata, protetta a
 * livello DB dal trigger di 0038, e ricalcolata da `compute_artist_tier()` =
 * coalesce(override valido, subscription Stripe live, free). Scriverla
 * direttamente — come faceva la versione precedente — significava che il primo
 * webhook Stripe successivo avrebbe cancellato l'omaggio senza lasciare traccia.
 *
 * `tier: "free"` = "nessun override", non "declassa": se l'artista ha una
 * subscription attiva quella continua a valere. Per togliere un piano pagato si
 * cancella la subscription su Stripe.
 */
export async function updateArtistTier(artistId: string, input: TierOverrideInput) {
  const user = await requireAdminPageAccess("artisti");

  const parsed = tierOverrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati override non validi" };

  // Un piano omaggio dà gli stessi vantaggi di uno pagato, compreso il posto
  // in cima al catalogo: va motivato, perché i criteri di posizionamento
  // (doc. 07, art. 8.4) promettono che gli omaggi seguano criteri dichiarati.
  const concede = parsed.data.tier === "pro" || parsed.data.tier === "max";
  if (concede && (parsed.data.reason ?? "").trim().length < 10) {
    return {
      ok: false as const,
      error: "Indica il motivo dell'omaggio (almeno 10 caratteri): resta nel registro.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_artist_tier", {
    p_artist_id: artistId,
    p_tier: parsed.data.tier,
    p_expires_at: parsed.data.expiresAt ?? null,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return { ok: false as const, error: error.message };

  if (concede) {
    const esito = await registraDecisione({
      actorId: user.id,
      targetType: "profilo",
      targetId: artistId,
      action: `omaggio_${parsed.data.tier}`,
      reason: (parsed.data.reason ?? "").trim(),
      notify: false,
    });
    if (!esito.ok) logger.warn("artisti", "omaggio non registrato:", esito.error);
  }

  revalidatePath(`/admin/artisti/${artistId}`);
  revalidatePath("/admin/artisti");
  revalidatePath("/dashboard/profilo-artista");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function approveApplication(applicationId: string) {
  await requireAdminPageAccess("artisti");

  const admin = createAdminClient();
  const { data: app, error: appErr } = await admin
    .from("artist_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (appErr || !app) return { ok: false as const, error: "Candidatura non trovata" };

  const redirectTo = `${getSiteUrl()}/login`;
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(app.email, {
    redirectTo,
    data: { full_name: app.name },
  });
  if (inviteErr && !inviteErr.message.toLowerCase().includes("already")) {
    return { ok: false as const, error: inviteErr.message };
  }

  let userId = invite?.user?.id ?? null;
  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list.users.find((u) => u.email?.toLowerCase() === app.email.toLowerCase())?.id ?? null;
  }

  // Un account sospeso non può avere profili approvati: si ferma prima di
  // scrivere qualsiasi cosa (profilo, ruolo, stato della candidatura).
  const proprietario = await verificaProprietarioNonSospeso(userId);
  if (!proprietario.ok) return { ok: false as const, error: proprietario.error };

  if (userId) {
    await admin.from("profiles").update({ role: "artist" }).eq("id", userId);
  }

  const slugBase = slugify(app.stage_name);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  const { error: insertErr } = await admin.from("artists").insert({
    user_id: userId,
    stage_name: app.stage_name,
    slug,
    bio: app.bio,
    genre: app.genre,
    social_links: app.links,
    status: "approved",
  });
  if (insertErr) return { ok: false as const, error: insertErr.message };

  await admin.from("artist_applications").update({ status: "approved" }).eq("id", applicationId);

  // Email brandizzata con magic link per impostare la password
  const siteUrl = getSiteUrl();
  let actionLink: string | null = null;
  try {
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email: app.email,
      options: { redirectTo: `${siteUrl}/login` },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      actionLink = linkData.properties.action_link;
    } else {
      // Fallback: recovery link se l'utente esiste già
      const { data: recoveryData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: app.email,
        options: { redirectTo: `${siteUrl}/login` },
      });
      if (recoveryData?.properties?.action_link) {
        actionLink = recoveryData.properties.action_link;
      }
    }
  } catch (e) {
    logger.error("artisti", "approveApplication generateLink:", e instanceof Error ? e.message : String(e));
  }

  if (actionLink) {
    await sendEmail({
      to: app.email,
      subject: "Candidatura approvata — N'arte",
      template: "ArtistApproved",
      react: ArtistApprovedEmail({
        applicantName: app.name,
        stageName: app.stage_name,
        actionUrl: actionLink,
      }),
    });
  }

  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function rejectApplication(applicationId: string, reason: string) {
  const user = await requireAdminPageAccess("artisti");
  const m = motivazione(reason, true);
  if (!m.ok || !m.reason) return { ok: false as const, error: m.ok ? "Motivazione mancante" : m.error };

  const admin = createAdminClient();
  const { data: app, error: appErr } = await admin
    .from("artist_applications")
    .select("id, name, email, stage_name, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (appErr) return { ok: false as const, error: appErr.message };
  if (!app) return { ok: false as const, error: "Candidatura non trovata" };

  const { error } = await admin
    .from("artist_applications")
    .update({ status: "rejected" })
    .eq("id", applicationId);
  if (error) return { ok: false as const, error: error.message };

  // Nessun account esiste ancora: si scrive all'indirizzo della candidatura.
  const esito = await registraDecisione({
    actorId: user.id,
    targetType: "candidatura",
    targetId: applicationId,
    action: "rifiuto_candidatura",
    reason: m.reason,
    affectedEmail: app.email,
    affectedName: app.name,
    notify: {
      decision: "Non abbiamo approvato la tua candidatura come artista su N'arte.",
      target: `Candidatura "${app.stage_name}"`,
      consequences: "Il profilo non è stato creato. Puoi ricandidarti quando vuoi.",
    },
  });
  if (!esito.ok) logger.warn("artisti", "rifiuto candidatura non registrato:", esito.error);

  revalidatePath("/admin/artisti");
  return { ok: true as const };
}

export async function updateArtistStatus(
  artistId: string,
  status: "pending" | "approved" | "rejected",
  reason?: string,
) {
  const user = await requireAdminPageAccess("artisti");
  const admin = createAdminClient();

  // Si legge lo stato attuale PRIMA di scrivere: se la lettura fallisce ci si
  // ferma, non si decide al buio.
  const { data: current, error: readErr } = await admin
    .from("artists")
    .select("status, user_id, stage_name")
    .eq("id", artistId)
    .maybeSingle();
  if (readErr) return { ok: false as const, error: readErr.message };
  if (!current) return { ok: false as const, error: "Profilo non trovato" };
  if (current.status === status) return { ok: true as const };

  if (status === "approved") {
    const proprietario = await verificaProprietarioNonSospeso(current.user_id);
    if (!proprietario.ok) return { ok: false as const, error: proprietario.error };
  }

  // Serve una motivazione quando il profilo esce dal catalogo (da approvato a
  // in attesa o rifiutato) e quando un profilo in attesa viene rifiutato.
  const negativa = status !== "approved";
  const m = motivazione(reason, negativa);
  if (!m.ok) return { ok: false as const, error: m.error };

  const { error } = await admin.from("artists").update({ status }).eq("id", artistId);
  if (error) return { ok: false as const, error: error.message };

  if (negativa && m.reason) {
    const nome = current.stage_name;
    const esito = await registraDecisione({
      actorId: user.id,
      targetType: "profilo",
      targetId: artistId,
      action: status === "pending" ? "profilo_sospeso" : "profilo_rifiutato",
      reason: m.reason,
      affectedUserId: current.user_id,
      affectedName: nome,
      notify: {
        decision:
          status === "pending"
            ? "Abbiamo nascosto il tuo profilo dal catalogo in attesa di una verifica."
            : "Abbiamo rifiutato il tuo profilo: non è più visibile nel catalogo.",
        target: `Profilo "${nome}"`,
        consequences:
          current.status === "approved"
            ? "Il profilo non compare più nel catalogo pubblico finché la decisione non viene rivista."
            : undefined,
      },
    });
    if (!esito.ok) logger.warn("artisti", "cambio di stato non registrato:", esito.error);
  }

  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function updateArtist(artistId: string, input: ArtistInput, reason?: string) {
  const user = await requireAdminPageAccess("artisti");
  const parsed = artistSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;
  // Facoltativa: se c'è, la modifica viene registrata e comunicata al proprietario.
  const m = motivazione(reason, false);
  if (!m.ok) return { ok: false as const, error: m.error };

  const social_links: Record<string, string> = {};
  if (data.instagram) social_links.instagram = data.instagram;
  if (data.facebook) social_links.facebook = data.facebook;
  if (data.tiktok) social_links.tiktok = data.tiktok;
  if (data.youtube) social_links.youtube = data.youtube;
  if (data.spotify) social_links.spotify = data.spotify;
  if (data.website) social_links.website = data.website;

  const admin = createAdminClient();

  // Stato di partenza, per sapere quali campi cambiano e a chi appartiene il
  // profilo. Se la lettura fallisce ci si ferma: senza di essa non si scrive.
  const { data: prima, error: readErr } = await admin
    .from("artists")
    .select("user_id, stage_name, city, genre, instruments, bio, cover_image, social_links")
    .eq("id", artistId)
    .maybeSingle();
  if (readErr) return { ok: false as const, error: readErr.message };
  if (!prima) return { ok: false as const, error: "Profilo non trovato" };

  const nuovi = {
    stage_name: data.stage_name,
    city: data.city ?? null,
    genre: data.genre
      ? data.genre.split(",").map((g) => g.trim()).filter(Boolean)
      : [],
    instruments: data.instruments
      ? data.instruments.split(",").map((g) => g.trim()).filter(Boolean)
      : [],
    bio: data.bio ?? null,
    cover_image: data.cover_image ?? null,
    social_links,
  };

  const cambiati: string[] = [];
  if (prima.stage_name !== nuovi.stage_name) cambiati.push("nome d'arte");
  if ((prima.city ?? null) !== nuovi.city) cambiati.push("città");
  if (JSON.stringify([...(prima.genre ?? [])].sort()) !== JSON.stringify([...nuovi.genre].sort())) cambiati.push("generi");
  if (JSON.stringify([...(prima.instruments ?? [])].sort()) !== JSON.stringify([...nuovi.instruments].sort())) cambiati.push("strumenti");
  if ((prima.bio ?? null) !== nuovi.bio) cambiati.push("biografia");
  if ((prima.cover_image ?? null) !== nuovi.cover_image) cambiati.push("immagine di copertina");
  if (JSON.stringify(prima.social_links ?? {}) !== JSON.stringify(nuovi.social_links)) cambiati.push("collegamenti social");

  const { error } = await admin.from("artists").update(nuovi).eq("id", artistId);
  if (error) return { ok: false as const, error: error.message };

  if (m.reason && cambiati.length > 0 && prima.user_id && prima.user_id !== user.id) {
    const esito = await registraDecisione({
      actorId: user.id,
      targetType: "profilo",
      targetId: artistId,
      action: "profilo_modificato_dal_team",
      reason: m.reason,
      affectedUserId: prima.user_id,
      affectedName: prima.stage_name,
      notify: {
        decision: "Il team ha aggiornato alcune informazioni del tuo profilo.",
        target: `Profilo "${nuovi.stage_name}"`,
        consequences: `Campi modificati: ${cambiati.join(", ")}.`,
      },
    });
    if (!esito.ok) logger.warn("artisti", "modifica del team non registrata:", esito.error);
  }

  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteArtist(artistId: string, reason: string) {
  const user = await requireAdminPageAccess("artisti");
  const m = motivazione(reason, true);
  if (!m.ok || !m.reason) return { ok: false as const, error: m.ok ? "Motivazione mancante" : m.error };

  const admin = createAdminClient();
  // Prima di cancellare si leggono proprietario e nome, per registrare e
  // avvisare. Se la lettura fallisce non si cancella nulla.
  const { data: artist, error: readErr } = await admin
    .from("artists")
    .select("user_id, stage_name")
    .eq("id", artistId)
    .maybeSingle();
  if (readErr) return { ok: false as const, error: readErr.message };
  if (!artist) return { ok: false as const, error: "Profilo non trovato" };

  // Registro e comunicazione PRIMA della cancellazione: dopo, il proprietario
  // non sarebbe più rintracciabile dal profilo. Se non riescono, non si cancella.
  const esito = await registraDecisione({
    actorId: user.id,
    targetType: "profilo",
    targetId: artistId,
    action: "profilo_eliminato",
    reason: m.reason,
    affectedUserId: artist.user_id,
    affectedName: artist.stage_name,
    notify: {
      decision: "Abbiamo eliminato il tuo profilo da N'arte.",
      target: `Profilo "${artist.stage_name}"`,
      consequences: "Il profilo e i contenuti collegati non sono più disponibili.",
    },
  });
  if (!esito.ok) return { ok: false as const, error: esito.error };

  const { error } = await admin.from("artists").delete().eq("id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  revalidatePath("/");
  redirect("/admin/artisti");
}

const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().min(10, "Motivazione obbligatoria (min 10 caratteri)"),
});

export async function cancelConfirmedBooking(input: { bookingId: string; reason: string }) {
  const user = await requireAdminPageAccess("artisti");

  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_cancel_booking", {
    p_booking_id: parsed.data.bookingId,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false as const, error: error.message };
  const payload = data as { ok: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false as const, error: payload?.error ?? "Errore RPC" };
  }

  await sendBookingCancelledByAdminEmail(parsed.data.bookingId, parsed.data.reason).catch((e) =>
    logger.error("email", "cancel by admin:", e instanceof Error ? e.message : String(e))
  );

  // Le email alle parti esistono già: qui si registra soltanto.
  const esito = await registraDecisione({
    actorId: user.id,
    targetType: "booking",
    targetId: parsed.data.bookingId,
    action: "annullamento_booking",
    reason: parsed.data.reason,
    notify: false,
  });
  if (!esito.ok) logger.warn("artisti", "annullamento non registrato:", esito.error);

  // Una data annullata non può restare recensita come se l'evento fosse
  // avvenuto: la recensione viene nascosta (non eliminata), con motivazione
  // comunicata ad autore e artista (Regolamento delle recensioni, art. 13).
  const recensioni = await nascondiRecensioniDiBookingAnnullato(
    parsed.data.bookingId,
    user.id,
    `Data annullata dal team N'arte: ${parsed.data.reason}`
  );
  if (!recensioni.ok) logger.warn("artisti", "recensioni della data annullata non nascoste:", recensioni.error);

  revalidatePath("/admin/artisti");
  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function createArtistManual(input: {
  stage_name: string;
  email?: string;
  city?: string;
  genre?: string;
  bio?: string;
  cover_image?: string;
}) {
  await requireAdminPageAccess("artisti");
  const admin = createAdminClient();

  let userId: string | null = null;
  if (input.email) {
    const redirectTo = `${getSiteUrl()}/login`;
    const { data: invite } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo,
      data: { full_name: input.stage_name },
    });
    userId = invite?.user?.id ?? null;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email?.toLowerCase() === input.email!.toLowerCase())?.id ?? null;
    }
    if (userId) await admin.from("profiles").update({ role: "artist" }).eq("id", userId);
  }

  const slug = `${slugify(input.stage_name)}-${Date.now().toString(36).slice(-4)}`;
  const { error } = await admin.from("artists").insert({
    user_id: userId,
    stage_name: input.stage_name,
    slug,
    city: input.city ?? null,
    genre: input.genre ? input.genre.split(",").map((g) => g.trim()).filter(Boolean) : [],
    bio: input.bio ?? null,
    cover_image: input.cover_image ?? null,
    status: "approved",
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}
