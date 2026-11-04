"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotificaRealtime = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  artist_id: string | null;
  created_at: string;
  read_at: string | null;
};

/**
 * Ascolta in tempo reale le notifiche dell'utente (tabella `notifications`,
 * pubblicata dalla migration 0076). La RLS della 0073 fa arrivare solo le
 * righe proprie; il filtro user_id evita anche di ricevere eventi altrui.
 *
 * `onEvent` riceve inserimenti e aggiornamenti (una notifica di chat
 * raggruppata si aggiorna invece di moltiplicarsi). Se il canale non si apre
 * — tabella non pubblicata, rete — resta il ripiego al ritorno sulla scheda.
 */
export function useNotificheRealtime(
  userId: string | null | undefined,
  onEvent: (n: NotificaRealtime, tipo: "INSERT" | "UPDATE") => void,
) {
  const cb = useRef(onEvent);
  useEffect(() => {
    cb.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`notifiche:${userId}:${suffix}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => cb.current(payload.new as NotificaRealtime, "INSERT"),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => cb.current(payload.new as NotificaRealtime, "UPDATE"),
        )
        .subscribe();
    } catch (err) {
      console.error("[notifiche] realtime non disponibile:", err);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[notifiche] chiusura canale:", err);
        }
      }
    };
  }, [userId]);
}
