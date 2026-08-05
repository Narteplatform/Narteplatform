"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Lock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArtistTierBadges } from "@/components/marketing/ArtistBadges";
import { LogoMarquee, type CollabLogo } from "@/components/marketing/LogoMarquee";
import type { SearchHit } from "@/app/api/search/route";

const easing = [0.22, 1, 0.36, 1] as const;

/**
 * Foto di N'arte, non più uno stock da Unsplash.
 *
 * ⚠️ L'originale è verticale (1639×2048): su desktop la hero è larga più del
 * doppio della sua altezza, quindi `object-cover` ne mostra solo una fascia
 * orizzontale. La posizione è tarata al 45% dell'altezza — non al centro —
 * perché è lì che cadono la testa del cantante e la parte alta della chitarra;
 * al 50% la fascia tagliava la fronte. Se un giorno arriva una versione
 * orizzontale della stessa foto, va sostituita: sopra i 1639px di larghezza
 * questa non ha più pixel da dare e su un monitor grande si ammorbidisce.
 */
const HERO_BG = "/hero-terrazza.webp";

// La prima voce si chiama per esteso e non "Tutti": i due select stanno
// affiancati e mostravano entrambi la stessa parola, senza far capire quale
// fosse il genere e quale la città.
const GENRES = [
  { v: "", label: "Tutti i generi" },
  { v: "rock", label: "Rock" },
  { v: "pop", label: "Pop" },
  { v: "jazz", label: "Jazz" },
  { v: "neomelodica", label: "Neomelodica" },
  { v: "indie", label: "Indie" },
  { v: "elettronica", label: "Elettronica" },
  { v: "classica", label: "Classica" },
];

const CITIES = [
  { v: "", label: "Tutte le città" },
  { v: "Napoli", label: "Napoli" },
  { v: "Caserta", label: "Caserta" },
  { v: "Salerno", label: "Salerno" },
  { v: "Avellino", label: "Avellino" },
  { v: "Benevento", label: "Benevento" },
];

export function HeroNarteClient({ partners }: { partners: CollabLogo[] }) {
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
    // Se c'e' un solo match esatto in autocomplete, vai diretto. Mai sui
    // risultati oscurati: lì `title` è il segnaposto uguale per tutti, e
    // digitarlo manderebbe l'ospite su un artista a caso.
    const t = q.trim().toLowerCase();
    const exact = hits.find((h) => !h.locked && h.title.toLowerCase() === t);
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
          src={HERO_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_45%] opacity-45"
        />
        {/* Il gradiente resta carico in alto e in basso (header e fondo sezione)
            e si alleggerisce al centro, dove passa il titolo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-notte/70 via-notte/55 to-notte/85"
        />
      </div>

      {/* Il nastro dei partner sta fuori da questo blocco, quindi l'altezza
          minima non è quella della hero intera: 86svh qui più il nastro in
          fondo (80px di loghi + il suo padding) fanno una hero di circa uno
          schermo pieno. La foto ha così più spazio verticale, ma i loghi
          restano sopra la piega: alzare ancora questo valore li manderebbe
          sotto.

          Il padding è volutamente asimmetrico. Con `justify-center` il centro
          del contenuto cade a (altezza + pt − pb) / 2: pt molto più grande di
          pb sposta in basso titolo, ricerca e pulsanti senza rinunciare alla
          centratura, che sui viewport bassi è quella che evita il taglio.

          ⚠️  z-20 contro lo z-10 del nastro, e la differenza è load-bearing.
          `relative z-*` apre un contesto di impilamento: lo z-50 della tendina
          dell'autocomplete vale solo dentro questo blocco, quindi a parità di
          z-index vinceva il nastro, che nel DOM viene dopo — i loghi
          passavano sopra i risultati della ricerca. */}
      <div className="container-narte relative z-20 flex min-h-[86svh] flex-col items-center justify-center px-6 pb-12 pt-32 text-center md:pb-14 md:pt-48">
        <motion.h1
          {...titleAnim(0.1)}
          className="font-display tracking-[-0.045em]"
          style={{ lineHeight: 0.95 }}
        >
          {/* Space Grotesk arriva a 700: font-black (900) e italic non hanno un
              taglio reale, il browser li sintetizzerebbe. L'accento è il colore. */}
          {/* Una frase sola spezzata in due righe: alla scala della hero non
              sta su una riga, e il taglio va tenuto qui e non lasciato al
              browser, che a certe larghezze manderebbe a capo dopo "per". */}
          {/* Lo spazio in coda serve al testo accessibile: le due righe sono
              `block`, e senza di lui l'h1 viene annunciato "…idealeper il tuo
              evento". A schermo non si vede, uno spazio a fine riga si
              collassa. */}
          {/* Sotto `sm` il corpo è fluido invece che fisso: a 48px "L'artista
              ideale" non entrava nella larghezza di un telefono e andava a capo
              da solo, spezzando la frase in tre righe invece di due. Il clamp
              lega la dimensione alla larghezza dello schermo, così ogni riga
              resta una riga da 320px in su; il tetto di 3rem impedisce che sui
              telefoni larghi superi il gradino successivo. */}
          <span className="block text-[clamp(2.1rem,9.6vw,3rem)] font-bold text-palco sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            L&rsquo;artista ideale{" "}
          </span>
          <span className="mt-2 block text-[clamp(2.1rem,9.6vw,3rem)] font-bold text-azzurro-light sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            per il tuo evento
          </span>
        </motion.h1>

        {/* Niente whitespace-nowrap: una frase più lunga di quella vecchia
            uscirebbe dallo schermo alle larghezze intermedie. */}
        <motion.p
          {...titleAnim(0.2)}
          className="mt-4 max-w-2xl text-pretty text-[1.1rem] text-palco/75 sm:mt-5 sm:text-base md:text-lg"
        >
          Cerca tra centinaia di artisti per genere, tipologia e disponibilità e
          contattali per la tua serata!
        </motion.p>

        {/* Search bar */}
        <motion.form
          {...titleAnim(0.28)}
          onSubmit={onSearch}
          className="mt-6 w-full max-w-3xl sm:mt-8"
        >
          <div ref={wrapRef} className="relative">
            {/* Una riga sola a ogni larghezza: campo e pulsante affiancati
                dentro la stessa pillola. Prima sotto `sm` la barra andava in
                colonna e il pulsante prendeva una seconda riga a tutta
                larghezza, alta quanto il campo — il doppio di ingombro per la
                stessa funzione. */}
            <div className="flex items-center gap-1.5 rounded-full bg-palco p-1.5 shadow-xl shadow-black/30 sm:items-stretch">
              <label className="flex min-w-0 flex-1 items-center gap-2 pl-3 sm:pl-4">
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

              {/* I due menu a tendina esistono solo da `sm` in su. Su un
                  telefono impilavano due righe alte 40px sopra il pulsante,
                  triplicando l'altezza della barra per due filtri che lì si
                  usano poco: la ricerca testuale copre già genere e città,
                  perché l'API cerca anche fra i generi del profilo. Lo stato
                  resta vuoto e la ricerca parte senza filtri; chi vuole
                  filtrare trova gli stessi controlli su /artisti. */}
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

              {/* Sotto `sm` è un tondo con la sola lente: la parola "Cerca"
                  costringerebbe il campo di testo a metà larghezza. */}
              <Button
                type="submit"
                variant="default"
                size="md"
                aria-label="Cerca"
                className="!h-10 !w-10 shrink-0 !rounded-full !px-0 sm:!w-auto sm:!px-5"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Cerca</span>
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
                      // `locked` lo decide il server: agli ospiti il nome non
                      // arriva nemmeno, `h.title` è il segnaposto.
                      const locked = h.locked === true;
                      return (
                        <li key={`${h.type}-${h.slug}`} role="option" aria-selected={active}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIdx(i)}
                            onClick={() => goToArtist(h.slug)}
                            aria-label={
                              locked
                                ? "Iscriviti per vedere i dettagli dell'artista"
                                : undefined
                            }
                            className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                              active ? "bg-palco-80" : "hover:bg-palco-80"
                            }`}
                          >
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-palco-80">
                              {h.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={h.image}
                                  alt=""
                                  className={`h-full w-full object-cover ${
                                    // scale-125 insieme al blur: senza, la
                                    // sfocatura scopre i bordi del riquadro.
                                    locked ? "scale-125 blur-[6px]" : ""
                                  }`}
                                />
                              ) : null}
                              {locked && (
                                <span
                                  aria-hidden="true"
                                  className="absolute inset-0 flex items-center justify-center bg-notte/45"
                                >
                                  <Lock className="size-3.5 text-palco" />
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`truncate font-display text-sm ${
                                    locked ? "select-none blur-[3px]" : ""
                                  }`}
                                  aria-hidden={locked}
                                >
                                  {h.title}
                                </span>
                                <ArtistTierBadges tier={h.tier} compact className="shrink-0" />
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
                <div className="flex items-center justify-between gap-3 border-t border-palco-60 px-4 py-2 text-[11px] uppercase tracking-wider">
                  {/* Senza una riga che lo spieghi, la tendina sfocata sembra
                      un errore di caricamento invece di un contenuto riservato. */}
                  <span className="text-notte/50">
                    {hits.some((h) => h.locked)
                      ? "Iscriviti per vedere i nomi"
                      : ""}
                  </span>
                  <Link
                    href="/artisti"
                    onClick={() => setOpen(false)}
                    className="shrink-0 text-azzurro hover:underline"
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
          className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8"
        >
          <Button asChild size="lg">
            <Link href="/artisti">Trova il tuo artista</Link>
          </Button>
          {/* Fuori da mobile: su un telefono era la seconda di due CTA a
              tutta larghezza in una hero già lunga, e portava a un modulo che
              sta comunque in fondo alla stessa pagina. Da `sm` in su le due
              CTA stanno affiancate e il costo dello spazio non c'è. */}
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="hidden text-palco hover:bg-palco/10 hover:text-palco sm:inline-flex"
          >
            <Link href="#richiedi">Raccontaci il tuo evento</Link>
          </Button>
        </motion.div>
      </div>

      {/* PARTNER. Fuori da `container-narte` perché il nastro deve arrivare ai
          bordi dello schermo: dentro il contenitore le sfumature laterali si
          fermerebbero a 1200px, con due tagli netti in mezzo alla hero.
          Più lento della sezione più in basso (45s contro 30s): qui è un
          fondale, non il contenuto della fascia.
          z-10: sopra la foto di sfondo, sotto il blocco della ricerca. */}
      {partners.length > 0 && (
        <motion.div
          {...titleAnim(0.48)}
          className="relative z-10 pb-12 md:pb-16"
        >
          <LogoMarquee logos={partners} speed={45} surface="on-dark" />
        </motion.div>
      )}
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
    <div className="relative hidden items-center sm:flex">
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
