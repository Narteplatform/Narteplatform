"use client";

import { useMemo, useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Search, ChevronDown, RotateCcw, Check, CalendarDays, X } from "lucide-react";
import { ArtistCard, PERCORSO_LABEL } from "@/components/marketing/ArtistCard";
import { TopArtistBadge } from "@/components/marketing/ArtistBadges";
import type { FasciaPrezzo } from "@/components/marketing/PriceBandBadge";
import type { ArtistFormation, ArtistPath, ArtistTier } from "@/lib/supabase/types";
import { urlCriteriPosizionamento } from "@/lib/legal/v2/link";
import { artistiOccupatiIl } from "@/app/(user)/artisti/_actions";

export type ExplorerArtist = {
  id: string;
  /**
   * Identificativi e dati riservati: assenti per gli ospiti. La pagina server
   * non li legge nemmeno dal database, quindi non sono mai nel payload.
   */
  slug?: string;
  stage_name?: string;
  city?: string | null;
  cover_image?: string | null;
  genre: string[];
  instruments: string[];
  /** Solista o band. Null se non indicato (profili precedenti alla 0075). */
  formazione?: ArtistFormation | null;
  /** Fascia di prezzo (da `price_range`): presente solo per chi può vederla. */
  fascia?: FasciaPrezzo | null;
  /** L'artista ha indicato una fascia (anche se il visitatore non può vederla). */
  haFascia?: boolean;
  /** Percorso artistico, già filtrato per piano dalla pagina. */
  percorso?: ArtistPath | null;
  tier?: ArtistTier | null;
  /** Media dei voti ricevuti. `null` quando l'artista non ha recensioni. */
  rating?: { average: number; count: number } | null;
};

/** Filtri iniziali letti dall'URL dalla pagina server (es. ricerca dalla home). */
export type FiltriIniziali = {
  q: string;
  genre: string[];
  categoria: string[];
  formazione: string[];
  city: string[];
  percorso: string[];
  /** YYYY-MM-DD, già verificata dal server; null se assente o illeggibile. */
  data: string | null;
};

/** Confronto senza maiuscole né accenti: «Elettronica» = «elettronica». */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Chiave della città: «Napoli», «napoli », «Napoli (NA)» e «Napoli, Campania»
 * finiscono nella stessa voce del filtro. `artists.city` è testo libero.
 */
function chiaveCitta(s: string): string {
  return norm(s.replace(/\(.*?\)/g, "").split(",")[0] ?? "");
}

function dataLeggibile(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

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

const FORMAZIONE_LABEL: Record<ArtistFormation, string> = { solista: "Solista", band: "Band" };

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
  // Da telefono il pannello aperto dal bordo sinistro del pulsante usciva
  // dallo schermo (il pulsante «Genere» sta a destra): all'apertura si misura
  // lo spazio e, se non basta, il pannello si allinea al bordo destro.
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const panelWidth = Math.min(260, window.innerWidth - 32);
      setAlignRight(rect.left + panelWidth > window.innerWidth - 16);
    }
    setOpen((v) => !v);
  }

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
        onClick={toggleOpen}
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
          className={[
            "absolute top-full z-50 mt-2 w-max min-w-[min(200px,calc(100vw-2rem))] max-w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-lg",
            alignRight ? "right-0" : "left-0",
          ].join(" ")}
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
  filtriIniziali,
  occupatiIniziali = null,
  oggi,
}: {
  artists: ExplorerArtist[];
  canSeePrice?: boolean;
  isGuest?: boolean;
  filtriIniziali?: FiltriIniziali;
  /** Artisti occupati nella data di `filtriIniziali.data`, letti dal server. */
  occupatiIniziali?: string[] | null;
  /** Oggi (fuso di Roma), dal server: minimo selezionabile nel filtro data. */
  oggi?: string;
}) {
  // Stato iniziale dall'URL. I valori sconosciuti si scartano (ruoli,
  // formazione, percorso) o si allineano a quelli del roster (generi e città,
  // senza maiuscole né accenti: la home manda «rock», il profilo dice «Rock»).
  const [genreFilters, setGenreFilters] = useState<string[]>(() => {
    const generi = new Map<string, string>();
    for (const a of artists) for (const g of a.genre ?? []) if (!generi.has(norm(g))) generi.set(norm(g), g);
    return [...new Set((filtriIniziali?.genre ?? []).map((g) => generi.get(norm(g)) ?? g))];
  });
  const [roleFilters, setRoleFilters] = useState<string[]>(() =>
    (filtriIniziali?.categoria ?? []).filter((k) => ROLE_GROUPS.some((r) => r.key === k))
  );
  const [formazioneFilters, setFormazioneFilters] = useState<string[]>(() =>
    (filtriIniziali?.formazione ?? []).filter((k) => k === "solista" || k === "band")
  );
  const [percorsoFilters, setPercorsoFilters] = useState<string[]>(() =>
    (filtriIniziali?.percorso ?? []).filter((k) => k in PERCORSO_LABEL)
  );
  // Le città si tengono per chiave normalizzata; l'etichetta di una città
  // chiesta dall'URL ma assente dal roster resta quella scritta nell'URL.
  const [cityFilters, setCityFilters] = useState<string[]>(() => [
    ...new Set((filtriIniziali?.city ?? []).map(chiaveCitta).filter(Boolean)),
  ]);
  const [cittaDaUrl] = useState<Map<string, string>>(
    () => new Map((filtriIniziali?.city ?? []).map((c) => [chiaveCitta(c), c.trim()]))
  );
  const [query, setQuery] = useState(filtriIniziali?.q ?? "");

  // Filtro «Libero il»: chi è occupato in quella data esce dai risultati.
  const [dataLibera, setDataLibera] = useState<string | null>(filtriIniziali?.data ?? null);
  const [occupati, setOccupati] = useState<Set<string> | null>(() =>
    filtriIniziali?.data && occupatiIniziali ? new Set(occupatiIniziali) : null
  );
  const [erroreData, setErroreData] = useState<string | null>(null);
  const [caricaData, startCaricaData] = useTransition();
  const ultimaDataChiesta = useRef<string | null>(filtriIniziali?.data ?? null);

  function cambiaData(valore: string) {
    setErroreData(null);
    ultimaDataChiesta.current = valore || null;
    if (!valore) {
      setDataLibera(null);
      setOccupati(null);
      return;
    }
    setDataLibera(valore);
    setOccupati(null);
    startCaricaData(async () => {
      const esito = await artistiOccupatiIl(valore);
      // Una risposta arrivata dopo un cambio di data non vale più.
      if (ultimaDataChiesta.current !== valore) return;
      if (esito.ok) setOccupati(new Set(esito.ids));
      else setErroreData(esito.error);
    });
  }

  // L'URL segue i filtri, senza ricaricare la pagina: un link copiato o il
  // tasto Indietro riportano agli stessi risultati.
  useEffect(() => {
    const params = new URLSearchParams();
    const q = query.trim();
    if (q) params.set("q", q);
    if (genreFilters.length) params.set("genre", genreFilters.join(","));
    if (roleFilters.length) params.set("categoria", roleFilters.join(","));
    if (formazioneFilters.length) params.set("formazione", formazioneFilters.join(","));
    if (percorsoFilters.length) params.set("percorso", percorsoFilters.join(","));
    if (cityFilters.length) params.set("city", cityFilters.join(","));
    if (dataLibera) params.set("data", dataLibera);
    const qs = params.toString();
    const attuale = window.location.search.replace(/^\?/, "");
    if (qs === attuale) return;
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [query, genreFilters, roleFilters, formazioneFilters, percorsoFilters, cityFilters, dataLibera]);

  // Il filtro compare solo se almeno un profilo ha indicato la formazione.
  const formazioneOptions = useMemo(() => {
    const m = new Map<ArtistFormation, number>();
    for (const a of artists) if (a.formazione) m.set(a.formazione, (m.get(a.formazione) ?? 0) + 1);
    return (Object.keys(FORMAZIONE_LABEL) as ArtistFormation[])
      .filter((k) => (m.get(k) ?? 0) > 0)
      .map((k) => ({ key: k, label: FORMAZIONE_LABEL[k], count: m.get(k) ?? 0 }));
  }, [artists]);

  // Percorso artistico: solo i profili il cui piano lo include (la pagina
  // passa `percorso` già filtrato).
  const percorsoOptions = useMemo(() => {
    const m = new Map<ArtistPath, number>();
    for (const a of artists) if (a.percorso) m.set(a.percorso, (m.get(a.percorso) ?? 0) + 1);
    return (Object.keys(PERCORSO_LABEL) as ArtistPath[])
      .filter((k) => (m.get(k) ?? 0) > 0)
      .map((k) => ({ key: k, label: PERCORSO_LABEL[k], count: m.get(k) ?? 0 }));
  }, [artists]);

  // Città dal roster (testo libero in `artists.city`), raggruppate per chiave.
  const cityOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const a of artists) {
      const c = a.city?.trim();
      if (!c) continue;
      const k = chiaveCitta(c);
      if (!k) continue;
      const voce = m.get(k);
      if (voce) voce.count += 1;
      else m.set(k, { label: c.replace(/\s*\(.*?\)\s*/g, " ").split(",")[0].trim() || c, count: 1 });
    }
    // Una città chiesta dall'URL (es. dalla home) senza artisti resta visibile,
    // con 0: meglio che ignorarla in silenzio.
    for (const k of cityFilters) {
      if (!m.has(k)) m.set(k, { label: cittaDaUrl.get(k) ?? k, count: 0 });
    }
    return [...m.entries()]
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label, "it"));
  }, [artists, cityFilters, cittaDaUrl]);

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

  const genreOptions = useMemo(() => {
    const opts = allGenres.map((g) => ({
      key: g,
      label: g,
      count: genreCounts.get(g) ?? 0,
    }));
    // Genere chiesto dall'URL ma assente dal roster: visibile con 0.
    for (const g of genreFilters) {
      if (!opts.some((o) => o.key === g)) opts.push({ key: g, label: g, count: 0 });
    }
    return opts;
  }, [allGenres, genreCounts, genreFilters]);

  const hasFilters =
    genreFilters.length > 0 ||
    roleFilters.length > 0 ||
    formazioneFilters.length > 0 ||
    percorsoFilters.length > 0 ||
    cityFilters.length > 0 ||
    dataLibera !== null ||
    query.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const generiScelti = new Set(genreFilters.map(norm));
    return artists.filter((a) => {
      if (formazioneFilters.length > 0 && !(a.formazione && formazioneFilters.includes(a.formazione))) {
        return false;
      }
      if (percorsoFilters.length > 0 && !(a.percorso && percorsoFilters.includes(a.percorso))) {
        return false;
      }
      if (cityFilters.length > 0) {
        const k = a.city ? chiaveCitta(a.city) : "";
        if (!k || !cityFilters.includes(k)) return false;
      }
      // Finché la lettura non è arrivata (o se è fallita) non si esclude
      // nessuno: un elenco di occupati mancante non vuol dire «tutti liberi».
      if (dataLibera && occupati && occupati.has(a.id)) return false;
      if (generiScelti.size > 0) {
        const has = (a.genre ?? []).some((g) => generiScelti.has(norm(g)));
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
        const hay = isGuest
          ? `${(a.genre ?? []).join(" ")} ${(a.instruments ?? []).join(" ")}`.toLowerCase()
          : `${a.stage_name ?? ""} ${a.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    artists,
    genreFilters,
    roleFilters,
    formazioneFilters,
    percorsoFilters,
    cityFilters,
    dataLibera,
    occupati,
    query,
    isGuest,
  ]);

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

  function renderCard(a: ExplorerArtist) {
    if (isGuest) {
      // Variante anonima: id (per l'anteprima sfocata dal server), genere e piano.
      return <ArtistCard key={a.id} isGuest id={a.id} genres={a.genre} tier={a.tier} />;
    }
    return (
      <ArtistCard
        key={a.id}
        slug={a.slug}
        stageName={a.stage_name}
        city={a.city}
        coverImage={a.cover_image}
        genres={a.genre}
        fascia={a.fascia ?? null}
        haFascia={a.haFascia ?? false}
        percorso={a.percorso ?? null}
        canSeePrice={canSeePrice}
        tier={a.tier}
        artistId={a.id}
        rating={a.rating}
      />
    );
  }

  function reset() {
    setGenreFilters([]);
    setRoleFilters([]);
    setFormazioneFilters([]);
    setPercorsoFilters([]);
    setCityFilters([]);
    cambiaData("");
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
            placeholder={isGuest ? "Cerca per genere o strumento…" : "Cerca per nome o città…"}
            className="h-10 w-full rounded-full border border-notte-60 bg-notte-80 pl-10 pr-4 text-sm text-palco placeholder:text-palco/40 focus:outline-none focus:ring-2 focus:ring-azzurro focus:ring-offset-1 focus:ring-offset-notte"
            aria-label="Cerca artista"
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {formazioneOptions.length > 0 && (
            <FilterDropdown
              label="Formazione"
              options={formazioneOptions}
              selected={formazioneFilters}
              onToggle={(key) => toggle(formazioneFilters, setFormazioneFilters, key)}
              onClear={() => setFormazioneFilters([])}
            />
          )}
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
          {!isGuest && cityOptions.length > 0 && (
            <FilterDropdown
              label="Città"
              options={cityOptions}
              selected={cityFilters}
              onToggle={(key) => toggle(cityFilters, setCityFilters, key)}
              onClear={() => setCityFilters([])}
            />
          )}
          {!isGuest && percorsoOptions.length > 0 && (
            <FilterDropdown
              label="Percorso"
              options={percorsoOptions}
              selected={percorsoFilters}
              onToggle={(key) => toggle(percorsoFilters, setPercorsoFilters, key)}
              onClear={() => setPercorsoFilters([])}
            />
          )}
          {/* Data libera: solo con un account, come il calendario del profilo. */}
          {!isGuest && (
            <div
              className={[
                "inline-flex h-10 items-center gap-2 rounded-full border pl-4 pr-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                dataLibera
                  ? "border-azzurro bg-azzurro text-white"
                  : "border-notte/30 bg-white text-notte hover:border-notte",
              ].join(" ")}
            >
              <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
              <label htmlFor="filtro-data-libera" className="whitespace-nowrap">
                Libero il
              </label>
              <input
                id="filtro-data-libera"
                type="date"
                min={oggi}
                value={dataLibera ?? ""}
                onChange={(e) => cambiaData(e.target.value)}
                className="h-8 w-[8.5rem] rounded-full bg-transparent px-1 text-xs normal-case tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-azzurro"
                aria-describedby={erroreData ? "filtro-data-errore" : undefined}
              />
              {dataLibera && (
                <button
                  type="button"
                  onClick={() => cambiaData("")}
                  className="inline-flex size-6 items-center justify-center rounded-full hover:bg-white/20"
                  aria-label="Togli il filtro per data"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
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
        <span className="hidden shrink-0 text-xs text-palco/50 sm:block" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "artista" : "artisti"}
          {hasFilters ? " trovati" : ""}
        </span>
      </div>

      {/* Mobile counter */}
      <p className="mt-2 text-xs text-muted-foreground sm:hidden">
        {filtered.length} {filtered.length === 1 ? "artista" : "artisti"}
        {hasFilters ? " trovati" : ""}
      </p>

      {dataLibera && (caricaData || erroreData) && (
        <p
          id="filtro-data-errore"
          role="status"
          className={`mt-2 text-xs ${erroreData ? "text-corallo" : "text-notte/60"}`}
        >
          {erroreData
            ? `${erroreData} Per ora vedi tutti gli artisti, anche quelli già impegnati il ${dataLeggibile(dataLibera)}.`
            : `Controllo chi è libero il ${dataLeggibile(dataLibera)}…`}
        </p>
      )}

      {/* Trasparenza sull'ordine (art. 22 c. 4-bis Cod. consumo): sempre
          visibile, anche da telefono, sopra i risultati. */}
      {/* Il dettaglio dei criteri sta nella pagina linkata, raggiungibile in un
          clic dai risultati. La sezione è chiara (bianca) dentro un layout
          data-theme="dark": si usano i colori notte espliciti, non foreground. */}
      <p className="mt-3 text-xs text-notte/70">
        Ordine:{" "}
        <Link
          href={urlCriteriPosizionamento()}
          className="underline underline-offset-4 hover:text-notte"
        >
          come funziona
        </Link>
      </p>

      {/* TOP ARTIST ROW — shown only when no filters are active */}
      {showTopSection && (
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <p className="font-display text-sm text-notte">
              Top Artist &mdash; in evidenza con il piano Max, a pagamento
            </p>
            <TopArtistBadge compact />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {topArtists.map((a) => {
              return renderCard(a);
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
                return renderCard(a);
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
