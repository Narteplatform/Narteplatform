"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { SearchHit } from "@/app/api/search/route";

const easing = [0.22, 1, 0.36, 1] as const;

const CONCERT_BG =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2400&q=80";

const GENRES = [
  { v: "", label: "Tutti" },
  { v: "rock", label: "Rock" },
  { v: "pop", label: "Pop" },
  { v: "jazz", label: "Jazz" },
  { v: "neomelodica", label: "Neomelodica" },
  { v: "indie", label: "Indie" },
  { v: "elettronica", label: "Elettronica" },
  { v: "classica", label: "Classica" },
];

const CITIES = [
  { v: "", label: "Tutti" },
  { v: "Napoli", label: "Napoli" },
  { v: "Caserta", label: "Caserta" },
  { v: "Salerno", label: "Salerno" },
  { v: "Avellino", label: "Avellino" },
  { v: "Benevento", label: "Benevento" },
];

const STATS = [
  { value: "200+", label: "Artisti verificati" },
  { value: "500+", label: "Prenotazioni completate" },
  { value: "50+", label: "Locali partner" },
];

export function HeroNarteClient() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [genre, setGenre] = React.useState("");
  const [city, setCity] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const titleAnim = (delay: number) => ({
    initial: reduce ? false : { y: 28, opacity: 0 },
    animate: reduce ? undefined : { y: 0, opacity: 1 },
    transition: { duration: 0.9, ease: easing, delay },
  });

  // Debounce fetch artisti dal DB
  React.useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setHits([]);
      setOpen(false);
      setActiveIdx(-1);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(t)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data: { hits: SearchHit[] } = await res.json();
        // Solo artisti nella hero
        const onlyArtists = data.hits.filter((h) => h.type === "artist");
        setHits(onlyArtists);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        // aborts ignorati
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // Chiudi su click fuori
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function goToArtist(slug: string) {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(`/artisti/${slug}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIdx >= 0 ? hits[activeIdx] : hits[0];
      if (target) goToArtist(target.slug);
      else onSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onSearch(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    // Se c'e' un solo match esatto in autocomplete, vai diretto
    const t = q.trim().toLowerCase();
    const exact = hits.find((h) => h.title.toLowerCase() === t);
    if (exact) {
      goToArtist(exact.slug);
      return;
    }
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (genre) params.set("genre", genre);
    if (city) params.set("city", city);
    const qs = params.toString();
    router.push(qs ? `/artisti?${qs}` : "/artisti");
  }

  return (
    <section className="relative isolate w-full overflow-hidden bg-notte text-palco">
      {/* Background concerto */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={CONCERT_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-notte/85 via-notte/75 to-notte/95"
        />
      </div>

      <div className="container-narte relative z-10 flex min-h-[88svh] flex-col items-center justify-center px-6 py-24 text-center md:py-32">
        <motion.p
          {...titleAnim(0.02)}
          className="accent-label text-azzurro-light"
        >
          community musicale napoletana
        </motion.p>

        <motion.h1
          {...titleAnim(0.1)}
          className="font-display tracking-tight"
          style={{ lineHeight: 0.95 }}
        >
          <span className="mt-5 block text-5xl font-black text-palco sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            La tua musica
          </span>
          <span className="mt-2 block text-5xl font-bold italic text-azzurro-light sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            merita un palco.
          </span>
        </motion.h1>

        <motion.p
          {...titleAnim(0.2)}
          className="mt-6 max-w-xl text-base text-palco/75 md:text-lg"
        >
          Prenota artisti emergenti di Napoli per il tuo locale, festival o evento privato.
        </motion.p>

        {/* Search bar */}
        <motion.form
          {...titleAnim(0.28)}
          onSubmit={onSearch}
          className="mt-8 w-full max-w-3xl"
        >
          <div ref={wrapRef} className="relative">
            <div className="flex flex-col gap-2 rounded-2xl bg-palco p-2 shadow-xl shadow-black/30 sm:flex-row sm:items-stretch sm:rounded-full sm:p-1.5">
              <label className="flex flex-1 items-center gap-2 px-4 sm:px-4">
                <Search className="size-4 shrink-0 text-notte/40" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => q.trim().length >= 2 && hits.length > 0 && setOpen(true)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Cerca artista, genere…"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="hero-search-results"
                  aria-autocomplete="list"
                  className="h-10 w-full bg-transparent text-sm text-notte placeholder:text-notte/40 focus:outline-none"
                />
              </label>

              <HeroSelect
                value={genre}
                onChange={setGenre}
                options={GENRES}
                ariaLabel="Genere"
              />
              <HeroSelect
                value={city}
                onChange={setCity}
                options={CITIES}
                ariaLabel="Città"
              />

              <Button
                type="submit"
                variant="default"
                size="md"
                className="!h-10 !rounded-full px-5"
              >
                <Search className="size-4" /> Cerca
              </Button>
            </div>

            {open && (
              <div
                id="hero-search-results"
                role="listbox"
                className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-palco-60 bg-palco text-left text-notte shadow-2xl"
              >
                {loading && (
                  <p className="px-4 py-3 text-xs uppercase tracking-wider text-notte/50">
                    Cerco…
                  </p>
                )}
                {!loading && hits.length === 0 && (
                  <p className="px-4 py-3 text-xs uppercase tracking-wider text-notte/50">
                    Nessun artista per &quot;{q}&quot;
                  </p>
                )}
                {hits.length > 0 && (
                  <ul className="py-1">
                    {hits.map((h, i) => {
                      const active = i === activeIdx;
                      return (
                        <li key={`${h.type}-${h.slug}`} role="option" aria-selected={active}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIdx(i)}
                            onClick={() => goToArtist(h.slug)}
                            className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                              active ? "bg-palco-80" : "hover:bg-palco-80"
                            }`}
                          >
                            <span className="size-10 shrink-0 overflow-hidden rounded-md bg-palco-80">
                              {h.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={h.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-display text-sm">
                                {h.title}
                              </span>
                              {h.subtitle && (
                                <span className="block truncate text-xs text-notte/55">
                                  {h.subtitle}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="border-t border-palco-60 px-4 py-2 text-right text-[11px] uppercase tracking-wider">
                  <Link
                    href="/artisti"
                    onClick={() => setOpen(false)}
                    className="text-azzurro hover:underline"
                  >
                    Vedi tutti gli artisti
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.form>

        {/* CTA */}
        <motion.div
          {...titleAnim(0.38)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg">
            <Link href="/artisti">Scopri gli artisti</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="text-palco hover:bg-palco/10 hover:text-palco"
          >
            <Link href="/chi-siamo">Come funziona</Link>
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          {...titleAnim(0.48)}
          className="mt-16 w-full max-w-2xl border-t border-palco/15 pt-8"
        >
          <dl className="grid grid-cols-3 gap-4 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-3xl font-bold text-palco md:text-4xl">
                  {s.value}
                </dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-palco/60 md:text-[13px]">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}

function HeroSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-10 w-full appearance-none rounded-full bg-transparent pl-3 pr-8 text-sm text-notte focus:outline-none sm:w-auto sm:min-w-[110px]"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-4 text-notte/40" />
    </div>
  );
}
