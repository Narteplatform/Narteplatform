"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Tiene il calendario di un artista allineato in tempo reale.
 *
 * Serve in due posti che raccontano la stessa cosa a due persone diverse: la
 * dashboard dell'artista e il suo profilo pubblico. Se l'artista libera un
 * sabato mentre un organizzatore sta guardando la pagina, quel sabato deve
 * diventare prenotabile lì per lì, senza che nessuno ricarichi niente.
 *
 * L'aggiornamento è un `router.refresh()`, non un ricalcolo lato client: la
 * disponibilità reale nasce dall'incrocio di tre tabelle più la risoluzione
 * degli slot in lib/slots.ts, e riscrivere quella logica nel browser vorrebbe
 * dire tenerne due copie che prima o poi divergono. Si rigenera il render del
 * server, che quella logica ce l'ha già.
 *
 * Il debounce non è cosmetico: una modifica in massa scrive fino a 365 righe e
 * fa arrivare altrettanti eventi: senza, sarebbero 365 refresh.
 */
const DEBOUNCE_MS = 400;

const TABELLE = [
  "artist_availability",
  "artist_date_slots",
  "artist_default_slots",
] as const;

export function useArtistCalendarChannel(artistId: string | null | undefined) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!artistId) return;

    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        router.refresh();
      }, DEBOUNCE_MS);
    };

    try {
      channel = supabase.channel(`artist-calendar:${artistId}:${suffix}`);
      for (const table of TABELLE) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `artist_id=eq.${artistId}`,
          },
          bump
        );
      }
      channel.subscribe();
    } catch (err) {
      // Il calendario resta corretto, solo non si aggiorna da solo: non è un
      // motivo per rompere la pagina.
      console.error("[calendar] realtime subscribe failed:", err);
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[calendar] realtime cleanup failed:", err);
        }
      }
    };
  }, [artistId, router]);
}
