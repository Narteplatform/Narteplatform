"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wrapper della card di un booking raggiunto da ?highlight=<id> (es. dal
 * pulsante "Vedi booking confermato" in chat): la porta in vista e la
 * evidenzia per qualche secondo, così l'utente capisce quale riga stava
 * cercando in una lista lunga.
 */
export function HighlightedBooking({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [glow, setGlow] = useState(active);

  useEffect(() => {
    if (!active || !ref.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });

    // L'anello resta finché serve a farsi notare, poi sparisce: lasciarlo
    // fisso lo trasformerebbe in rumore alla lettura successiva.
    const t = setTimeout(() => setGlow(false), 4000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      ref={ref}
      id={`booking-${id}`}
      className={cn(
        "scroll-mt-24 rounded-2xl transition-shadow duration-500",
        glow && "ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
    >
      {children}
    </div>
  );
}
