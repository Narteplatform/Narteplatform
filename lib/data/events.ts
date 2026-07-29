import { createClient } from "@/lib/supabase/server";
import type { EventCardProps } from "@/components/marketing/EventCard";

export type EventWhen = "upcoming" | "past";

/**
 * Lettura pubblica degli eventi. Estratta da app/(public)/eventi/page.tsx per
 * non avere la stessa query "passati vs futuri" scritta in due punti che poi
 * divergono alla prima modifica.
 *
 * Client anon (`createClient`) e non service-role: la policy RLS su `events` è
 * `using (true)`, quindi la lettura pubblica basta, e `createAdminClient()`
 * lancia se manca SUPABASE_SERVICE_ROLE_KEY.
 *
 * ⚠️ Il valore di ritorno distingue `null` da `[]` e la distinzione è
 * load-bearing: `null` = la query è fallita, `[]` = non ci sono eventi. Chi
 * chiama non deve trattare un errore come "zero risultati", altrimenti un
 * fallback (es. "niente in arrivo → mostra i passati") scatta su una query
 * rotta invece che su un calendario vuoto.
 */
export async function getPublicEvents(opts: {
  when: EventWhen;
  /** Slug della categoria, oppure "all"/omesso per non filtrare. */
  category?: string;
  limit?: number;
}): Promise<EventCardProps[] | null> {
  const { when, category, limit } = opts;
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    let q = supabase
      .from("events")
      .select("slug, title, city, date, price, cover_image");

    if (category && category !== "all") {
      q = q.eq("category", category as never);
    }

    // Non esiste una colonna di stato: "passato" è sempre un confronto con
    // adesso, ed è il motivo per cui gli elenchi si aggiornano da soli.
    q =
      when === "past"
        ? q.lt("date", nowIso).order("date", { ascending: false })
        : q.gte("date", nowIso).order("date", { ascending: true });

    if (limit) q = q.limit(limit);

    const { data, error } = await q;
    if (error || !data) return null;

    return data.map((e) => ({
      slug: e.slug,
      title: e.title,
      city: e.city,
      date: e.date,
      price: e.price,
      coverImage: e.cover_image,
    }));
  } catch {
    return null;
  }
}
