/**
 * «Invita un artista» — testi per i documenti online (BOZZE).
 *
 * NON sono ancora inclusi in `TERMINI` e `INTEGRAZIONI_NARTE`
 * (lib/legal/content.ts). Aggiungere un programma ai Termini è una modifica
 * sostanziale: va annunciata con 15 giorni di preavviso (procedura in
 * lib/legal/avviso-modifiche.ts) e i testi vanno fatti rivedere all'avvocato
 * insieme all'art. 15-bis del doc. 02 (docs/legale/src/02-condizioni-abbonamento.html).
 *
 * PER PUBBLICARLI, il giorno dell'entrata in vigore:
 *   1. in TERMINI, interpolare `${TERMINI_INVITI}` subito dopo la sezione
 *      «Abbonamenti degli artisti»;
 *   2. in INTEGRAZIONI_NARTE, interpolare `${INFORMATIVA_INVITI}` prima di
 *      «Abbonamenti e pagamenti»;
 *   3. alzare LEGAL_VERSION (e LEGAL_CONSENT_VERSION solo se il legale ritiene
 *      che serva una nuova accettazione);
 *   4. solo allora accendere INVITI_ATTIVI=1.
 */
import { CREDITO_PREMIO_CENT, GIORNI_ATTESA, GIORNI_PREMIO, TETTO_ANNUO, formatEuro } from "@/lib/inviti/regole";

export const TERMINI_INVITI = `
<h2>Programma «Invita un artista»</h2>
<p>Ogni artista con un profilo approvato ha un link personale da condividere con
altri artisti. Se chi arriva dal tuo link invia la candidatura, viene ammesso e
paga un piano a pagamento, ricevi <strong>un mese di N'arte Pro</strong>:</p>
<ul>
<li>se non hai un abbonamento attivo, ${GIORNI_PREMIO} giorni di Pro, che si
sommano a quelli che hai già;</li>
<li>se hai un abbonamento attivo, ${formatEuro(CREDITO_PREMIO_CENT)} di credito,
scalati in automatico dalle fatture successive.</li>
</ul>
<p>Il premio è riconosciuto ${GIORNI_ATTESA} giorni dopo il primo pagamento
dell'artista invitato, se nel frattempo non ha esercitato il recesso e il
pagamento non è stato rimborsato. Si possono ottenere al massimo ${TETTO_ANNUO}
premi per anno solare. Vale solo per artisti nuovi su N'arte: non per sé stessi,
per un account già esistente o già invitato da altri. Il premio non si converte
in denaro e non si cede; se ti abboni mentre hai ancora giorni di Pro dagli
inviti, quelli non goduti diventano credito. In caso di abuso possiamo non
riconoscere un premio, motivandolo. Possiamo modificare o chiudere il programma
con il preavviso previsto per le modifiche a questi termini; i premi già
maturati restano validi.</p>
`;

export const INFORMATIVA_INVITI = `
<h3>Il programma «Invita un artista»</h3>
<p>Quando un artista condivide il proprio link d'invito, chi lo apre vede
<strong>solo il suo nome d'arte</strong>. Per 30 giorni un cookie tecnico
(<code>narte_invito</code>) ricorda il codice del link, per riconoscere l'invito se
invii la candidatura. L'artista che ti ha invitato vede il tuo nome d'arte e a
che punto è la tua iscrizione (candidatura inviata, ingresso su N'arte,
abbonamento), mai i tuoi contatti né i dati di pagamento; se la candidatura non
viene accolta, l'invito sparisce dalla sua pagina e si cancella insieme alla
candidatura. Inviti e premi si conservano finché esiste l'account di chi invita;
i crediti accreditati restano tra i dati contabili dell'abbonamento.</p>
`;
