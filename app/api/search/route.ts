import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ArtistTier } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export type SearchHit = {
  type: "artist" | "event";
  slug: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  /** Solo sugli artisti: alimenta i badge Artista Pro / TOP nella tendina. */
  tier?: ArtistTier | null;
  /**
   * Artista mostrato a chi non ha una sessione. Il nome non è nella risposta —
   * `title` è un segnaposto — e la UI sfoca copertina e testo. Chi consuma
   * questo campo non deve mai mostrare `title` come se fosse un nome vero.
   */
  locked?: boolean;
};

/**
 * Nessun tetto sui profili esaminati: il filtro sta nel database e il solo
 * limite è sul NUMERO DI RISULTATI restituiti. Le quattro classi di pertinenza
 * (nome che inizia, nome che contiene, genere, città) sono interrogate
 * separatamente, ciascuna già ordinata per piano e limitata a MAX_HITS: l'unione
 * contiene sempre i primi MAX_HITS per (pertinenza, piano), qualunque sia la
 * dimensione del roster.
 *
 * `genre` è un `text[]` e PostgREST sugli array offre solo confronti esatti
 * (`ov`). Per avere comunque una ricerca senza distinzione di maiuscole si
 * cercano prima, con `ilike`, i nomi nella tabella `genres`, poi si confrontano
 * gli artisti con quei nomi (e le varianti di maiuscola più comuni).
 */
const MAX_HITS = 5;

/** `artist_tier_enum` è dichiarato ('free','pro','max'): qui l'ordine è quello che serve a schermo. */
const TIER_RANK: Record<string, number> = { max: 0, pro: 1, free: 2 };
const tierRank = (t: string | null | undefined) => TIER_RANK[t ?? "free"] ?? 3;

/** Rilevanza: chi si chiama così viene prima di chi suona quel genere. */
const RANK_NAME_STARTS = 0;
const RANK_NAME_CONTAINS = 1;
const RANK_GENRE = 2;
const RANK_CITY = 3;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qRaw = url.searchParams.get("q") ?? "";
  const q = qRaw.trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const needle = q.slice(0, 60).toLowerCase();
  // Per `.or()` degli eventi: fuori i caratteri che ne rompono la sintassi.
  const like = `%${needle.replace(/[%,()*]/g, "")}%`;
  // Per `.ilike()` degli artisti: `%`, `_` e `\` dell'input sono letterali.
  const lit = needle.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, "");
  const patStarts = `${lit}%`;
  const patContains = `%${lit}%`;

  const supabase = createAdminClient();

  // Il roster è visibile solo a chi è iscritto: senza sessione gli artisti
  // escono oscurati. In caso di errore si resta ospiti — un dubbio
  // sull'autenticazione non deve mai aprire il roster.
  let isGuest = true;
  try {
    const authed = await createClient();
    const {
      data: { user },
    } = await authed.auth.getUser();
    isGuest = !user;
  } catch {
    isGuest = true;
  }

  const ARTIST_COLS = "slug, stage_name, city, cover_image, genre, tier";
  const artistBase = () =>
    supabase
      .from("artists")
      .select(ARTIST_COLS)
      .eq("is_public", true)
      .order("tier", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(MAX_HITS);

  // Nomi di genere che contengono il testo cercato, poi le varianti di
  // maiuscola con cui possono essere stati scritti sugli artisti.
  const genreNames = await supabase
    .from("genres")
    .select("name")
    .ilike("name", patContains)
    .limit(20);
  if (genreNames.error) {
    logger.error("search", "lettura generi fallita, ricerca per genere saltata", genreNames.error);
  }
  const genreVariants = Array.from(
    new Set(
      (genreNames.data ?? []).flatMap((g) => {
        const n = g.name;
        const cap = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
        return [n, n.toLowerCase(), n.toUpperCase(), cap];
      })
    )
  ).filter((v) => !/[,{}"\\]/.test(v));

  const [starts, contains, byGenre, byCity, { data: events }] = await Promise.all([
    artistBase().ilike("stage_name", patStarts),
    artistBase().ilike("stage_name", patContains),
    genreVariants.length > 0
      ? artistBase().overlaps("genre", genreVariants)
      : Promise.resolve(null),
    artistBase().ilike("city", patContains),
    supabase
      .from("events")
      .select("slug, title, city, date, cover_image")
      .or(`title.ilike.${like},city.ilike.${like}`)
      .order("date", { ascending: true })
      .limit(MAX_HITS),
  ]);

  const seenSlugs = new Set<string>();
  const artistRows = [starts, contains, byGenre, byCity].flatMap((r) => {
    if (!r) return [];
    if (r.error) {
      logger.error("search", "ricerca artisti fallita", r.error);
      return [];
    }
    return (r.data ?? []).filter((a) => {
      if (seenSlugs.has(a.slug)) return false;
      seenSlugs.add(a.slug);
      return true;
    });
  });

  const matched = artistRows.flatMap((a) => {
    const name = (a.stage_name ?? "").toLowerCase();
    const city = (a.city ?? "").toLowerCase();
    const genres = a.genre ?? [];
    const hitGenres = genres.filter((g) => g.toLowerCase().includes(needle));

    const rank = name.startsWith(needle)
      ? RANK_NAME_STARTS
      : name.includes(needle)
        ? RANK_NAME_CONTAINS
        : hitGenres.length > 0
          ? RANK_GENRE
          : city.includes(needle)
            ? RANK_CITY
            : -1;

    return rank < 0 ? [] : [{ a, rank, hitGenres, genres }];
  });

  // Prima la rilevanza, poi il piano: con cinque posti disponibili il piano
  // decide ancora CHI entra, ma non può più scavalcare un artista che si
  // chiama esattamente come la ricerca.
  matched.sort((x, y) => x.rank - y.rank || tierRank(x.a.tier) - tierRank(y.a.tier));

  const hits: SearchHit[] = [
    ...matched.slice(0, MAX_HITS).map(({ a, hitGenres, genres }) => {
      // I generi restano visibili anche agli ospiti: sono ciò che hanno
      // cercato ed è l'unica informazione che il profilo bloccato già mostra.
      // Quelli che hanno fatto scattare il match vanno per primi, e i doppioni
      // di sola maiuscola spariscono: a database "pop" e "Pop" convivono sullo
      // stesso profilo e verrebbero fuori come due generi diversi.
      const seen = new Set<string>();
      const genreLabel = [...hitGenres, ...genres.filter((g) => !hitGenres.includes(g))]
        .filter((g) => {
          const key = g.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 2)
        .join(" / ");

      if (isGuest) {
        return {
          type: "artist" as const,
          slug: a.slug,
          // Segnaposto, non il nome: la stessa stringa che mostra ArtistCard
          // a un ospite. Il nome vero non lascia il server.
          title: "Nome artista",
          subtitle: genreLabel || null,
          image: a.cover_image,
          tier: a.tier,
          locked: true,
        };
      }

      return {
        type: "artist" as const,
        slug: a.slug,
        title: a.stage_name,
        subtitle: [a.city, genreLabel].filter(Boolean).join(" · ") || null,
        image: a.cover_image,
        tier: a.tier,
      };
    }),
    ...(events ?? []).map((e) => ({
      type: "event" as const,
      slug: e.slug,
      title: e.title,
      subtitle: [
        e.city,
        new Date(e.date).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      ]
        .filter(Boolean)
        .join(" · "),
      image: e.cover_image,
    })),
  ];

  return NextResponse.json({ hits });
}
