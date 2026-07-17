"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { getOwnedArtists, ACTIVE_ARTIST_COOKIE } from "@/lib/artist/current";
import { getAccountEntitlements } from "@/lib/billing/entitlements";
import { formatLimit, isUnlimited, PLAN_LABELS } from "@/lib/billing/plans";

/**
 * Gestione dei profili artista di un account.
 *
 * Il tetto (Free 1, Pro 2, Max 5) è applicato in DUE punti, di proposito:
 *  - qui, per dare un messaggio leggibile in italiano;
 *  - nel trigger `artists_enforce_profile_quota` (0042), che è il gate vero.
 * Il check qui non basta: fra il conteggio e l'insert passano due transazioni
 * PostgREST distinte, quindi due submit concorrenti leggerebbero entrambi
 * "1 profilo su 2" e ne creerebbero 3. Solo il trigger, che tiene recount e
 * insert nella stessa transazione con un advisory lock, chiude la race.
 */

async function requireArtistUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "artist" && role !== "superadmin") return null;
  return user;
}

const createSchema = z.object({
  stage_name: z.string().trim().min(2, "Il nome d'arte deve avere almeno 2 caratteri").max(80),
  city: z.string().trim().max(80).optional(),
});

export type CreateArtistProfileInput = z.infer<typeof createSchema>;

export async function createArtistProfile(input: CreateArtistProfileInput) {
  const user = await requireArtistUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const ent = await getAccountEntitlements(user.id);
  const owned = await getOwnedArtists(user.id);

  if (!isUnlimited(ent.artistProfilesMax) && owned.length >= ent.artistProfilesMax) {
    return {
      ok: false as const,
      error:
        ent.artistProfilesMax === 1
          ? `Il piano ${PLAN_LABELS[ent.tier]} include un solo profilo artista. Passa a Pro per gestirne 2, o a Max per 5.`
          : `Il piano ${PLAN_LABELS[ent.tier]} include ${formatLimit(ent.artistProfilesMax, "illimitati")} profili artista e li hai già usati tutti.`,
    };
  }

  const admin = createAdminClient();

  // Stesso schema di slug di createArtistManual: base + suffisso breve. Il
  // suffisso non è cosmetico — due profili con lo stesso nome d'arte
  // violerebbero l'unique su `slug`.
  const slug = `${slugify(parsed.data.stage_name)}-${Date.now().toString(36).slice(-4)}`;

  const { data: created, error } = await admin
    .from("artists")
    .insert({
      user_id: user.id,
      stage_name: parsed.data.stage_name,
      slug,
      city: parsed.data.city || null,
      // I profili aggiuntivi nascono in attesa di approvazione, come le
      // candidature pubbliche: il piano dà diritto a CREARE un profilo, non a
      // pubblicarlo senza che il team N'arte lo veda. Altrimenti basterebbero
      // 9,99€ per mettere online due profili non verificati.
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // 23514 = il trigger di quota ha vinto la race. Il messaggio del DB è già
    // in italiano e dice quale piano e quanti profili.
    return { ok: false as const, error: error.message };
  }

  const newId = (created as { id: string } | null)?.id;
  if (newId) {
    const jar = await cookies();
    jar.set(ACTIVE_ARTIST_COOKIE, newId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true as const, artistId: newId };
}

export async function switchArtistProfile(artistId: string) {
  const user = await requireArtistUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  // La proprietà si verifica qui e non ci si fida del cookie: il valore è
  // scrivibile dal client, e senza questo controllo si potrebbe attivare —
  // e quindi modificare — il profilo di un altro artista.
  const owned = await getOwnedArtists(user.id);
  if (!owned.some((a) => a.id === artistId)) {
    return { ok: false as const, error: "Profilo non disponibile" };
  }

  const jar = await cookies();
  jar.set(ACTIVE_ARTIST_COOKIE, artistId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}
