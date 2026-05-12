"use client";

import { useMemo, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { ArtistCard } from "@/components/marketing/ArtistCard";
import type { PriceBand } from "@/lib/supabase/types";

export type ExplorerArtist = {
  id: string;
  slug: string;
  stage_name: string;
  city: string | null;
  cover_image: string | null;
  genre: string[];
  instruments: string[];
  price_band: PriceBand;
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

export function ArtistsExplorer({
  artists,
  canSeePrice = false,
}: {
  artists: ExplorerArtist[];
  canSeePrice?: boolean;
}) {
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
  // Mostra sempre tutte le tipologie. Anche se zero artisti per categoria
  // l'utente vede il filtro completo (count 0). Nasconde solo se la lista
  // artisti è vuota.
  const availableRoles = useMemo(
    () => (artists.length === 0 ? [] : ROLE_GROUPS),
    [artists.length]
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

  function reset() {
    setGenreFilter(null);
    setRoleFilter(null);
    setQuery("");
  }

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

        {/* MOBILE: dropdown selects */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:hidden">
          {availableRoles.length > 0 && (
            <FilterSelect
              label="Tipologia artista"
              value={roleFilter ?? ""}
              onChange={(v) => setRoleFilter(v || null)}
              total={artists.length}
              options={availableRoles.map((r) => ({
                value: r.key,
                label: r.label,
                count: roleCounts.get(r.key) ?? 0,
              }))}
            />
          )}
          {allGenres.length > 0 && (
            <FilterSelect
              label="Generi musicali"
              value={genreFilter ?? ""}
              onChange={(v) => setGenreFilter(v || null)}
              total={artists.length}
              options={allGenres.map((g) => ({
                value: g,
                label: g,
                count: genreCounts.get(g) ?? 0,
              }))}
            />
          )}
        </div>

        {/* DESKTOP: chip rows */}
        <div className="mt-6 hidden space-y-6 md:block">
          {availableRoles.length > 0 && (
            <FilterGroup
              label="Tipologia artista"
              hint="Ruolo principale: cantante, chitarrista, DJ…"
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
            <FilterGroup
              label="Generi musicali"
              hint="Stile sonoro: pop, rock, jazz, elettronica…"
            >
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
          {(roleFilter !== null || genreFilter !== null) && (
            <p className="text-xs text-muted-foreground">
              {roleFilter && genreFilter
                ? "Filtro combinato: gli artisti devono corrispondere sia alla tipologia che al genere selezionati."
                : "Combina i due filtri per restringere ancora i risultati."}
            </p>
          )}
        </div>

        {hasFilters && (
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4 text-xs">
            <span className="text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "artista trovato" : "artisti trovati"}
            </span>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1.5 uppercase tracking-wide transition hover:border-accent hover:text-accent"
            >
              <RotateCcw className="size-3" /> Reset
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
                priceBand={a.price_band}
                canSeePrice={canSeePrice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  total,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; count: number }[];
  total: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-full border border-border bg-muted px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='currentColor' d='M2 4l4 4 4-4z'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
      >
        <option value="">Tutti ({total})</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </label>
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
      <div className="flex flex-wrap gap-2">{children}</div>
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
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
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
