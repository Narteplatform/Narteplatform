# N'arte — Risposta alla lista operativa (35 punti)

*Aggiornata al 01/10/2026 · fascicolo legale v0.97*

Ogni punto della lista ricevuta è riportato con il suo stato e il punto della piattaforma in cui si trova.

**Legenda degli stati:**
- **✅ Fatto**: già in funzione.
- **✅ Con 0069/0070**: il codice è pronto e si attiva quando sono applicate le migration 0069 e 0070 del database.
- **⏳ Esterno**: dipende da una decisione del legale o del commercialista, non dal codice.

Un principio vale per tutta la piattaforma, e i documenti lo dicono in modo coerente: **N'arte è solo promozionale**. Mette in contatto artisti e organizzatori, ma non partecipa a trattative né a contratti e non incassa compensi. L'unico pagamento che riceve è l'abbonamento dell'artista. Il piano Max *segnala* il profilo alle strutture: non candida l'artista e non tratta per lui.

## Bloccanti

| # | Punto | Stato | Come e dove |
|---|---|---|---|
| 1 | Registrazione organizzatore | ✅ Fatto | La richiesta di booking non crea più account già verificati: si passa da registrazione e verifica dell'email. Ci sono la dichiarazione dei 18 anni e la casella sulle Condizioni per gli organizzatori; ogni accettazione è salvata con versione, data e ora. |
| 2 | Doppia conferma del booking | ✅ Con 0069/0070 | Nuovo stato **«Accettata»**. Se l'artista accetta l'Offerta, la data resta «Accettata» finché l'organizzatore non la conferma; solo allora diventa **«Confermata»**. L'organizzatore riceve l'email «conferma la data». A ogni conferma compare l'avviso «L'accordo è solo fra voi, N'arte non è parte del contratto». |
| 3 | Badge «Verificato» | ✅ Fatto | Il badge ora si chiama **«Artista Pro»** e una spiegazione chiarisce che deriva dall'abbonamento, non da una verifica dell'identità o della qualità. |
| 4 | Checkout abbonamenti | ✅ Fatto | Il riepilogo indica piano, prezzo finale (regime forfettario, senza IVA), durata, rinnovo automatico e disdetta, con la scelta fra privato e P.IVA. Le caselle sono obbligatorie: Termini, richiesta di inizio immediato con le sue conseguenze e, per i professionisti, le clausole specifiche. Il pulsante dice «Abbonati con obbligo di pagamento». Dopo il pagamento parte un'email di conferma con piano, prezzo, date, condizioni, versione dei documenti e informazioni sul recesso. |
| 5 | Promemoria del rinnovo annuale | ✅ Fatto | Un controllo automatico giornaliero invia l'email **30 giorni prima** del rinnovo annuale, con data, importo e modalità per disdire. Parte una sola volta per periodo e non dipende dalle impostazioni di Stripe. |
| 6 | Cancellazione account e abbonamento | ✅ Fatto | Quando si cancella l'account, l'abbonamento Stripe viene disdetto in automatico e non si rinnova più. Il periodo già pagato resta fruibile, senza rimborso (diritto di recesso a parte). L'operazione finisce nel registro delle azioni. |
| 7 | Recesso | ✅ Con 0069/0070 | La pagina pubblica **/recesso** riporta le istruzioni e il modulo tipo. Dall'area abbonamento il recesso online fa cessare l'abbonamento, rimborsa la quota non goduta e invia la conferma. Ogni recesso è registrato con data, canale (online, email, PEC o modulo), importo ed esito del rimborso, ed è conservato 10 anni come prova. |
| 8 | Segnalazioni | ✅ Fatto (allegati con 0069/0070) | La pagina **/segnalazioni** raccoglie tipo, contenuto o URL, motivo, descrizione, dati del segnalante e **fino a 3 allegati** (immagini o PDF, conservati in un archivio privato). Ogni segnalazione riceve un riferimento S-…; nel registro risultano stato, responsabile assegnato, decisione, motivazione, data e comunicazioni inviate. |
| 9 | Reclami | ✅ Fatto | Ogni email di decisione contiene un link di reclamo, che genera un riferimento R-…. Il reclamo viene registrato, si indica chi lo esamina ed esce una decisione finale comunicata all'interessato. Se lo esamina la stessa persona che ha preso la decisione contestata, compare un avviso. |
| 10 | Motivazione obbligatoria | ✅ Fatto | Per i rifiuti di candidature, foto, copertine, audio, video e profili la motivazione è obbligatoria, strutturata in **«Regola: … — Fatti: …»**. Viene salvata e inviata all'artista insieme a come contestare. |
| 11 | Email della moderazione | ✅ Fatto | Partono email per: candidatura approvata o rifiutata, media approvato o rifiutato, profilo sospeso, riattivato o cancellato, recensione oscurata, booking annullato, esito della segnalazione ed esito del reclamo. Usano tutte lo stesso modello grafico. |
| 12 | Video esterni | ✅ Fatto | I video da link esterni non sono più pubblicabili: i video passano dal caricamento moderato. Se la coda di moderazione non è disponibile, il caricamento viene rifiutato e non pubblicato. |
| 13 | Pannello di moderazione | ✅ Con 0069/0070 | Dal pannello si può: sospendere un account, chiuderlo (blocco più cancellazione a 30 giorni), sospendere o riattivare un profilo, rimuovere un singolo media, un componente della formazione o un singolo messaggio o allegato in chat, oscurare recensioni, modificare o nascondere strutture e annullare booking. La motivazione è sempre obbligatoria e lo storico è in **/admin/registro**. Nessuna di queste operazioni richiede più di intervenire sul database. |
| 14 | Accesso del team alle chat | ✅ Fatto | L'elenco mostra solo metadati. Per aprire una conversazione servono la **delega «chat»** e una motivazione con categoria; l'accesso dura 2 ore, con un banner visibile. Ogni accesso registra amministratore, data, conversazione, motivo e azioni compiute. «Modalità sorveglianza» non esiste più. |
| 15 | Conservazione delle chat | ✅ Fatto (in conteggio) | Messaggi, allegati e note vocali si conservano per **36 mesi** dall'ultima attività. Le conversazioni con richieste aperte o date future sono escluse. La regola è attiva in **modalità conteggio**: le cancellazioni effettive partono quando il legale approva i periodi (vedi punto 25). |
| 16 | Strutture: dati privati | ✅ Fatto | Applicata la 0058 e verificato in sola lettura: indirizzo, telefono ed email delle strutture non sono leggibili dall'esterno. |
| 17 | Strutture private nei profili | ✅ Fatto | Le date nei luoghi privati compaiono come «Evento privato — città». Indirizzo e recapiti li vede solo la controparte. |
| 18 | Dati del catalogo | ✅ Con 0069/0070 | Al visitatore non registrato **non vengono più inviati** nome d'arte, città, foto né link ai profili: non basta più nasconderli graficamente. Anche il database espone ai non registrati solo genere, formazione e piano. |
| 19 | Metadati dei profili | ✅ Fatto | Per i non registrati e per i motori di ricerca, titolo e descrizione sono generici, senza immagine, e il profilo non è indicizzato. I profili sono fuori dalla sitemap. La home mostra una vetrina anonima con l'invito «Registrati gratis per scoprire chi sono». |

## Importanti

| # | Punto | Stato | Come e dove |
|---|---|---|---|
| 20 | Recensioni | ✅ Fatto | Si basano su una **data confermata sulla piattaforma**, non su «date reali svolte». Sono visibili sul profilo per Pro e Max, con media, numero e ordinamento. L'artista può rispondere. L'oscuramento è motivato e contestabile; la conservazione è regolata. |
| 21 | Recensioni e account chiusi | ✅ Fatto | Dalla disattivazione (non solo dalla cancellazione definitiva) l'autore compare come **«Organizzatore — account chiuso»**. |
| 22 | Candidature | ✅ Fatto | Email di approvazione e di rifiuto motivato. La candidatura è registrata. Dopo **12 mesi** le candidature non approvate e i loro video rientrano nella cancellazione automatica, in conteggio fino all'approvazione del legale. |
| 23 | Attivazione artista | ✅ Pronto, si accende con la v2 | La pagina /accetta-condizioni distingue il ruolo. All'artista chiede Termini, **Condizioni artisti con una casella separata**, privato o professionista e, per i professionisti, le clausole specifiche; all'organizzatore chiede Termini e Condizioni organizzatori. Si attiva insieme ai documenti v2, dopo l'approvazione del legale. |
| 24 | Versioni e prova delle accettazioni | ✅ Con 0069/0070 | Ogni accettazione salva utente, documento, versione, data e ora, tipo, **ruolo, browser e IP cifrato in modo irreversibile** (mai l'IP in chiaro). A ogni nuova versione si chiede di nuovo l'accettazione. |
| 25 | Conservazione e cancellazione | ✅ Fatto (in conteggio) · ⏳ Esterno | Le regole coprono candidature, chat, allegati, note vocali, recensioni, registri amministrativi (5 anni), statistiche, richieste di booking e account cancellati. Per ora **contano senza cancellare**: si attivano con un interruttore quando il legale approva i periodi. |
| 26 | Registro unico delle azioni del team | ✅ Fatto | La pagina **/admin/registro** riporta, per ogni azione, chi, cosa, su chi o cosa, quando, perché e il risultato, con filtri ed esportazione CSV. Si conserva 5 anni. |
| 27 | Posizionamento | ✅ Fatto | Nel catalogo compaiono «Ordine: prima Max, poi Pro…» e la pagina «Come funziona». Free, Pro, Max e omaggi sono distinguibili. |
| 28 | Piani omaggio | ✅ Fatto | Ogni omaggio registra chi lo riceve, il piano, l'inizio, la fine, il motivo e chi l'ha concesso. L'elenco degli omaggi attivi è in /admin/abbonamenti. |
| 29 | Dati fiscali | ✅ Fatto · ⏳ Esterno | Il pagamento passa da Stripe, viene collegato all'abbonamento e all'account e si esporta in CSV per il commercialista. Come emettere la fattura elettronica lo decide il commercialista: per ora il sistema resta il CSV. |
| 30 | Privacy e iubenda | ✅ Fatto | Sotto l'informativa iubenda ci sono le **integrazioni N'arte**: chat, accesso del team, componenti della band, account nati dal booking, recensioni, registro email, statistiche, moderazione, candidature, consulenze, strutture, abbonamenti, allegati delle segnalazioni, newsletter, prove di accettazione, conservazione ed esercizio dei diritti. |
| 31 | Consenso dei componenti della band | ✅ Fatto | Per aggiungere un componente serve la dichiarazione obbligatoria, salvata con la sua data per ciascun componente. |
| 32 | Diritti sui contenuti | ✅ Con 0069/0070 | Al primo caricamento di foto, audio o video l'artista dichiara di avere i diritti. La dichiarazione viene registrata e **verificata dal server**: senza, il caricamento è bloccato. Va rinnovata a ogni nuova versione dei documenti. |
| 33 | Moduli pubblici | ✅ Fatto | La casella è stata sostituita dalla frase informativa del fascicolo nei moduli di contatto, candidatura, segnalazione, consulenza e richiesta evento. |
| 34 | Email marketing | ✅ Fatto | Casella separata e non preselezionata, revocabile da «I miei dati», registrata con la versione. È **sincronizzata con la lista Brevo** in entrambe le direzioni: chi si disiscrive da un'email risulta revocato anche sulla piattaforma. |
| 35 | Comunicazioni centralizzate | ✅ Fatto | Tutte le email passano da un unico servizio: Brevo come canale principale, con riserva automatica. Ogni invio finisce nel **registro email**, così si può dimostrare quando una comunicazione è partita. |

## Cosa resta, e a chi tocca

**Sviluppo**
1. Applicare le migration **0069** e poi **0070** al database e verificarle.
2. Collaudo dei tre percorsi richiesti, con account di prova, e rapporto passo per passo. Gli account vengono rimossi alla fine. I percorsi sono:
   - visitatore → … → cancellazione;
   - segnalazione → … → chiusura;
   - accesso admin → chat → registro.

**Legale**
1. Revisione del fascicolo v0.97 e compilazione dei segnaposto: PEC, REA e dati del titolare.
2. Dopo l'approvazione, si pubblicano i documenti v2 e si chiede a tutti di accettarli di nuovo.
3. Approvazione dei periodi di conservazione, che accende le cancellazioni automatiche.

**Commercialista**
1. Modalità della fattura elettronica: per ora resta l'esportazione in CSV.

**Amministrazione**
1. Attivare la casella **info@narteofficial.it**, recapito unico indicato in tutti i documenti.
