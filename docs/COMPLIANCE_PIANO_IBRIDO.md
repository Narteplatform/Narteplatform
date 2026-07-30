# N'arte — Piano di compliance ibrido: Iubenda + avvocato

> Documento per il cliente e per il legale incaricato.
> Versione: 2.0 — Data: 30 luglio 2026
> Redatto sulla base di un'analisi tecnica completa della piattaforma (codice, database, flussi, servizi terzi).

---

## 0. In due parole

N'arte oggi **non ha alcun documento legale online**: nessuna privacy policy, nessuna cookie policy, nessun termine e condizione, nessuna casella di consenso in nessuno dei moduli. Va costruito tutto da zero.

La proposta è di dividere il lavoro in tre, non in due:

| Quota | Cosa | Chi |
|---|---|---|
| **~60%** | Documenti standard che vanno soprattutto **mantenuti aggiornati** al variare della legge e dei fornitori: informativa privacy, cookie policy, banner, prove di consenso, registro dei trattamenti, corpo dei termini e condizioni | **Iubenda**, a canone annuo |
| **~25%** | **Prime stesure e materiale istruttorio**: tabella di conservazione, testi delle caselle, clausole descrittive, pagina sui criteri di posizionamento, interventi tecnici | **Noi**, incluso nello sviluppo |
| **~15%** | Ciò che nessun generatore può produrre e che ha valore solo se firmato: **un parere breve, tre blocchi di clausole, una revisione unica** | **Avvocato**, incarico chiuso |

> **Cosa è cambiato dalla versione 1.0.** La quota dell'avvocato scende da circa il 25% a circa il 15%. Non perché serva meno lavoro, ma per due ragioni concrete: il cliente ha già deciso il modello di business (§1.1), il che elimina il parere più costoso; e tutte le prime stesure passano a noi, con l'avvocato che le valida in un unico passaggio invece di scriverle.

**Ordine di grandezza indicativo** — Iubenda: 200–400 €/anno per il pacchetto completo su un dominio, ora che serve anche la gestione del consenso per i sistemi di tracciamento (da verificare a listino). Bunny: costo a consumo, tipicamente pochi euro al mese a questi volumi. Avvocato: incarico chiuso su tre consegne, contro un pacchetto completo che per un marketplace a due lati costerebbe molte volte tanto.

---

## 1. Il modello dichiarato e cosa cambia in questa versione

### 1.1 Il modello, come lo ha definito il cliente

Questa è la premessa da cui discende tutto il resto. Va scritta così, e i testi del sito vanno allineati a questa e a nessun'altra formulazione.

> **N'arte è una piattaforma di intermediazione tra artisti ed eventi.**
> **N'arte non gestisce il booking e non gestisce il pagamento dell'artista.**
> **Degli adempimenti dell'evento risponde l'organizzatore o il locale.**

Nella versione 1.0 questa era la domanda più costosa in capo all'avvocato: capire *cosa sia* N'arte, visto che il sito diceva tre cose diverse. Ora che il cliente ha deciso, all'avvocato resta una domanda molto più stretta — *il modello dichiarato regge, e serve un'autorizzazione?* — e soprattutto resta il compito di **scriverlo in una clausola che tenga**.

Attenzione a un punto: una clausola contrattuale ripartisce le responsabilità **tra le parti**, ma non vincola automaticamente SIAE, INPS o gli organi ispettivi. Per questo la clausola non basta da sola: deve essere accompagnata da una **garanzia esplicita dell'organizzatore** e da una manleva. È esattamente ciò che chiediamo all'avvocato al punto B1.

### 1.2 Le due novità tecniche

**Bunny per l'archiviazione di tutti i file.** Bunny Stream per i video, Bunny Storage e CDN per gli altri file, al posto dello storage Supabase.

Effetti sulla compliance, tutti positivi tranne uno:

- BunnyWay d.o.o. ha sede in **Slovenia, Unione Europea**: sostituisce un archivio ospitato su infrastruttura statunitense con uno europeo. Un trasferimento extra-UE in meno.
- La migrazione è **l'occasione per risolvere il problema più grave rilevato**: oggi tutti gli archivi sono pubblici, inclusi gli allegati delle chat, le note vocali e i video di candidatura. Bunny supporta l'autenticazione a token: va attivata sulle categorie private. Non è automatica, va configurata.
- ⚠️ **Il player di Bunny Stream imposta cookie propri e raccoglie statistiche di visione.** Entra quindi nella cookie policy e nel banner. Esiste un'alternativa: usare il flusso video diretto con un player servito dal nostro dominio, evitando l'iframe di terza parte. È una scelta tecnica da fare consapevolmente.
- La rete di distribuzione Bunny ha nodi in tutto il mondo: per i **file privati** va impostata una regione europea, per i contenuti pubblici la diffusione globale è nell'ordine delle cose e si dichiara.

**Sistemi di tracciamento: Google Analytics e pixel pubblicitari.** Questo è il cambiamento più significativo del documento.

- Cade il vantaggio dichiarato nella versione 1.0: il sito non è più privo di tracciamento, e **il banner cookie passa da accessorio a obbligatorio e centrale**.
- Da qui in poi vale una regola tecnica senza eccezioni: **nessuno script di tracciamento può partire prima del consenso**. Non è una questione di policy, è codice.
- Il pixel di Meta comporta una **contitolarità con Meta** sui dati raccolti: si gestisce accettando l'addendum di Meta dal pannello Business, non con una consulenza.
- Se si useranno funzioni pubblicitarie di Google, serve la **modalità consenso (Consent Mode v2)**: Iubenda la supporta nativamente, è configurazione.
- **La buona notizia:** analytics, remarketing e profilazione pubblicitaria sono esattamente il terreno per cui Iubenda esiste. Le clausole sono già scritte nel suo catalogo e si aggiornano da sole. **Questo non aggiunge una riga di lavoro per l'avvocato.**

---

## 2. Da cosa nascono gli obblighi

Questa sezione serve all'avvocato per capire in cinque minuti con cosa ha a che fare. È il risultato dell'analisi tecnica, non una descrizione commerciale.

### 2.1 Cosa fa la piattaforma

- **Vetrina pubblica**: profili artista con biografia, foto, gallery, tracce audio, video, social, fascia di prezzo, calendario delle disponibilità. Più eventi, format e blog.
- **Messa in contatto**: l'organizzatore invia una richiesta a un artista, le parti negoziano in una **chat interna** con offerte strutturate (data, fascia oraria, budget), l'artista accetta e la data si blocca in calendario. **Il contratto e il pagamento restano fuori dalla piattaforma.**
- **Abbonamento a carico del solo artista** (Stripe): gratuito, Pro 9,99 €/mese o 49,99 €/anno, Max 49,99 €/mese o 499,99 €/anno. Il piano determina quanti contenuti l'artista pubblica e quanta visibilità ottiene.
- **Recensioni post-evento** pubblicate sul profilo dell'artista, agganciate a un booking confermato, che il team può nascondere.
- **Consulenze** prenotabili con consulenti del team.
- **Servizio "evento chiavi in mano"**: modulo in homepage in cui N'arte si offre di selezionare gli artisti e curare *"location, permessi e service"*. **Questo servizio contraddice il modello dichiarato in §1.1** — vedi §6.

### 2.2 Dati personali trattati

| Categoria | Dove |
|---|---|
| Dati di contatto | nome, email, telefono di artisti, organizzatori, richiedenti booking, richiedenti consulenza, mittenti del modulo contatti |
| Profilo pubblico | nome d'arte, città, biografia, foto, tracce audio, video, social, fascia di prezzo, calendario disponibilità |
| **Dati di terzi raccolti indirettamente** | nomi e ruoli dei componenti della band, inseriti dall'artista e pubblicati sul profilo; persone ritratte in foto e video |
| Indirizzi e domicili | indirizzo, CAP, telefono ed email delle strutture; per gli organizzatori privati può trattarsi di un domicilio personale |
| Contenuti di comunicazione | messaggi di chat, allegati (immagini, PDF, contratti), note vocali registrate dal microfono |
| Testi liberi non filtrati | campo "necessità" delle consulenze, messaggi, recensioni: possono contenere spontaneamente dati sensibili |
| Dati di pagamento | gestiti interamente da Stripe; in piattaforma resta solo l'identificativo cliente |
| **Dati di navigazione e comportamento** *(nuovo)* | identificativi pubblicitari, pagine viste, eventi di conversione, pubblici di remarketing raccolti da Google Analytics e dal pixel |
| **Statistiche di visione video** *(nuovo)* | dati di riproduzione raccolti dal player Bunny Stream |
| Log | registro di tutte le email inviate, con indirizzi dei destinatari, oggi senza scadenza |

Non esistono categorie particolari di dati (art. 9 GDPR) raccolte per finalità dichiarate. Voce e volto nei video e nelle note vocali non sono trattati per identificazione biometrica, ma vanno descritti nell'informativa.

### 2.3 Fornitori esterni

| Fornitore | Ruolo | Sede | Consenso preventivo |
|---|---|---|---|
| Supabase | Database, autenticazione, realtime | USA — infrastruttura AWS | No, tecnico |
| Vercel | Hosting e runtime | USA — elaborazione a Francoforte, UE | No, tecnico |
| **Bunny (BunnyWay d.o.o.)** | Archiviazione e distribuzione di tutti i file, streaming video | **Slovenia — UE** | Sì per il player, no per i file |
| Brevo (Sendinblue) | Email transazionali | Francia — UE | No |
| Resend | Email transazionali, canale di riserva | USA | No |
| Stripe Payments Europe | Abbonamenti | Irlanda — UE | No |
| **Google Analytics** | Statistiche di navigazione | Irlanda / USA | **Sì** |
| **Pixel pubblicitario (Meta)** | Misurazione e remarketing — contitolarità | Irlanda / USA | **Sì** |
| YouTube e Vimeo | Video incorporati nelle pagine evento e format | UE / USA | **Sì** |

**Non esistono newsletter né campagne email.** Tutte le 36 email della piattaforma sono transazionali, non c'è alcuna lista contatti. Se in futuro si vorrà fare marketing via email servirà un consenso separato e facoltativo: l'architettura del consenso che stiamo costruendo lo prevede già, va solo attivata.

---

## 3. Il piano ibrido: chi fa cosa

| # | Adempimento | Iubenda | Avvocato | Noi |
|---|---|---|---|---|
| 1 | Informativa privacy (art. 13–14) | **Genera e mantiene** | Rivede una volta | Pubblica + bozza clausole descrittive |
| 2 | Cookie policy | **Genera e mantiene** | — | Pubblica |
| 3 | **Banner cookie con blocco preventivo di analytics e pixel** | **Fornisce** | — | Installa e verifica che nulla parta prima |
| 4 | Modalità consenso di Google (Consent Mode v2) | **Supporta** | — | Configura |
| 5 | Archiviazione delle prove di consenso | **Fornisce** | — | Integra nei moduli |
| 6 | Registro dei trattamenti (art. 30) | **Genera** | Rivede una volta | — |
| 7 | Termini e condizioni — corpo standard | **Genera** | — | Pubblica |
| 8 | **Condizioni di abbonamento** — rinnovo, recesso, declassamento | **Genera** | Rivede una volta | Descrive i limiti di piano |
| 9 | **Non-responsabilità e riparto degli adempimenti dell'evento** | ✗ | **Scrive** | Inserisce |
| 10 | **Licenza sui contenuti dell'artista e garanzia dei diritti** | ✗ | **Scrive** | Inserisce + accettazione |
| 11 | **Poteri della piattaforma e procedura di segnalazione** | ✗ | **Scrive** | Inserisce + modulo |
| 12 | **Parere breve su modello, autorizzazione e perimetro** | ✗ | **Rilascia** | Fornisce la scheda istruttoria |
| 13 | Periodi di conservazione | Li dichiara | Approva la nostra proposta | **Propone** e implementa |
| 14 | Testi delle caselle di consenso | Suggerisce | Approva | **Propone** |
| 15 | Trasparenza sui criteri di posizionamento degli artisti | ✗ | Conferma se serve | **Scrive la pagina** |
| 16 | Trasparenza sulle recensioni | ✗ | Approva | **Propone il testo** |
| 17 | Accordi con i fornitori (DPA, addendum Meta, termini Google) | — | Una riga di conferma | **Li accetta online** |
| 18 | Diritti degli interessati — accesso, cancellazione, portabilità | — | — | **Funzioni self-service** |
| 19 | Sicurezza dei dati (art. 32) e migrazione a Bunny | ✗ | — | **Interventi tecnici** |
| 20 | Dati societari nel footer | — | Fornisce la dicitura | Pubblica |
| 21 | Correzione dei claim pubblicitari | ✗ | — | **Cliente decide, noi correggiamo** |

---

## 4. Cosa copre Iubenda

### 4.1 Informativa privacy

Iubenda compone l'informativa da un catalogo di clausole già redatte e **la aggiorna automaticamente** al variare della normativa. Per N'arte vanno dichiarati:

- **Hosting e infrastruttura backend** — Vercel, Supabase, Bunny
- **Registrazione e autenticazione** — account gestiti direttamente
- **Contatto con l'utente** — i sette moduli pubblici elencati nella scheda §10
- **Gestione indirizzi e invio di messaggi email** — Brevo, Resend
- **Gestione dei pagamenti** — Stripe
- **Statistica** — Google Analytics
- **Remarketing e targeting comportamentale** — pixel pubblicitario
- **Visualizzazione di contenuti da piattaforme esterne** — YouTube, Vimeo, player Bunny Stream

Le voci su statistica, remarketing e profilazione sono **il pane quotidiano di Iubenda**: sono già scritte, aggiornate e tradotte. L'arrivo del tracciamento non aggiunge lavoro legale.

Restano **cinque descrizioni su misura** che il catalogo non copre. Nella versione 1.0 le avevamo messe in capo all'avvocato; **le scriviamo noi** — sono descrizioni di fatto, non clausole normative — e l'avvocato le legge nella revisione unica:

1. La chat interna e l'accesso del team N'arte al suo contenuto.
2. La pubblicazione dei nomi dei componenti della band: dati di terzi, raccolti indirettamente.
3. La creazione automatica di un account e il passaggio da "utente" a "organizzatore" quando si invia una richiesta.
4. Le recensioni pubbliche e il potere di moderazione.
5. Il registro delle email inviate.

### 4.2 Cookie policy e banner

Con l'arrivo di analytics e pixel il quadro cambia radicalmente.

| Cosa | Tipo | Consenso |
|---|---|---|
| Cookie di sessione dell'autenticazione | Tecnico | Non richiesto |
| Profilo artista attivo — durata 365 giorni | Funzionale, prima parte | Non richiesto, va dichiarato |
| Preferiti, stato chat, sezioni aperte | Funzionali, memoria del browser | Non richiesto, va dichiarato |
| **Google Analytics** | Statistico di terza parte | **Richiesto e preventivo** |
| **Pixel pubblicitario** | Profilazione | **Richiesto e preventivo** |
| **Player Bunny Stream** | Terza parte, statistiche di visione | **Richiesto e preventivo** |
| **YouTube e Vimeo** | Terza parte, profilazione | **Richiesto e preventivo** |

Il banner diventa quindi **l'elemento centrale della compliance del sito pubblico**, con consenso granulare per categoria, rifiuto altrettanto facile dell'accettazione, e ri-proposizione periodica.

> **Regola tecnica senza eccezioni.** Nessuno script di tracciamento deve essere caricato prima del consenso. Iubenda offre il blocco preventivo automatico, ma va **verificato caso per caso**, perché su Next.js gli script possono essere iniettati in modi che il blocco automatico non intercetta. Questo è un test da mettere nella lista di verifica, non un'assunzione.

> **Nota su un dettaglio già presente.** Le pagine evento e format caricano l'anteprima dei video direttamente dai server di YouTube al primo caricamento della pagina, prima di qualsiasi click. Il blocco automatico agisce su iframe e script: l'immagine di anteprima va sistemata a parte. Con la migrazione a Bunny questo si risolve da sé per i video caricati, ma resta per quelli linkati da YouTube.

### 4.3 Prove di consenso

Oggi **nessun modulo del sito ha una casella di consenso** e non esiste traccia di chi ha accettato cosa e quando. Iubenda registra e conserva la prova di ogni consenso: data, ora, campi del modulo, versione dell'informativa mostrata. Va attivata su registrazione, candidatura artista, richiesta booking, contatti, interesse format, richiesta consulenza — e sul banner cookie.

*Raccomandazione: registrare la prova sia su Iubenda sia nel nostro database. Costa poco e ci rende indipendenti dal fornitore.*

### 4.4 Termini e condizioni, incluse le condizioni di abbonamento

Il generatore produce l'intero corpo standard: uso del servizio, account, proprietà intellettuale, limitazioni generiche, legge applicabile, foro, risoluzione delle controversie. E — novità rispetto alla versione 1.0 — **produce anche le condizioni di abbonamento**: rinnovo automatico, durata, disdetta, diritto di recesso di 14 giorni per i consumatori, modifiche di prezzo.

Nella versione 1.0 avevamo messo le condizioni di abbonamento in capo all'avvocato. **Non serve.** L'unica parte specifica è la descrizione di cosa succede ai contenuti quando l'artista scende di piano, che è un fatto tecnico: la descriviamo noi partendo dalla matrice dei limiti già implementata, e l'avvocato la legge nella revisione unica.

Iubenda resta il **contenitore**: le tre clausole scritte dall'avvocato si inseriscono come testo personalizzato.

### 4.5 Registro dei trattamenti

Iubenda lo genera a partire dall'informativa. Va tenuto perché il trattamento è continuativo e sistematico, quindi l'esonero per le realtà sotto i 250 dipendenti non si applica nei fatti.

### 4.6 Accordi con i fornitori — nessuna consulenza necessaria

Sono tutte accettazioni online, da fare una volta:

| Fornitore | Cosa accettare | Dove |
|---|---|---|
| Supabase, Vercel, Stripe, Brevo, Resend, Bunny | Accordo di nomina a responsabile | Pannello di ciascun servizio |
| **Google Analytics** | Termini per il trattamento dei dati | Amministrazione della proprietà |
| **Meta** | Addendum per la contitolarità sui dati degli strumenti aziendali | Impostazioni di Business Manager |

All'avvocato resta **una riga di conferma** nel parere: che i meccanismi di trasferimento extra-UE dichiarati da Supabase, Vercel, Resend, Google e Meta sono adeguati.

---

## 5. Cosa deve fare l'avvocato — il minimo indispensabile

Tre consegne. Non nove come nella versione 1.0.

Il criterio con cui è stata tagliata la lista: **resta all'avvocato solo ciò che ha valore perché lo firma lui**, cioè un giudizio di sostenibilità o una clausola che deve reggere in giudizio. Tutto il resto — descrizioni di fatto, tabelle, testi di trasparenza — lo prepariamo noi e lui lo approva in un unico passaggio.

Va detto con chiarezza: **il lavoro non sparisce, cambia di mano**. Se qualcosa nella nostra bozza è sbagliato, l'avvocato lo corregge nella revisione. Il risparmio è sulle ore di stesura, non sulla responsabilità.

### Consegna A — Un parere breve, quattro conferme (1–2 pagine)

Non chiediamo più *"cos'è N'arte"*: il cliente ha deciso. Chiediamo se la decisione regge.

1. **Il modello dichiarato in §1.1 è sostenibile?** Piattaforma di intermediazione che non gestisce booking né pagamento, con gli adempimenti dell'evento (SIAE, agibilità INPS, sicurezza, autorizzazioni) a carico dell'organizzatore o del locale. **Serve un'autorizzazione** ai sensi della disciplina italiana sull'intermediazione, o il modello ricade fuori? È l'unica domanda con impatto sul modello di business e va sciolta prima di andare online.
2. **Si applica il Regolamento P2B (UE) 2019/1150?** Se sì, ci basta pubblicare i criteri con cui gli artisti vengono ordinati nei risultati e dichiarare che l'abbonamento influisce sulla visibilità: la pagina la scriviamo noi.
3. **Conferma che non servono né valutazione d'impatto né responsabile della protezione dei dati.** Una riga ciascuna. L'elemento da valutare è l'accesso del team alle chat private — vedi §6, dove proponiamo di ridurlo proprio per chiudere la questione.
4. **Conferma dell'adeguatezza dei trasferimenti extra-UE** per Supabase, Vercel, Resend, Google e Meta. Una riga.

### Consegna B — Tre blocchi di clausole, e basta

Vanno dentro i termini generati da Iubenda, come testo personalizzato.

**B1 · Non-responsabilità e riparto degli adempimenti dell'evento** — *è il cuore di tutto il pacchetto*

- N'arte **non è parte** del contratto di esibizione tra artista e organizzatore, non lo negozia, non lo conclude, non incassa e non versa il cachet.
- **Tutti gli adempimenti dell'evento sono a carico dell'organizzatore o del locale**: SIAE e diritti connessi, agibilità INPS, sicurezza, autorizzazioni e permessi, obblighi assicurativi.
- L'organizzatore lo **garantisce espressamente** al momento dell'uso della piattaforma e **manleva** N'arte da ogni pretesa di terzi, incluse le autorità.
- Esclusione di responsabilità per inadempimento, mancato pagamento del cachet, qualità della prestazione, annullamento, no-show.
- Che valore ha il **"prezzo definitivo" registrato in chat** con doppia conferma delle parti: va detto che è una semplice annotazione tra le parti e non un contratto concluso tramite la piattaforma. Vedi §6, dove proponiamo di rinominarlo.

**B2 · Contenuti dell'artista**

È oggi il vuoto più rilevante: un artista carica foto, tracce audio e video **senza dichiarare nulla e senza concedere nulla a N'arte**.

- **Licenza d'uso** a favore di N'arte: pubblicare, ridimensionare, usare in promozione e sui social; durata; cosa accade alla cessazione.
- **Garanzia di titolarità**: brani propri o cover, diritti connessi sui master, diritti d'immagine delle persone ritratte.
- **Consenso dei componenti della band**, i cui nomi finiscono sul profilo pubblico: dichiarazione che l'artista li ha raccolti.
- **Manleva** verso N'arte per le contestazioni di terzi.

**B3 · Poteri della piattaforma e segnalazioni**

- Casi tipizzati di sospensione di un profilo, rimozione di contenuti, oscuramento di una recensione, e rimedio per l'utente.
- **Procedura di segnalazione** di un contenuto illecito: chi la riceve, entro quanto si risponde, come si motiva, come si contesta. Serve un indirizzo dedicato.
- Accesso del team alle chat private: base giuridica e limiti, coerenti con la restrizione proposta in §6.

### Consegna C — Una revisione unica su quanto prepariamo noi

Un solo passaggio, con commenti, su un pacchetto che gli consegniamo già completo:

- la **tabella dei periodi di conservazione** (nostra proposta in §8.4);
- i **testi delle caselle di consenso** di ogni modulo;
- le **cinque descrizioni su misura** per l'informativa privacy (§4.1);
- la **pagina sui criteri di posizionamento** degli artisti, se il P2B si applica;
- il **testo di trasparenza sulle recensioni**;
- la **dicitura societaria del footer**.

---

## 6. Quattro modifiche al prodotto che riducono il lavoro dell'avvocato

Questo è il modo meno ovvio e più efficace di risparmiare: **ogni ambiguità che togliamo dal prodotto è una clausola che l'avvocato non deve scrivere.** Sono tutte decisioni del cliente, non del legale.

### 6.1 Allineare o scorporare il servizio "evento chiavi in mano"

Il modulo in homepage promette *"ai nomi ci pensiamo noi"* con *"location, permessi e service"*. Se N'arte cura location e permessi, **non può contemporaneamente sostenere che degli adempimenti dell'evento risponde l'organizzatore**: per quegli eventi ne risponde lei.

| Opzione | Conseguenza |
|---|---|
| **Riformulare i testi** perché il servizio resti la sola selezione di artisti | Nessun contratto aggiuntivo. **Consigliata.** |
| Mantenere il servizio come organizzazione eventi completa | Serve un contratto di servizio a parte, scritto dall'avvocato, e la clausola B1 va limitata agli altri eventi |

### 6.2 Riformulare il "prezzo definitivo pattuito in chat"

La piattaforma registra un prezzo finale con doppia conferma delle parti. È una funzione che tira verso l'idea che il contratto si concluda dentro N'arte, cioè verso il contrario del modello dichiarato.

**Proposta:** rinominarla in qualcosa come *"compenso concordato — promemoria"*, con una nota che chiarisce che serve solo a tenere traccia di quanto le parti si sono dette. Costa mezz'ora di lavoro e toglie all'avvocato la clausola più delicata da scrivere.

### 6.3 Limitare l'accesso del team alle chat private

Oggi il superadmin può leggere il contenuto integrale di tutte le conversazioni tra artisti e organizzatori, senza limiti e senza tracciamento. È l'elemento che più espone la piattaforma e l'unico che apre la discussione sulla valutazione d'impatto.

**Proposta:** limitare l'accesso ai casi di assistenza o contestazione, richiedere una motivazione e registrare ogni accesso. Diventa un potere documentato e circoscritto invece che una facoltà generale — molto più semplice da descrivere in informativa e molto meno da difendere.

### 6.4 Fissare l'età minima come regola di prodotto

Gli artisti emergenti possono essere minorenni. **Se il cliente decide "18+", la questione si chiude**: niente consenso genitoriale, niente verifica dell'età, niente regime speciale. Se si vuole accettare i minori, servono una procedura e una clausola in più.

È una decisione commerciale, non un parere legale. Va presa dal cliente e applicata nei moduli.

---

## 7. Come l'avvocato deve consegnarci i documenti

I testi non finiscono in un cassetto: vanno pubblicati sul sito, inseriti dentro Iubenda, mostrati nei moduli e versionati nel tempo. **Un PDF impaginato non è utilizzabile per nessuna di queste operazioni.**

### 7.1 Formato

- **Testo sorgente modificabile**: Markdown, Word o Google Doc. Il PDF firmato va benissimo *in aggiunta*, come copia di archivio, mai come unica consegna.
- **Struttura a titoli numerati** (1., 1.1, 1.2): servono riferimenti stabili per collegare una clausola a un punto del sito.
- **Un file per blocco.** B1, B2 e B3 in tre file distinti, più il parere A, più la revisione C come commenti sul nostro documento.
- **Nessun segnaposto residuo.** Campi come `[ragione sociale]`, `[P.IVA]`, `[foro competente]` vanno consegnati già compilati. Un solo segnaposto dimenticato che finisce online vale una segnalazione.

### 7.2 Versionamento

Ogni testo deve aprirsi con tre righe:

```
Documento:      Contenuti dell'artista — clausole B2
Versione:       1.0
In vigore dal:  gg/mm/aaaa
```

Registriamo nel database **quale versione ha accettato ogni utente**. Agli aggiornamenti futuri chiediamo di alzare il numero di versione e di allegare l'elenco delle modifiche, così sappiamo se serve una nuova accettazione o basta una notifica.

### 7.3 Indicazioni che devono accompagnare ogni blocco

| Informazione | Risposta attesa |
|---|---|
| **Dove va inserito** | clausola personalizzata dentro i termini Iubenda · pagina propria del sito · entrambi |
| **Chi deve accettarlo** | tutti · solo artisti · solo organizzatori · solo chi si abbona |
| **Come si accetta** | casella obbligatoria da spuntare · accettazione implicita all'uso · doppia casella separata |
| **Se serve accettazione retroattiva** | gli utenti già registrati non hanno mai accettato nulla: va deciso se bloccarli al prossimo accesso |
| **Quali frasi del sito vanno cambiate** | riferimento puntuale al testo attuale e al testo sostitutivo |

### 7.4 Un punto su cui insistere

Le clausole destinate a Iubenda devono essere **autoconsistenti**: blocchi che si reggono da soli, senza rimandi del tipo *"come previsto all'art. 4 che precede"*, perché finiscono dentro un documento generato con una sua numerazione. Va indicato per ognuna in quale sezione inserirla.

---

## 8. Cosa facciamo noi

### 8.1 Sicurezza e migrazione a Bunny — prioritario

Non sono documenti: sono misure tecniche richieste dall'art. 32 GDPR. Nessuna informativa rende conforme un dato esposto.

1. **Migrazione a Bunny con autenticazione a token attiva sulle categorie private**: allegati delle chat, note vocali, video di candidatura. Oggi sono leggibili da chiunque disponga dell'indirizzo del file.
2. **Cancellazione dei file dai vecchi archivi pubblici a migrazione conclusa.** Se restano lì, restano raggiungibili: la migrazione non risolve nulla finché il vecchio non viene svuotato.
3. **Regione europea** per gli archivi che contengono file privati.
4. **Chiudere il caricamento anonimo** dei video di candidatura, oggi possibile senza autenticazione.
5. **Restringere la lettura pubblica** dei recapiti di organizzatori, strutture e consulenti — telefono, email, indirizzo — oggi accessibili senza login.
6. **Limitare la frequenza di invio** dei moduli pubblici, oggi privi di protezione.
7. **Limitare e tracciare l'accesso del team alle chat** (§6.3).

### 8.2 Tracciamento e consenso

8. Installazione del banner con **blocco preventivo verificato script per script**: nessun tracciamento prima del consenso.
9. Configurazione della **modalità consenso di Google**, se si useranno funzioni pubblicitarie.
10. Scelta tecnica sul **player video**: iframe Bunny con relativi cookie, oppure flusso diretto con player servito dal nostro dominio.
11. Casella di consenso e link all'informativa su **tutti** i moduli pubblici.
12. **Accettazione dei termini nel modulo di richiesta booking**, che oggi crea un account completo e promuove l'utente a organizzatore senza che questi accetti nulla. È il punto di maggiore esposizione.
13. Salvataggio in banca dati della versione dei documenti accettati e del momento dell'accettazione.

### 8.3 Pubblicazione

14. Pagine `/privacy`, `/cookie-policy`, `/termini`, `/condizioni-artista`, `/segnalazioni`, `/criteri-di-posizionamento` e link nel footer, oggi privo di qualsiasi riferimento legale.
15. Dati societari completi nel footer: ragione sociale, sede, P.IVA, contatto istituzionale. Oggi c'è solo un numero di telefono e un indirizzo Gmail personale.
16. Pagina "I tuoi dati" con **esportazione** e **richiesta di cancellazione dell'account** in autonomia.

### 8.4 Tabella dei periodi di conservazione — nostra proposta

Questa è la bozza che consegniamo all'avvocato perché la approvi o la corregga, invece di chiedergli di costruirla. **Sono proposte, non decisioni.**

| Dato | Proposta | Motivo |
|---|---|---|
| Lead e messaggi di contatto non convertiti | 24 mesi | Gestione della relazione commerciale |
| Candidature artista non approvate, con video | 12 mesi | Riesame e statistica |
| Richieste di booking e chat collegate | 36 mesi dalla chiusura | Prova in caso di contestazione tra le parti |
| Allegati e note vocali delle chat | Stessa durata della conversazione | — |
| Richieste di consulenza | 24 mesi | — |
| Account inattivi | 24 mesi di inattività, con avviso prima della chiusura | Minimizzazione |
| Contenuti di artisti che cancellano l'account | Rimozione entro 30 giorni, **anche dai file archiviati** | Oggi i file restano dopo la cancellazione del record |
| Registro delle email inviate | 12 mesi | Diagnostica |
| Eventi di pagamento | 24 mesi; dati contabili secondo gli obblighi fiscali | — |
| Consensi cookie | 12 mesi, poi il banner si ripropone | Prassi del Garante |
| Log tecnici | 6–12 mesi | Sicurezza |

17. Cancellazione automatica secondo la tabella approvata, **inclusi i file archiviati**.

### 8.5 Testi da correggere — decisioni del cliente

18. **Le testimonianze nella pagina di candidatura artista sono segnaposto inventati**, ed è annotato nel codice stesso. Vanno sostituite con testimonianze reali e documentabili o rimosse: pubblicarle sarebbe una pratica commerciale scorretta.
19. Le statistiche pubbliche — "100+ artisti", "50+ eventi", "8+ anni" — vanno sostanziate o riformulate.
20. La funzione "candidature a eventi N'arte", venduta nella pagina prezzi, **non è implementata**. O si costruisce o si toglie dal listino.
21. Allineamento dei testi pubblici al modello di §1.1: help center, footer e homepage oggi dicono tre cose diverse.

---

## 9. Ordine di esecuzione

| Fase | Cosa | Chi | Dipende da |
|---|---|---|---|
| **1** | Interventi di sicurezza e migrazione a Bunny | Noi | — |
| **1** | Sottoscrizione Iubenda, informativa e cookie policy | Cliente + noi | — |
| **1** | Accettazione DPA, termini Google, addendum Meta | Cliente | — |
| **1** | **Decisioni di §6**: chiavi in mano, prezzo definitivo, accesso chat, età minima | **Cliente** | — |
| **2** | **Parere A** | Avvocato | Le decisioni di §6 |
| **2** | Banner cookie con blocco preventivo, prima dell'attivazione del tracciamento | Noi | — |
| **3** | Clausole B1, B2, B3 | Avvocato | Parere A |
| **3** | Pacchetto per la revisione C: retention, caselle, descrizioni, pagine | Noi | — |
| **4** | Revisione C | Avvocato | Pacchetto |
| **4** | Pubblicazione delle pagine, caselle nei moduli, versionamento | Noi | B + C |
| **5** | Esportazione dati, cancellazione account, cancellazione automatica | Noi | C approvata |
| **5** | Accettazione retroattiva per gli utenti già registrati | Noi | B pubblicata |

> **Due vincoli d'ordine.** Il **banner cookie deve esistere prima che analytics e pixel vengano attivati**: se il tracciamento parte prima, si raccolgono dati senza base giuridica dal primo giorno. E il **parere A va commissionato dopo le decisioni di §6**, non prima: se il cliente decide di scorporare il servizio "chiavi in mano", l'avvocato scrive un documento in meno.

---

## 10. Allegato — scheda tecnica per l'avvocato

> Esiste perché l'avvocato **non debba fare l'analisi della piattaforma**. È il documento che rende l'incarico chiuso e prevedibile invece che a ore.

### 10.1 Moduli che raccolgono dati personali

| Modulo | Campi raccolti | Chi lo compila | Consenso oggi |
|---|---|---|---|
| Contatti | nome, email, oggetto, messaggio | chiunque | assente |
| Candidatura artista | nome e cognome, email, nome d'arte, generi, strumenti, biografia, social, **video caricato** | chiunque | assente |
| Interesse format | nome, email, telefono, messaggio | chiunque | assente |
| Richiesta evento (home) | nome, email, telefono, tipo evento, data, luogo, budget, messaggio | chiunque | assente |
| Richiesta consulenza | nome, email, telefono, **descrizione libera delle necessità** | chiunque | assente |
| Richiesta booking da profilo | nome, email, telefono, data, fascia oraria, luogo, messaggio | chiunque | assente |
| Richiesta booking con registrazione | email, password, nome, telefono, nome e città della struttura, data, budget, messaggio → **crea un account** | chiunque | assente |
| Registrazione | nome completo, email, password | chiunque | assente |
| Profilo artista | nome d'arte, città, biografia, foto, gallery, audio, video, social, fascia di prezzo, **nomi dei componenti della band**, scaletta, requisiti tecnici | artista | — |
| Profilo organizzatore | nome, biografia, avatar, telefono, sito, social | organizzatore | — |
| Struttura | nome, tipo, **indirizzo**, città, CAP, capienza, foto, telefono, email | organizzatore | — |
| Chat | messaggi, allegati (immagini, PDF, documenti), **note vocali** | artista e organizzatore | — |
| Recensione post-evento | voto 1–5, testo → **pubblicato sul profilo dell'artista** | organizzatore | — |

### 10.2 Chi vede cosa

| Ruolo | Dati di altri utenti a cui accede |
|---|---|
| **Visitatore non registrato** | Profili artista pubblici, inclusa la fascia di prezzo e i nomi dei componenti; calendario delle disponibilità; nome e avatar dell'organizzatore per le date confermate. Inoltre, per una configurazione da correggere, i recapiti di organizzatori, strutture e consulenti |
| **Artista** | Nome, email e telefono di chi gli invia una richiesta; profilo, telefono e recapiti dell'organizzatore; dati della struttura |
| **Organizzatore** | Profilo pubblico dell'artista. Non vede mai l'email dell'artista |
| **Consulente** | Nome, email, telefono e necessità dichiarate di chi prenota una consulenza |
| **Team N'arte** | Tutto: lead con recapiti, candidature con video, consulenze, **contenuto integrale di tutte le chat private**, registro delle email inviate, elenco completo degli utenti |

### 10.3 Fatti rilevanti per la redazione

1. **Nessun flusso di denaro tra artista e organizzatore passa dalla piattaforma.** L'unico incasso è l'abbonamento dell'artista.
2. **Nessun contratto di esibizione è generato dal sistema.** Le parti si scambiano PDF in chat. Un "modello di contratto N'arte" è annunciato nel centro assistenza ma non esiste.
3. La piattaforma registra un **"prezzo definitivo"** con doppia conferma delle parti — funzione da riformulare, vedi §6.2.
4. Il team può **annullare un booking già confermato**, con notifica automatica a entrambe le parti.
5. Il **piano di abbonamento determina la visibilità** dell'artista: è un parametro di posizionamento legato al pagamento.
6. Le **recensioni** sono agganciate a un booking realmente confermato, ma possono essere nascoste dal team.
7. Non esistono newsletter né campagne email. **Dall'introduzione del pixel esiste però profilazione pubblicitaria**, che va coperta dal consenso.
8. **Nessun utente attualmente registrato ha mai accettato termini o informative.**

---

## 11. Riepilogo delle consegne attese dall'avvocato

| Codice | Documento | Formato | Priorità |
|---|---|---|---|
| **A** | Parere breve: sostenibilità del modello, autorizzazione, P2B, conferme su DPIA, DPO e trasferimenti extra-UE | Testo, 1–2 pagine | **Massima — blocca B** |
| **B1** | Non-responsabilità e riparto degli adempimenti dell'evento sull'organizzatore | Clausole, per Iubenda | Alta |
| **B2** | Contenuti dell'artista: licenza, garanzia dei diritti, manleva | Clausole, per Iubenda | Alta |
| **B3** | Poteri della piattaforma e procedura di segnalazione | Clausole, per Iubenda | Alta |
| **C** | Revisione unica del pacchetto che prepariamo noi: conservazione, caselle, descrizioni privacy, criteri di posizionamento, recensioni, dicitura del footer | Commenti sul nostro documento | Media |

**Cinque consegne invece di dieci.** Quattro documenti da scrivere e una revisione, contro i due pareri lunghi, i quattro contratti e i tre allegati della versione 1.0.

---

*Documento redatto sulla base dell'analisi del codice sorgente, dello schema del database, dei flussi applicativi e dei testi pubblici della piattaforma alla data del 30 luglio 2026, aggiornato con l'adozione di Bunny per l'archiviazione dei file, l'introduzione di sistemi di tracciamento e il modello di business definito dal cliente. Non costituisce parere legale: è la base istruttoria per il professionista incaricato.*
