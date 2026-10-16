import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { leggiSospensione } from "@/lib/auth/sospeso";
import { logger } from "@/lib/logger";

/**
 * Profili artista in attesa di approvazione (`artists.status = 'pending'`).
 *
 * Sono i profili aggiuntivi creati da Pro/Max dalla dashboard: non passano da
 * `artist_applications`, quindi le code basate solo sulle candidature non li
 * vedevano. Sola lettura.
 */

export type ProfiloInAttesa = {
  id: string;
  stageName: string;
  slug: string;
  city: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  /** Il proprietario è sospeso: il profilo è tornato `pending` con la sospensione. */
  ownerSospeso: boolean;
};

export type EsitoProfiliInAttesa =
  | { ok: true; profili: ProfiloInAttesa[] }
  | { ok: false; error: string };

export async function leggiProfiliInAttesa(): Promise<EsitoProfiliInAttesa> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artists")
    .select("id, user_id, stage_name, slug, city, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("admin/profili-in-attesa", "lettura profili fallita:", error.message);
    return { ok: false, error: "Non riesco a leggere i profili in attesa. L'elenco non è vuoto, è non disponibile." };
  }

  const righe = data ?? [];
  const proprietari = new Map<string, { email: string | null; nome: string | null; sospeso: boolean }>();
  const ids = Array.from(new Set(righe.map((r) => r.user_id).filter((u): u is string => !!u)));
  await Promise.all(
    ids.map(async (uid) => {
      const { data: u, error: e } = await admin.auth.admin.getUserById(uid);
      if (e) {
        // L'account non si legge: il profilo resta in elenco, senza proprietario.
        logger.warn("admin/profili-in-attesa", "proprietario non leggibile:", e.message);
        return;
      }
      const meta = u?.user?.user_metadata as { full_name?: string } | undefined;
      proprietari.set(uid, {
        email: u?.user?.email ?? null,
        nome: meta?.full_name?.trim() || null,
        sospeso: !!leggiSospensione(u?.user?.app_metadata),
      });
    }),
  );

  return {
    ok: true,
    profili: righe.map((r) => {
      const p = r.user_id ? proprietari.get(r.user_id) : undefined;
      return {
        id: r.id,
        stageName: r.stage_name,
        slug: r.slug,
        city: r.city ?? null,
        createdAt: r.created_at,
        ownerEmail: p?.email ?? null,
        ownerName: p?.nome ?? null,
        ownerSospeso: p?.sospeso ?? false,
      };
    }),
  };
}
