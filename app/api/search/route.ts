import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ArtistTier } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export type SearchHit = {
  type: "artist" | "event";
  slug: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  /** Solo sugli artisti: alimenta i badge Verificato / TOP nella tendina. */
  tier?: ArtistTier | null;
  /**
   * Artista mostrato a chi non ha una sessione. Il nome non è nella risposta —
   * `title` è un segnaposto — e la UI sfoca copertina e testo. Chi consuma
   * questo campo non deve mai mostrare `title` come se fosse un nome vero.
   */
  locked?: boolean;
};

/**
 * Tetto di righe lette per la ricerca artisti.
 *
 * Il filtro su genere gira in JS e non nel database: `genre` è un `text[]` e
 * PostgREST, sugli array, offre solo confronti esatti elemento per elemento
 * (`cs`, `ov`). A database i generi sono scritti come capita — "pop" e "Pop",
 * "R&B" e "r&b" convivono già — quindi un confronto esatto e sensibile alle
 * maiuscole restituirebbe metà dei risultati. Il prezzo è leggere il roster
 * pubblico a ogni ricerca: con qualche centinaio di artisti va bene, oltre
 * questa soglia va spostato in una funzione SQL
 * (`exists (select 1 from unnest(genre) g where g ilike '%…%')`).
 */
const MAX_SCAN = 300;
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

  const needle = q.toLowerCase();
  const escaped = q.replace(/[%,()]/g, "");
  const like = `%${escaped}%`;

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

  const [{ data: artistRows }, { data: events }] = await Promise.all([
    supabase
      .from("artists")
      .select("slug, stage_name, city, cover_image, genre, tier")
      .eq("is_public", true)
      .order("tier", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(MAX_SCAN),
    supabase
      .from("events")
      .select("slug, title, city, date, cover_image")
      .or(`title.ilike.${like},city.ilike.${like}`)
      .order("date", { ascending: true })
      .limit(MAX_HITS),
  ]);

  const matched = (artistRows ?? []).flatMap((a) => {
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
