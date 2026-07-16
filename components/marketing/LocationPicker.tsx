"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const CITIES = ["Roma", "Milano", "Bologna", "Firenze", "Napoli", "Torino"];

export function LocationPicker({ defaultCity = "Roma" }: { defaultCity?: string }) {
  const [city, setCity] = useState(defaultCity);
  const [open, setOpen] = useState(false);

  return (
    <section className="container-narte my-8">
      <div className="relative bg-foreground text-background">
        <div className="px-6 pt-5">
          <span className="accent-label">location</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-6 pb-6 pt-2 text-left"
        >
          <span className="font-display text-3xl md:text-5xl">{city}</span>
          <ChevronDown
            className={`size-8 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {open && (
          <ul className="absolute left-0 right-0 top-full z-10 grid grid-cols-2 gap-px border-t border-background/20 bg-background/10 md:grid-cols-3">
            {CITIES.map((c) => (
              <li key={c}>
                <button
                  className="flex w-full items-center justify-start bg-foreground px-6 py-4 text-left font-display text-xl hover:bg-foreground/80"
                  onClick={() => {
                    setCity(c);
                    setOpen(false);
                  }}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
