"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Conteggio delle pagine viste nelle navigazioni interne.
 *
 * In App Router una navigazione non ricarica il documento: lo script di Google
 * caricato all'inizio conterebbe una sola pagina per visita, e il pixel
 * altrettanto. Da qui il `send_page_view: false` nella configurazione e questo
 * componente, che manda l'evento a ogni cambio di percorso.
 *
 * `useSearchParams` obbliga a un confine `<Suspense>` attorno a questo
 * componente: senza, l'intera pagina che lo contiene viene resa in modo
 * dinamico e le pagine pubbliche perdono la generazione statica. È lo stesso
 * motivo per cui il modulo di accesso è già avvolto in Suspense.
 */
export function PageViewTracker({
  ga,
  pixel,
}: {
  ga?: string;
  pixel?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    if (ga && typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: pagePath });
    }
    if (pixel && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams, ga, pixel]);

  return null;
}
