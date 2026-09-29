import Script from "next/script";
import { IUBENDA_WIDGET_SRC } from "@/lib/legal/iubenda";

/**
 * Gestione del consenso ai cookie — iubenda Privacy Controls and Cookie Solution.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * UN SOLO SCRIPT, E FA TRE COSE.
 *
 * Il widget che il pannello genera porta con sé:
 *   1. la configurazione del banner decisa nel pannello — consenso per finalità,
 *      pulsante di rifiuto, ritiro esplicito, elenco delle finalità;
 *   2. il **blocco preventivo** degli script di terze parti: intercetta le
 *      richieste verso i domini noti di Google Analytics e di Meta e le trattiene
 *      finché la finalità corrispondente non è concessa;
 *   3. la **modalità consenso di Google v2**, che emette da sé i segnali di
 *      consenso predefiniti e i successivi aggiornamenti.
 *
 * Per questo qui non c'è nient'altro. La prima versione di questo componente
 * scriveva a mano `_iub.csConfiguration` e i valori predefiniti di Consent Mode:
 * con il widget diventerebbero due sorgenti per le stesse impostazioni e due
 * gestori del consenso Google che si sovrascrivono a vicenda, con esiti che
 * dipendono dall'ordine di caricamento — funzionanti in prova, imprevedibili in
 * produzione.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * PERCHÉ `beforeInteractive`, E PERCHÉ NEL LAYOUT RADICE.
 * Il blocco preventivo funziona solo se questo script gira **prima** di
 * qualunque altro: deve poter sostituire i meccanismi con cui il browser
 * scarica le risorse, e se arriva dopo trova il lavoro già fatto. Inoltre Next
 * onora `beforeInteractive` soltanto in `app/layout.tsx`: altrove lo declassa
 * silenziosamente, e il blocco diventa una scommessa sui tempi.
 *
 * Dal layout radice deriva anche il fatto che il banner compaia **in tutte le
 * aree**, incluse dashboard e pannello: quello provvisorio stava nel solo layout
 * pubblico, e chi entrava direttamente in `/dashboard` non lo vedeva mai.
 *
 * SPENTO FINCHÉ NON SI CONFIGURA. Senza `NEXT_PUBLIC_IUBENDA_WIDGET_ID` non
 * viene emessa una riga. E siccome il tracciamento si accende solo leggendo il
 * consenso da questo script, senza widget nessuno script di terze parti può
 * partire: non per una regola scritta da qualche parte, ma perché manca il
 * meccanismo che li accende.
 */
export function IubendaCs() {
  if (!IUBENDA_WIDGET_SRC) return null;

  return (
    <Script
      id="iubenda-cs"
      strategy="beforeInteractive"
      src={IUBENDA_WIDGET_SRC}
    />
  );
}
