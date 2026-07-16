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

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { ok: false as const, error: "Permessi insufficienti" };
  return { ok: true as const, user };
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
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;

  const parsed = tierOverrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati override non validi" };

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_artist_tier", {
    p_artist_id: artistId,
    p_tier: parsed.data.tier,
    p_expires_at: parsed.data.expiresAt ?? null,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/artisti/${artistId}`);
  revalidatePath("/admin/artisti");
  revalidatePath("/dashboard/profilo-artista");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function approveApplication(applicationId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;

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
    console.error("[approveApplication] generateLink error", e);
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

export async function rejectApplication(applicationId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_applications")
    .update({ status: "rejected" })
    .eq("id", applicationId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  return { ok: true as const };
}

export async function updateArtistStatus(artistId: string, status: "pending" | "approved" | "rejected") {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin.from("artists").update({ status }).eq("id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function updateArtist(artistId: string, input: ArtistInput) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = artistSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const social_links: Record<string, string> = {};
  if (data.instagram) social_links.instagram = data.instagram;
  if (data.facebook) social_links.facebook = data.facebook;
  if (data.tiktok) social_links.tiktok = data.tiktok;
  if (data.youtube) social_links.youtube = data.youtube;
  if (data.spotify) social_links.spotify = data.spotify;
  if (data.website) social_links.website = data.website;

  const admin = createAdminClient();
  const { error } = await admin
    .from("artists")
    .update({
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
    })
    .eq("id", artistId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteArtist(artistId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
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
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;

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
    console.error("[email] cancel by admin:", e)
  );

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
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
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
