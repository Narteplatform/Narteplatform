import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Feed RSS 2.0 del blog: /blog/rss.xml.
 *
 * Solo articoli già usciti (`published_at` <= adesso), come la lista e la
 * sitemap. Il link nel <head> sta nei metadata di /blog e /blog/[slug].
 *
 * Una lettura fallita risponde 503 e non un feed vuoto: un lettore RSS che
 * riceve zero voci non capisce che c'è stato un problema, e un aggregatore
 * potrebbe considerare il feed abbandonato.
 */

export const dynamic = "force-dynamic";

const MAX_VOCI = 50;

type Riga = {
  slug: string;
  title: string;
  excerpt: string | null;
  seo_description: string | null;
  author_name: string | null;
  published_at: string;
};

/** Escape per testo e attributi XML. */
function xml(testo: string): string {
  return testo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Caratteri di controllo non ammessi in XML 1.0: un solo carattere sbagliato
    // rende illeggibile l'intero feed.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export async function GET() {
  const base = getSiteUrl().replace(/\/$/, "");

  let righe: Riga[];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blog_posts")
      .select("slug, title, excerpt, seo_description, author_name, published_at")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(MAX_VOCI);
    if (error) {
      logger.error("blog/rss", "lettura articoli fallita", error);
      return new Response("Feed temporaneamente non disponibile", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "600" },
      });
    }
    righe = (data ?? []) as unknown as Riga[];
  } catch (e) {
    logger.error("blog/rss", "eccezione durante la generazione", e);
    return new Response("Feed temporaneamente non disponibile", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "600" },
    });
  }

  const voci = righe
    .map((r) => {
      const link = `${base}/blog/${encodeURIComponent(r.slug)}`;
      const descrizione = r.excerpt || r.seo_description || "";
      return [
        "    <item>",
        `      <title>${xml(r.title)}</title>`,
        `      <link>${xml(link)}</link>`,
        `      <guid isPermaLink="true">${xml(link)}</guid>`,
        `      <pubDate>${new Date(r.published_at).toUTCString()}</pubDate>`,
        r.author_name ? `      <dc:creator>${xml(r.author_name)}</dc:creator>` : null,
        descrizione ? `      <description>${xml(descrizione)}</description>` : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const ultimo = righe[0]?.published_at;
  const corpo = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    "    <title>Blog N&apos;arte</title>",
    `    <link>${xml(`${base}/blog`)}</link>`,
    `    <atom:link href="${xml(`${base}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    "    <description>Approfondimenti, guide e storie dalla scena musicale live italiana.</description>",
    "    <language>it-IT</language>",
    ultimo ? `    <lastBuildDate>${new Date(ultimo).toUTCString()}</lastBuildDate>` : null,
    voci || null,
    "  </channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");

  return new Response(corpo, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      // Un articolo programmato compare al più con un quarto d'ora di ritardo.
      "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
