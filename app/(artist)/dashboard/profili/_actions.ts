"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { getOwnedArtists, ACTIVE_ARTIST_COOKIE } from "@/lib/artist/current";
import { getAccountEntitlements } from "@/lib/billing/entitlements";
import { formatLimit, isUnlimited, PLAN_LABELS } from "@/lib/billing/plans";
import { registraDecisione } from "@/lib/moderation/decisioni";
import { logger } from "@/lib/logger";

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

/**
 * Chiusura di un profilo da parte dell'artista.
 *
 * NON cancella nulla: la riga resta con `status = 'rejected'` (esce dal
 * catalogo pubblico) e tutti i suoi contenuti, le richieste e lo storico
 * restano al loro posto.
 */
export async function chiudiProfilo(artistId: string) {
  const user = await requireArtistUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (typeof artistId !== "string" || artistId.length === 0) {
    return { ok: false as const, error: "Profilo non disponibile" };
  }

  // Proprietà verificata sui profili realmente posseduti, mai sul cookie.
  const owned = await getOwnedArtists(user.id);
  const target = owned.find((a) => a.id === artistId);
  if (!target) return { ok: false as const, error: "Profilo non disponibile" };
  if (target.status === "rejected") {
    return { ok: false as const, error: "Questo profilo è già chiuso." };
  }

  // Mai l'ultimo: un account senza profili lascerebbe la dashboard senza
  // contesto. Per chiudere tutto c'è la cancellazione dell'account.
  const altri = owned.filter((a) => a.id !== artistId && a.status !== "rejected");
  if (altri.length === 0) {
    return {
      ok: false as const,
      error:
        "Questo è l'ultimo profilo del tuo account. Per chiudere tutto usa la cancellazione dell'account in /account/i-miei-dati.",
    };
  }

  const admin = createAdminClient();

  // Date confermate future: se la lettura fallisce NON si procede.
  const oggi = new Date().toISOString().slice(0, 10);
  const { count, error: bookingErr } = await admin
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", artistId)
    .eq("status", "confermata")
    .gte("event_date", oggi);
  if (bookingErr) {
    logger.error("dashboard/profili", "lettura date confermate fallita", {
      artistId,
      error: bookingErr.message,
    });
    return { ok: false as const, error: "Non è stato possibile verificare le date confermate. Riprova fra poco." };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      error:
        "Hai date confermate future: accordati con l'organizzatore e scrivi al team prima di chiudere il profilo.",
    };
  }

  const { error: updErr } = await admin
    .from("artists")
    .update({ status: "rejected" })
    .eq("id", artistId)
    .eq("user_id", user.id);
  if (updErr) {
    logger.error("dashboard/profili", "chiusura profilo fallita", { artistId, error: updErr.message });
    return { ok: false as const, error: updErr.message };
  }

  // Se era il profilo attivo, si passa a un altro profilo dell'account.
  try {
    const jar = await cookies();
    if (jar.get(ACTIVE_ARTIST_COOKIE)?.value === artistId) {
      jar.set(ACTIVE_ARTIST_COOKIE, altri[0].id, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  } catch (e) {
    logger.warn("dashboard/profili", "cambio profilo attivo dopo la chiusura fallito", e);
  }

  // La chiusura è già avvenuta: un problema di registro non la annulla.
  const esito = await registraDecisione({
    actorId: user.id,
    targetType: "profilo",
    targetId: artistId,
    action: "profilo_chiuso_dall_artista",
    reason: "Chiusura del profilo richiesta dall'artista.",
    affectedUserId: user.id,
    affectedName: target.stage_name,
    notify: false,
  });
  if (!esito.ok) logger.warn("dashboard/profili", "chiusura non registrata:", esito.error);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/artisti");
  revalidatePath(`/artisti/${target.slug}`);
  return { ok: true as const };
}
