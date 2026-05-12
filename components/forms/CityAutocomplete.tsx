"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { findCitySuggestions } from "@/lib/data/italian-cities";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
};

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Inizia a digitare la città…",
  id,
  name,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => findCitySuggestions(value, 8), [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(c: string) {
    onChange(c);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        required={required}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-lg"
        >
          {suggestions.map((c, i) => (
            <li key={c}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                className={
                  "w-full px-3 py-2 text-left text-sm transition " +
                  (i === active ? "bg-muted" : "hover:bg-muted")
                }
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
