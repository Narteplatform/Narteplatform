"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, ChevronDown, RotateCcw, Check } from "lucide-react";
import { ArtistCard } from "@/components/marketing/ArtistCard";
import { TopArtistBadge } from "@/components/marketing/ArtistBadges";
import type { ArtistTier, PriceBand } from "@/lib/supabase/types";

export type ExplorerArtist = {
  id: string;
  slug: string;
  stage_name: string;
  city: string | null;
  cover_image: string | null;
  genre: string[];
  instruments: string[];
  price_band: PriceBand;
  tier?: ArtistTier | null;
};

const ROLE_GROUPS: { key: string; label: string; match: (instr: string) => boolean }[] = [
  { key: "bassista", label: "Bassista", match: (i) => /\bbass(o|ist)|contrabbasso/i.test(i) },
  { key: "batterista", label: "Batterista", match: (i) => /batter(ia|ist)|drum/i.test(i) },
  { key: "cantante", label: "Cantante", match: (i) => /\b(voce|cantante|vocal|singer)\b/i.test(i) },
  { key: "chitarrista", label: "Chitarrista", match: (i) => /chitarr(a|ist)|guitar/i.test(i) },
  { key: "corista", label: "Corista", match: (i) => /corist|cori\b|backing vocal|coro/i.test(i) },
  { key: "dj", label: "DJ", match: (i) => /\bdj\b|controller|loop station|turntabl/i.test(i) },
  { key: "percussionista", label: "Percussionista", match: (i) => /percussion|cajón|cajon|conga|bongo|djembe/i.test(i) },
  { key: "sassofonista", label: "Sassofonista", match: (i) => /sax|sassofon/i.test(i) },
  { key: "tastierista", label: "Tastierista", match: (i) => /tastier|pianoforte|piano\b|organo|synth|keyboard/i.test(i) },
  { key: "trombettista", label: "Trombettista", match: (i) => /tromba|trombett|trumpet/i.test(i) },
  { key: "violinista", label: "Violinista", match: (i) => /violin/i.test(i) },
];

// Dropdown with multi-select checkboxes
function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: { key: string; label: string; count: number }[];
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const activeCount = selected.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-wider transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro focus-visible:ring-offset-2",
          activeCount > 0
            ? "border-azzurro bg-azzurro text-white"
            : "border-notte/30 bg-white text-notte hover:border-notte",
        ].join(" ")}
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`size-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-50 mt-2 min-w-[200px] max-w-[260px] overflow-hidden rounded-xl border border-border bg-white shadow-lg"
        >
          {activeCount > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-corallo hover:bg-corallo/5"
              >
                <RotateCcw className="size-3" /> Deseleziona tutti
              </button>
              <div className="h-px bg-border" />
            </>
          )}
          <ul className="max-h-64 overflow-y-auto p-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.key);
              return (
                <li key={opt.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onToggle(opt.key)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={[
                          "inline-flex size-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-azzurro bg-azzurro text-white"
                            : "border-border bg-white",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="size-2.5" strokeWidth={3} />}
                      </span>
                      <span className="text-notte">{opt.label}</span>
                    </span>
                    <span className="text-[11px] text-palco-40">{opt.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ArtistsExplorer({
  artists,
  canSeePrice = false,
  isGuest = false,
}: {
  artists: ExplorerArtist[];
  canSeePrice?: boolean;
  isGuest?: boolean;
}) {
  const [genreFilters, setGenreFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
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
    () =>
      Array.from(genreCounts.entries())
        .filter(([, count]) => count > 0)
        .map(([g]) => g)
        .sort((a, b) => a.localeCompare(b, "it")),
    [genreCounts]
  );

  const availableRoles = useMemo(
    () => ROLE_GROUPS.filter((r) => (roleCounts.get(r.key) ?? 0) > 0),
    [roleCounts]
  );

  const categoryOptions = useMemo(
    () =>
      availableRoles.map((r) => ({
        key: r.key,
        label: r.label,
        count: roleCounts.get(r.key) ?? 0,
      })),
    [availableRoles, roleCounts]
  );

  const genreOptions = useMemo(
    () =>
      allGenres.map((g) => ({
        key: g,
        label: g,
        count: genreCounts.get(g) ?? 0,
      })),
    [allGenres, genreCounts]
  );

  const hasFilters =
    genreFilters.length > 0 || roleFilters.length > 0 || query.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      if (genreFilters.length > 0) {
        const has = (a.genre ?? []).some((g) => genreFilters.includes(g));
        if (!has) return false;
      }
      if (roleFilters.length > 0) {
        const matchedKeys = new Set<string>();
        for (const i of a.instruments ?? []) {
          for (const g of ROLE_GROUPS) if (g.match(i)) matchedKeys.add(g.key);
        }
        const ok = roleFilters.some((r) => matchedKeys.has(r));
        if (!ok) return false;
      }
      if (q) {
        const hay = `${a.stage_name} ${a.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [artists, genreFilters, roleFilters, query]);

  // Top artists: tier='max', shown as a dedicated section when no filters active
  const topArtists = useMemo(
    () => artists.filter((a) => a.tier === "max"),
    [artists]
  );

  const showTopSection = topArtists.length > 0 && !hasFilters;

  /**
   * I Max escono dalla griglia SOLO quando la fascia in cima li sta già
   * mostrando: altrimenti comparirebbero due volte nella stessa schermata.
   * Con un filtro attivo la fascia sparisce e i Max devono tornare in griglia,
   * o una ricerca per nome non troverebbe proprio gli artisti in evidenza.
   */
  const gridArtists = useMemo(
    () => (showTopSection ? filtered.filter((a) => a.tier !== "max") : filtered),
    [filtered, showTopSection]
  );

  // Roster di soli Max: la fascia mostra tutto e sotto non resta niente. Senza
  // questa distinzione la pagina scriverebbe "Nessun artista corrisponde ai
  // filtri" sotto una griglia piena, con zero filtri attivi.
  const showGridSection = !showTopSection || gridArtists.length > 0;

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    if (list.includes(value)) setList(list.filter((x) => x !== value));
    else setList([...list, value]);
  }

  function reset() {
    setGenreFilters([]);
    setRoleFilters([]);
    setQuery("");
  }

  return (
    <div>
      {/* SEARCH + FILTER BAR */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-notte px-4 py-3 md:px-5 md:py-4">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-palco/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome o città…"
            className="h-10 w-full rounded-full border border-notte-60 bg-notte-80 pl-10 pr-4 text-sm text-palco placeholder:text-palco/40 focus:outline-none focus:ring-2 focus:ring-azzurro focus:ring-offset-1 focus:ring-offset-notte"
            aria-label="Cerca artista"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex shrink-0 items-center gap-2">
          {categoryOptions.length > 0 && (
            <FilterDropdown
              label="Categoria"
              options={categoryOptions}
              selected={roleFilters}
              onToggle={(key) => toggle(roleFilters, setRoleFilters, key)}
              onClear={() => setRoleFilters([])}
            />
          )}
          {genreOptions.length > 0 && (
            <FilterDropdown
              label="Genere"
              options={genreOptions}
              selected={genreFilters}
              onToggle={(key) => toggle(genreFilters, setGenreFilters, key)}
              onClear={() => setGenreFilters([])}
            />
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-notte-60 px-3 text-xs font-semibold uppercase tracking-wider text-palco/70 transition hover:border-corallo hover:text-corallo"
              aria-label="Azzera tutti i filtri"
            >
              <RotateCcw className="size-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Counter */}
        <span className="hidden shrink-0 text-xs text-palco/50 sm:block">
          {filtered.length} {filtered.length === 1 ? "artista" : "artisti"}
          {hasFilters ? " trovati" : ""}
        </span>
      </div>

      {/* Mobile counter */}
      <p className="mt-2 text-xs text-muted-foreground sm:hidden">
        {filtered.length} {filtered.length === 1 ? "artista" : "artisti"}
        {hasFilters ? " trovati" : ""}
      </p>

      {/* TOP ARTIST ROW — shown only when no filters are active */}
      {showTopSection && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <p className="font-display text-sm text-notte">Top Artist</p>
            <TopArtistBadge compact />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {topArtists.map((a) => {
              const roleLabel =
                ROLE_GROUPS.find((g) => (a.instruments ?? []).some((i) => g.match(i)))?.label ??
                null;
              return (
                <ArtistCard
                  key={a.id}
                  slug={a.slug}
                  stageName={a.stage_name}
                  city={a.city}
                  coverImage={a.cover_image}
                  genres={a.genre}
                  priceBand={a.price_band}
                  canSeePrice={canSeePrice}
                  isGuest={isGuest}
                  category={roleLabel}
                  tier={a.tier}
                  artistId={a.id}
                />
              );
            })}
          </div>
          {showGridSection && (
            <div className="mt-10 mb-4 flex items-center gap-3">
              <p className="font-display text-sm text-notte">Tutti gli artisti</p>
            </div>
          )}
        </div>
      )}

      {/* RESULTS GRID */}
      {showGridSection && (
        <div className={showTopSection ? "" : "mt-10"}>
          {gridArtists.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nessun artista corrisponde ai filtri selezionati.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {gridArtists.map((a) => {
                const roleLabel =
                  ROLE_GROUPS.find((g) => (a.instruments ?? []).some((i) => g.match(i)))?.label ??
                  null;
                return (
                  <ArtistCard
                    key={a.id}
                    slug={a.slug}
                    stageName={a.stage_name}
                    city={a.city}
                    coverImage={a.cover_image}
                    genres={a.genre}
                    priceBand={a.price_band}
                    canSeePrice={canSeePrice}
                    isGuest={isGuest}
                    category={roleLabel}
                    tier={a.tier}
                    artistId={a.id}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
