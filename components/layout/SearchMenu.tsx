"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";

/**
 * Ricerca della top bar come pulsante a lente, sul lato destro dopo "Contatti".
 *
 * Non è un vezzo: logo + 8 voci di menu + preferiti + i pulsanti di accesso
 * saturano già la larghezza del container (1200px). Un campo di testo sempre
 * aperto lì dentro non entrerebbe a nessuna larghezza — prima infatti stava a
 * sinistra in `flex-1` e si comprimeva fino a sparire. Il pannello si apre
 * sopra il contenuto, quindi la larghezza del campo non dipende più da quanto
 * spazio avanza nella barra.
 */
export function SearchMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        aria-label={open ? "Chiudi ricerca" : "Cerca artista o evento"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/80 transition-colors hover:border-foreground hover:text-foreground"
      >
        {open ? <X className="size-4" /> : <Search className="size-4" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-3 w-[min(22rem,calc(100vw-3rem))]">
          <SearchBar autoFocus onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
