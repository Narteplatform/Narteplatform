"use client";

import { Suspense } from "react";
import Script from "next/script";
import { useTrackingConsent } from "@/lib/legal/consent-client";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

/**
 * Google Analytics 4 e pixel di Meta, subordinati al consenso.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DUE INTERRUTTORI, ENTRAMBI NECESSARI.
 *
 *   1. La variabile d'ambiente. Vuota, il tag non esiste. È lo stesso schema di
 *      `BUNNY_UPLOADS_ENABLED`: tornare indietro è svuotare una variabile e
 *      ridistribuire, non un ripristino di codice.
 *   2. Il consenso. Anche con la variabile valorizzata, lo script non viene
 *      SCRITTO nella pagina finché la finalità non è concessa. Non è un tag
 *      caricato e poi messo a tacere: proprio non c'è.
 *
 * ⚠️ Sono variabili `NEXT_PUBLIC_`: finiscono nel pacchetto al momento del
 * build. Cambiarle su Vercel senza ridistribuire non ha alcun effetto.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * GA4 È CONFIGURATO PER LE SOLE STATISTICHE. Nessuna funzione pubblicitaria:
 * `ad_storage` non viene mai concesso da qui e il tag non è collegato a Google
 * Ads. Se un domani si vorranno le conversioni pubblicitarie andrà cambiata
 * questa riga, aggiornata l'informativa e rifatto il consenso.
 *
 * DUE RETI, NON UNA. Il widget di iubenda blocca già da sé le richieste verso i
 * domini di Google Analytics e di Meta finché la finalità non è concessa. Questo
 * componente aggiunge lo strato che quel blocco non può dare: gli script non
 * vengono nemmeno SCRITTI nella pagina. Non è ridondanza — il blocco automatico
 * agisce sulle richieste che riesce a intercettare, e su App Router gli script
 * sono iniettati in momenti che dipendono dall'idratazione. Qui invece la
 * condizione è a monte e non dipende dai tempi di nessuno.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown };
  }
}

export function TrackingScripts() {
  const { measurement, advertising } = useTrackingConsent();

  const caricaGa = Boolean(GA_ID) && measurement;
  const caricaPixel = Boolean(PIXEL_ID) && advertising;

  if (!caricaGa && !caricaPixel) return null;

  return (
    <>
      {caricaGa && (
        <>
          <Script
            id="ga4-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
// I segnali della modalità consenso li emette iubenda — nel widget la Consent
// Mode v2 è attiva — e stanno già nel dataLayer quando questo tag si inizializza.
// Questa riga è una rete di sicurezza, non una seconda gestione: viene eseguita
// solo dentro il ramo che richiede la finalità 4 già concessa, quindi non può
// concedere più di quanto l'utente abbia scelto. Se iubenda ha già aggiornato,
// ripete la stessa cosa; se per qualsiasi ragione non l'ha fatto, evita che
// Analytics parta in modalità senza cookie contando la metà delle visite.
// L'ordine conta: prima l'aggiornamento, poi il config.
gtag('consent','update',{ analytics_storage:'granted' });
// send_page_view a false: le navigazioni interne le conta PageViewTracker.
// Lasciandolo attivo si conterebbe due volte la prima pagina e nessuna delle
// successive.
gtag('config', ${JSON.stringify(GA_ID)}, { anonymize_ip: true, send_page_view: false });
            `}
          </Script>
        </>
      )}

      {caricaPixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(PIXEL_ID)});
fbq('track','PageView');
          `}
        </Script>
      )}

      <Suspense fallback={null}>
        <PageViewTracker
          ga={caricaGa ? GA_ID : undefined}
          pixel={caricaPixel ? PIXEL_ID : undefined}
        />
      </Suspense>
    </>
  );
}
