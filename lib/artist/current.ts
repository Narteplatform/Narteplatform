import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import type { ArtistStatus, ArtistTier } from "@/lib/supabase/types";

/**
 * Profilo artista attivo nella dashboard.
 *
 * Un account può possedere più profili artista (Free 1, Pro 2, Max 5 — vedi
 * lib/billing/plans.ts). La dashboard però lavora su UNO alla volta: questo
 * modulo decide quale.
 *
 * Prima di questo, tutta l'area dashboard faceva
 *     .from("artists").eq("user_id", user.id).maybeSingle()
 * che con due profili non "ne sceglie uno": va in ERRORE (PGRST116, "more than
 * one row returned"). Cioè: il giorno in cui un account Pro crea il secondo
 * profilo, senza questo modulo la sua intera dashboard smette di funzionare.
 */

export const ACTIVE_ARTIST_COOKIE = "narte_active_artist";

export type OwnedArtist = {
  id: string;
  stage_name: string;
  slug: string;
  cover_image: string | null;
  status: ArtistStatus;
  tier: ArtistTier;
  /** Profilo oltre il tetto del piano: esiste ma non è pubblico (0043). */
  plan_suspended: boolean;
};

/** Tutti i profili dell'account, in ordine stabile (il più vecchio è il principale). */
export async function getOwnedArtists(userId: string): Promise<OwnedArtist[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("artists")
    .select("id, stage_name, slug, cover_image, status, tier, plan_suspended")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as OwnedArtist[];
}

/**
 * Id del profilo attivo, sempre verificato contro la proprietà.
 *
 * ⚠️  Il cookie è scrivibile dal client: non è mai una fonte di verità, è solo
 *     una preferenza. Se puntasse a un profilo non posseduto — cosa che chiunque
 *     può tentare cambiando il valore nei devtools — verrebbe usato per servire
 *     e MODIFICARE il profilo di un altro artista. Per questo l'id del cookie
 *     viene sempre confrontato con i profili realmente posseduti, e in caso di
 *     mancata corrispondenza si ricade sul primo profilo dell'account.
 */
export async function resolveActiveArtist(
  userId: string,
  owned?: OwnedArtist[]
): Promise<OwnedArtist | null> {
  const list = owned ?? (await getOwnedArtists(userId));
  if (list.length === 0) return null;

  const jar = await cookies();
  const wanted = jar.get(ACTIVE_ARTIST_COOKIE)?.value;
  const match = wanted ? list.find((a) => a.id === wanted) : undefined;
  return match ?? list[0];
}

/**
 * Riga completa del profilo attivo, per le pagine che facevano `select("*")`.
 *
 * I campi su cui la dashboard fa affidamento sono tipizzati; il resto resta
 * `unknown` e va ristretto dal chiamante. È comunque meglio di prima: con la
 * deriva nota dei tipi Supabase queste query risolvevano a `never`, quindi ogni
 * accesso era già un errore silenziato da `ignoreBuildErrors`.
 */
export type ActiveArtistRow = {
  id: string;
  stage_name: string;
  slug: string;
  status: ArtistStatus;
  tier: ArtistTier;
  [key: string]: unknown;
};

export async function getActiveArtistRow(userId: string): Promise<ActiveArtistRow | null> {
  const active = await resolveActiveArtist(userId);
  if (!active) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("artists").select("*").eq("id", active.id).maybeSingle();
  return (data as unknown as ActiveArtistRow | null) ?? null;
}

/**
 * Contesto completo della dashboard: chi sono i profili, qual è quello attivo.
 * Serve alla shell per il selettore e alle pagine per i dati.
 */
export async function getArtistContext(
  userId: string
): Promise<{ owned: OwnedArtist[]; active: OwnedArtist | null }> {
  const owned = await getOwnedArtists(userId);
  const active = await resolveActiveArtist(userId, owned);
  return { owned, active };
}
