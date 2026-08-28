import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Sitemap del sito pubblico.
 *
 * REGOLA CHE GOVERNA QUESTO FILE — vedi CLAUDE.md, punto 4 e 5: mai derivare un
 * risultato da una lettura di cui non si è controllato l'errore. Qui la
 * tentazione classica sarebbe `(data ?? []).map(...)`: se la query fallisce,
 * `data` è null, il `?? []` lo maschera e la sitemap esce VUOTA. A Google una
 * sitemap vuota non dice "c'è stato un problema", dice "questo sito non ha
 * contenuti" — ed è un danno che si paga per settimane.
 *
 * Perciò ogni sezione controlla `error` e, se qualcosa va storto, registra il
 * problema e restituisce le sole pagine statiche. Poche voci corrette valgono
 * più di zero voci silenziose.
 *
 * NOTA SUL PROFILO ARTISTA: `/artisti/[slug]` è dietro un muro di login (vedi
 * app/(user)/artisti/[slug]/page.tsx). Un crawler non ne vede il contenuto ma
 * la schermata "Accedi per scoprire questo artista". I profili restano in
 * sitemap perché gli URL sono legittimi e condivisibili, ma finché resta il
 * muro non porteranno traffico organico. È una scelta di prodotto aperta.
 */

export const revalidate = 3600;

type Row = { slug: string | null; updated?: string | null };

function entries(
  base: string,
  prefix: string,
  rows: Row[],
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap {
  return rows
    .filter((r): r is Row & { slug: string } => Boolean(r.slug))
    .map((r) => ({
      url: `${base}${prefix}/${r.slug}`,
      lastModified: r.updated ? new Date(r.updated) : undefined,
      changeFrequency,
      priority,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().replace(/\/$/, "");

  const statiche: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/eventi`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/artisti`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/format`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/prezzi`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/candidatura-artista`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/chi-siamo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/collaborazioni`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contatti`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/help`, changeFrequency: "weekly", priority: 0.6 },
  ];

  try {
    const admin = createAdminClient();

    const [eventi, artisti, format, articoli] = await Promise.all([
      admin.from("events").select("slug, created_at"),
      admin.from("artists").select("slug, created_at").eq("is_public", true),
      admin.from("formats").select("slug, updated_at").eq("published", true),
      admin
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .not("published_at", "is", null),
    ]);

    // Un solo errore basta a rendere inaffidabile l'intera sitemap: meglio
    // pubblicare le statiche e riprovare al prossimo rigenero.
    const fallita = [eventi, artisti, format, articoli].find((r) => r.error);
    if (fallita?.error) {
      logger.error("sitemap", "lettura fallita, pubblico solo le statiche", fallita.error);
      return statiche;
    }

    return [
      ...statiche,
      ...entries(
        base,
        "/eventi",
        (eventi.data ?? []).map((e) => ({ slug: e.slug, updated: e.created_at })),
        "weekly",
        0.8
      ),
      ...entries(
        base,
        "/artisti",
        (artisti.data ?? []).map((a) => ({ slug: a.slug, updated: a.created_at })),
        "weekly",
        0.7
      ),
      ...entries(
        base,
        "/format",
        (format.data ?? []).map((f) => ({ slug: f.slug, updated: f.updated_at })),
        "monthly",
        0.8
      ),
      ...entries(
        base,
        "/blog",
        (articoli.data ?? []).map((p) => ({
          slug: p.slug,
          updated: p.updated_at ?? p.published_at,
        })),
        "monthly",
        0.6
      ),
    ];
  } catch (e) {
    logger.error("sitemap", "eccezione durante la generazione", e);
    return statiche;
  }
}
