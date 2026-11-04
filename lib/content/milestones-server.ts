import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { MILESTONES, type Milestone } from "@/lib/content/milestones";

export const TAG_TAPPE = "site-milestones";

export type TappaRiga = {
  id: string;
  year_label: string;
  date_label: string;
  title: string;
  description: string;
  photo_url: string | null;
  photo_alt: string;
  order_index: number;
};

/** Esito della lettura: `null` = tabella assente o errore (si usa l'elenco nel codice). */
export async function leggiTappe(): Promise<TappaRiga[] | null> {
  const { data, error } = await createAdminClient()
    .from("site_milestones")
    .select("id, year_label, date_label, title, description, photo_url, photo_alt, order_index")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      logger.warn("tappe", "site_milestones non leggibile:", error.message);
    }
    return null;
  }
  return (data ?? []) as TappaRiga[];
}

/**
 * Le tappe di Chi siamo: dal database (migration 0076, modificabili da
 * /admin/contenuti/tappe) o, se la tabella non c'e' ancora o non risponde,
 * quelle scritte in lib/content/milestones.ts. Una tabella vuota resta vuota:
 * vuol dire che il team le ha tolte.
 */
export const getTappe = unstable_cache(
  async (): Promise<Milestone[]> => {
    const righe = await leggiTappe();
    if (!righe) return MILESTONES;
    return righe.map((r) => ({
      id: `tappa-${r.id}`,
      year: r.year_label,
      date: r.date_label,
      title: r.title,
      description: r.description,
      photo: r.photo_url,
      photoAlt: r.photo_alt,
    }));
  },
  ["site-milestones-v1"],
  { tags: [TAG_TAPPE], revalidate: 600 },
);
