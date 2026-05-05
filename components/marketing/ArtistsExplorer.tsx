"use client";

import { useMemo, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { ArtistCard } from "@/components/marketing/ArtistCard";

export type ExplorerArtist = {
  id: string;
  slug: string;
  stage_name: string;
  city: string | null;
  cover_image: string | null;
  genre: string[];
  instruments: string[];
};

const ROLE_GROUPS: { key: string; label: string; match: (instr: string) => boolean }[] = [
  { key: "cantante", label: "Cantante", match: (i) => /voce|cori/i.test(i) },
  { key: "chitarrista", label: "Chitarrista", match: (i) => /chitarra/i.test(i) },
  { key: "bassista", label: "Bassista", match: (i) => /^basso$|contrabbasso/i.test(i) },
  { key: "batterista", label: "Batterista", match: (i) => /batteria|percussioni|cajón|cajon/i.test(i) },
  { key: "tastierista", label: "Tastierista", match: (i) => /pianoforte|tastiere|organo|synth/i.test(i) },
  { key: "fiati", label: "Fiati", match: (i) => /sax|tromba|trombone|flauto|clarinetto/i.test(i) },
  { key: "archi", label: "Archi", match: (i) => /violino|viola|violoncello|arpa/i.test(i) },
  { key: "dj", label: "DJ", match: (i) => /dj|controller|loop station/i.test(i) },
];

export function ArtistsExplorer({ artists }: { artists: ExplorerArtist[] }) {
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Counts per genere e per ruolo (su tutto il dataset, non sui filtrati,
  // così le label non spariscono mai dopo la prima selezione).
  const genreCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) for (const g of a.genre ?? []) m.set(g, (m.get(g) ?? 0) + 1);
    return m;
  }, [artists]);

  const roleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artists) {
      const matched = new Set<string>();
      for (const i of a.instruments ?? []) {
        for (const g of ROLE_GROUPS) if (g.match(i)) matched.add(g.key);
      }
      for (const k of matched) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [artists]);

  const allGenres = useMemo(
    () => Array.from(genreCounts.keys()).sort((a, b) => a.localeCompare(b, "it")),
    [genreCounts]
  );
  const availableRoles = useMemo(
    () => ROLE_GROUPS.filter((g) => roleCounts.has(g.key)),
    [roleCounts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      if (genreFilter && !(a.genre ?? []).includes(genreFilter)) return false;
      if (roleFilter) {
        const group = ROLE_GROUPS.find((g) => g.key === roleFilter);
        if (!group) return true;
        const hit = (a.instruments ?? []).some((i) => group.match(i));
        if (!hit) return false;
      }
      if (q) {
        const hay = `${a.stage_name} ${a.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [artists, genreFilter, roleFilter, query]);

  const hasFilters = genreFilter !== null || roleFilter !== null || query.length > 0;

  return (
    <div>
      {/* FILTER CARD */}
      <div className="rounded-2xl border border-border bg-background p-5 md:p-6">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome o città…"
            className="h-11 w-full rounded-full border border-border bg-muted pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
            aria-label="Cerca artista"
          />
        </div>

        <div className="mt-6 space-y-6">
          {availableRoles.length > 0 && (
            <FilterGroup
              label="Tipologia di artista"
              hint="Cantante, chitarrista, batterista…"
            >
              <Chip
                active={roleFilter === null}
                onClick={() => setRoleFilter(null)}
                count={artists.length}
              >
                Tutti
              </Chip>
              {availableRoles.map((r) => (
                <Chip
                  key={r.key}
                  active={roleFilter === r.key}
                  onClick={() => setRoleFilter(roleFilter === r.key ? null : r.key)}
                  count={roleCounts.get(r.key) ?? 0}
                >
                  {r.label}
                </Chip>
              ))}
            </FilterGroup>
          )}

          {allGenres.length > 0 && (
            <FilterGroup label="Generi musicali" hint="Stile e suono">
              <Chip
                active={genreFilter === null}
                onClick={() => setGenreFilter(null)}
                count={artists.length}
              >
                Tutti
              </Chip>
              {allGenres.map((g) => (
                <Chip
                  key={g}
                  active={genreFilter === g}
                  onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                  count={genreCounts.get(g) ?? 0}
                >
                  {g}
                </Chip>
              ))}
            </FilterGroup>
          )}
        </div>

        {hasFilters && (
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 text-xs">
            <span className="text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "artista trovato" : "artisti trovati"}
            </span>
            <button
              type="button"
              onClick={() => {
                setGenreFilter(null);
                setRoleFilter(null);
                setQuery("");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 uppercase tracking-wide transition hover:border-accent hover:text-accent"
            >
              <RotateCcw className="size-3" /> Reset filtri
            </button>
          </div>
        )}
      </div>

      {/* GRID */}
      <div className="mt-10">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Nessun artista corrisponde ai filtri selezionati.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => (
              <ArtistCard
                key={a.id}
                slug={a.slug}
                stageName={a.stage_name}
                city={a.city}
                coverImage={a.cover_image}
                genres={a.genre}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-sm uppercase tracking-tight">{label}</span>
        {hint ? (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="-mx-1 flex flex-wrap gap-2 overflow-x-auto px-1 pb-1 sm:overflow-visible">
        {children}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-background text-foreground hover:border-accent hover:text-accent"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span
          className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
            active ? "bg-accent-foreground/20" : "bg-muted text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
