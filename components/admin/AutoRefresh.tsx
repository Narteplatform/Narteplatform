"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Aggiorna automaticamente i dati della pagina (Server Components) tramite
 * router.refresh() a intervalli regolari e quando la finestra torna in focus.
 * Utile per le sezioni admin che devono riflettere nuove candidature/richieste
 * senza ricaricare manualmente.
 */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, intervalMs]);

  return null;
}
