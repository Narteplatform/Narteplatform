import Script from "next/script";
import { ExternalLink } from "lucide-react";
import { iubendaDocUrl, type DocumentoIubenda } from "@/lib/legal/iubenda";

/**
 * Il documento iubenda aperto senza lasciare N'arte.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ NON IL TESTO DIRETTAMENTE DENTRO LA PAGINA.
 * Sarebbe la soluzione migliore, e iubenda la offre: un'API JSON che restituisce
 * il contenuto del documento, da rendere con la nostra tipografia e senza alcuno
 * script di terze parti. Richiede però il piano **Advanced** (19,99 €/mese
 * contro i 4,99 di Essentials): su Essentials risponde 403.
 *
 * Quello che TUTTI i piani consentono, incluso il gratuito, è
 * l'«incorporamento standard»: un collegamento che apre il documento in un
 * riquadro sovrapposto alla pagina. Non è il testo in linea, ma è meglio del
 * rimando a un altro sito — chi legge resta su N'arte, e torna indietro
 * chiudendo il riquadro invece che con il tasto del browser.
 *
 * Se un domani si passasse ad Advanced, il pezzo da cambiare è solo questo
 * componente: si legge il contenuto dall'API e si rende in `.blog-prose`, come
 * già si fa con le bozze locali.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * COOKIE. Il caricatore `iubenda.js` serve il documento e non traccia la
 * navigazione: non è lo script della gestione del consenso e non imposta cookie
 * di profilazione. La CSP lo ammette già, perché `cdn.iubenda.com` è fra i
 * domini consentiti in `script-src`.
 *
 * ACCESSIBILITÀ. `href` punta al documento vero. Se lo script non parte — rete
 * lenta, estensione che lo blocca — il collegamento continua a funzionare e
 * apre la pagina su iubenda: fallisce verso qualcosa che si può leggere, non
 * verso un pulsante morto.
 */
export function IubendaPolicyEmbed({
  doc,
  titolo,
}: {
  doc: DocumentoIubenda;
  titolo: string;
}) {
  const url = iubendaDocUrl(doc);
  if (!url) return null;

  return (
    <div className="mt-10 rounded-2xl border border-border bg-muted p-6">
      <p className="text-sm text-muted-foreground">
        Questo documento è generato e mantenuto aggiornato tramite{" "}
        <strong>iubenda</strong>: si adegua da sé ai cambiamenti della normativa
        e dei servizi che usiamo. È la versione che fa fede.
      </p>

      <a
        href={url}
        // Le classi sono l'interfaccia dello script di iubenda:
        //   iubenda-embed    → apre nel riquadro invece di cambiare pagina
        //   iubenda-noiframe → rende il contenuto senza incorniciarlo in un iframe
        //   iubenda-white    → variante chiara del riquadro
        // Vanno scritte così: lo script le cerca per nome.
        className="iubenda-white iubenda-noiframe iubenda-embed mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-display text-sm text-background transition-opacity hover:opacity-90"
        title={titolo}
      >
        Leggi {titolo.toLowerCase()}
        <ExternalLink className="size-4" aria-hidden />
      </a>

      <Script id="iubenda-loader" strategy="afterInteractive" src="https://cdn.iubenda.com/iubenda.js" />
    </div>
  );
}
