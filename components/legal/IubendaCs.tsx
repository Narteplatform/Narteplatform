import Script from "next/script";
import { CONSENT_EVENT } from "@/lib/legal/consent-client";
import { IUBENDA_COOKIE_POLICY_ID, IUBENDA_SITE_ID } from "@/lib/legal/iubenda";

/**
 * Gestione del consenso ai cookie — iubenda Cookie Solution.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SPENTO FINCHÉ NON SI CONFIGURA. Senza `NEXT_PUBLIC_IUBENDA_SITE_ID` questo
 * componente non emette una riga. E siccome il tracciamento si accende solo
 * attraverso le callback di iubenda, finché il banner non c'è nessuno script di
 * terze parti può partire: non per una regola scritta da qualche parte, ma
 * perché manca proprio il meccanismo che li accende.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * PERCHÉ STA NEL LAYOUT RADICE E NON IN QUELLO PUBBLICO
 *   1. `beforeInteractive` è onorato solo da `app/layout.tsx`. Altrove Next lo
 *      declassa, e il banner arriverebbe dopo l'idratazione — cioè dopo che gli
 *      script di terze parti potrebbero già essere partiti.
 *   2. Il banner deve comparire ovunque. Quello attuale sta solo nel layout
 *      pubblico: chi entra direttamente in `/dashboard` non lo vede mai.
 *   3. La misurazione serve anche nelle aree autenticate: il percorso più
 *      interessante da capire — iscrizione, profilo, richiesta di booking —
 *      attraversa tre gruppi di rotte diversi.
 *
 * PERCHÉ IL BLOCCO AUTOMATICO NON BASTA
 * L'autoblocking di iubenda riscrive gli `<script src>` di domini noti che
 * trova nel DOM. Con App Router gli script vengono iniettati da `next/script`
 * in momenti che dipendono dall'idratazione, e l'iframe del player video nasce
 * da un click: casi in cui il blocco automatico dipende dai tempi. Resta
 * montato come seconda rete, ma il meccanismo vero è che GA e il pixel non
 * vengono nemmeno scritti nella pagina finché la finalità non è concessa.
 */

const SITE_ID = IUBENDA_SITE_ID;
const COOKIE_POLICY_ID = IUBENDA_COOKIE_POLICY_ID;

export function IubendaCs() {
  if (!SITE_ID || !COOKIE_POLICY_ID) return null;

  return (
    <>
      {/*
        Ordine obbligato, e non è un dettaglio di stile:
        1) i valori predefiniti della modalità consenso di Google devono essere
           dichiarati PRIMA che qualunque tag Google esista, altrimenti il primo
           colpo parte senza restrizioni;
        2) il ponte deve esistere prima che iubenda chiami la callback;
        3) il blocco automatico prima della Cookie Solution che lo usa.
      */}
      <Script id="iub-consenso-config" strategy="beforeInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
// Tutto negato finché l'utente non dice altro. 'wait_for_update' dà mezzo
// secondo agli script di Google per ricevere l'aggiornamento prima di decidere.
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update: 500
});
gtag('set','ads_data_redaction', true);
gtag('set','url_passthrough', true);

function __narteApplicaConsenso(pref){
  var p = (pref && pref.purposes) || {};
  var stato = { ready: true, measurement: p[4] === true, advertising: p[5] === true };
  var prima = window.__narteConsent;
  window.__narteConsent = stato;
  window.dispatchEvent(new CustomEvent(${JSON.stringify(CONSENT_EVENT)}, { detail: stato }));

  // REVOCA. Smontare un tag non toglie dalla pagina le funzioni che ha già
  // definito, né i cookie che ha già scritto: l'unico modo onesto di dare
  // seguito a un ritiro è ricaricare. Succede solo dopo un gesto esplicito
  // dell'utente, quindi il ricaricamento è atteso e non sorprende nessuno.
  if (prima && ((prima.measurement && !stato.measurement) || (prima.advertising && !stato.advertising))) {
    window.location.reload();
  }
}

var _iub = window._iub = window._iub || [];
_iub.csConfiguration = {
  siteId: ${JSON.stringify(SITE_ID)},
  cookiePolicyId: ${JSON.stringify(COOKIE_POLICY_ID)},
  lang: "it",
  // Servono le finalità singole: la misurazione (4) e la pubblicità (5) sono
  // due scelte diverse, e vanno potute accettare separatamente.
  perPurposeConsent: true,
  askConsentAtCookiePolicyUpdate: true,
  // La modalità consenso di Google la governiamo qui sopra a mano. Lasciando
  // anche il template di iubenda ci sarebbero due gestori a sovrascriversi a
  // vicenda, con esiti che dipendono dall'ordine di caricamento — cioè
  // funzionanti in prova e imprevedibili in produzione.
  googleConsentMode: false,
  floatingPreferencesButtonDisplay: "bottom-left",
  banner: {
    position: "float-bottom-center",
    acceptButtonDisplay: true,
    customizeButtonDisplay: true,
    // Il rifiuto deve costare quanto l'accettazione: stesso livello, stessa
    // evidenza. È il punto su cui il Garante è stato più netto.
    rejectButtonDisplay: true,
    closeButtonRejects: true,
    explicitWithdrawal: true,
    listPurposes: true
  },
  callback: {
    onPreferenceExpressed: function(pref){ __narteApplicaConsenso(pref); },
    onPreferenceNotNeeded: function(){ __narteApplicaConsenso(null); }
  }
};
        `}
      </Script>

      <Script
        id="iub-autoblocking"
        strategy="beforeInteractive"
        src={`https://cs.iubenda.com/autoblocking/${SITE_ID}.js`}
      />
      <Script
        id="iub-cs"
        strategy="beforeInteractive"
        src="https://cdn.iubenda.com/cs/iubenda_cs.js"
        charSet="UTF-8"
      />
    </>
  );
}
