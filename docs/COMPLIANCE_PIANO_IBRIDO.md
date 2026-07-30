# N'arte — Piano di compliance ibrido: Iubenda + avvocato

> Documento per il cliente e per il legale incaricato.
> Versione: 1.0 — Data: 30 luglio 2026
> Redatto sulla base di un'analisi tecnica completa della piattaforma (codice, database, flussi, servizi terzi).

---

## 0. In due parole

N'arte oggi **non ha alcun documento legale online**: nessuna privacy policy, nessuna cookie policy, nessun termine e condizione, nessuna casella di consenso in nessuno dei moduli del sito. Va costruito tutto da zero.

La proposta è di **non affidare tutto all'avvocato**. La compliance di una piattaforma come questa si divide in due categorie molto diverse:

| | Cosa | Chi |
|---|---|---|
| **~75%** | Documenti standard, ripetitivi, che vanno **mantenuti aggiornati nel tempo** al variare della legge e dei fornitori: informativa privacy, cookie policy, banner cookie, raccolta e archiviazione delle prove di consenso, registro dei trattamenti | **Iubenda**, a canone annuo |
| **~25%** | Scelte che dipendono **da cosa fa davvero N'arte** e che nessun generatore può indovinare: la natura giuridica dell'attività, i contratti con artisti e organizzatori, la ripartizione delle responsabilità, i vincoli di settore | **Avvocato**, a incarico chiuso |

Il risparmio non nasce dal "far fare meno cose all'avvocato", ma dal **portargli il lavoro già istruito**. Tutta l'analisi della piattaforma (dati raccolti, moduli, fornitori, flussi, ruoli) è già stata fatta ed è allegata a questo documento nella §8. L'avvocato non deve indagare: deve decidere e scrivere.

**Ordine di grandezza indicativo** — Iubenda: canone annuo nell'ordine di 150–350 €/anno per l'intero pacchetto su un dominio (da verificare a listino al momento della sottoscrizione). Avvocato: incarico chiuso su 2 pareri brevi + 4 testi contrattuali, contro un pacchetto "full" che per un marketplace a due lati costerebbe sensibilmente di più. Le cifre esatte vanno concordate con il professionista.

---

## 1. Da cosa nascono gli obblighi: la piattaforma in sintesi

Questa sezione serve all'avvocato per capire in cinque minuti con cosa ha a che fare. È il risultato dell'analisi tecnica, non una descrizione commerciale.

### 1.1 Cosa fa la piattaforma

- **Vetrina pubblica**: profili di artisti (biografia, foto, gallery, tracce audio, video, social, fascia di prezzo, calendario delle disponibilità), eventi, format, blog.
- **Booking**: un organizzatore invia una richiesta a un artista, i due negoziano in una **chat interna** con offerte strutturate (data, fascia oraria, budget), l'artista accetta, la data si blocca in calendario e le parti confermano un **"prezzo definitivo pattuito in chat"** con doppia conferma.
- **Abbonamento a carico del solo artista** (Stripe): piano gratuito + Pro (9,99 €/mese o 49,99 €/anno) + Max (49,99 €/mese o 499,99 €/anno). Il piano determina **quanti contenuti l'artista può pubblicare** e quanta visibilità ha.
- **Recensioni post-evento** pubblicate sul profilo pubblico dell'artista (voto 1–5 + testo dell'organizzatore), che il team N'arte può nascondere.
- **Consulenze** prenotabili con consulenti del team.
- **Servizio "evento chiavi in mano"**: modulo in homepage in cui N'arte si offre di selezionare gli artisti e curare *"location, permessi e service"*.

### 1.2 I tre punti che cambiano la qualificazione giuridica

1. **Il denaro del cachet non passa mai dalla piattaforma.** Nessun escrow, nessuna commissione, nessuna fattura emessa dal sistema, nessun contratto generato automaticamente. L'unico incasso di N'arte è l'abbonamento dell'artista.
2. **Ma N'arte non è passiva.** Riceve copia di ogni richiesta, lavora i lead da un pannello interno con stati e tag, il team può **annullare un booking già confermato**, e il superadmin **può leggere il contenuto integrale di tutte le chat private** tra artisti e organizzatori.
3. **I testi pubblici si contraddicono.** Il centro assistenza dice *"niente intermediari nascosti, niente percentuali poco trasparenti"* e si distingue *"dalle agenzie tradizionali"*; il footer dichiara *"Booking professionale di live music dal 2018"*; la homepage promette *"ai nomi ci pensiamo noi"* con *"location, permessi e service"*. Sono tre posizionamenti giuridici diversi.

### 1.3 Dati personali trattati

| Categoria | Dove |
|---|---|
| Dati di contatto | nome, email, telefono di artisti, organizzatori, richiedenti booking, richiedenti consulenza, mittenti del modulo contatti |
| Dati di profilo pubblico | nome d'arte, città, biografia, foto, tracce audio, video, social, fascia di prezzo, calendario disponibilità |
| Dati di terzi raccolti indirettamente | **nomi e ruoli dei componenti della band**, inseriti dall'artista e pubblicati sul profilo pubblico; persone ritratte in foto e video |
| Indirizzi e domicili | indirizzo, CAP, telefono ed email delle strutture; per gli organizzatori privati **può essere un domicilio personale** |
| Contenuti di comunicazione | messaggi di chat, allegati (immagini, PDF, contratti), **note vocali registrate dal microfono** |
| Testi liberi non filtrati | campo "necessità" delle consulenze, messaggi, recensioni: possono contenere spontaneamente dati sensibili |
| Dati di pagamento | gestiti interamente da Stripe; in piattaforma resta solo l'ID cliente Stripe |
| Log | registro di tutte le email inviate, con indirizzi dei destinatari, senza scadenza |

**Non esistono categorie particolari di dati (art. 9) raccolte per finalità dichiarate.** Voce e volto nei video e nelle note vocali non sono trattati per identificazione biometrica, ma vanno descritti nell'informativa.

### 1.4 Fornitori esterni (responsabili del trattamento)

| Fornitore | Ruolo | Sede |
|---|---|---|
| Supabase | Database, autenticazione, storage, realtime | USA (infrastruttura AWS) |
| Vercel | Hosting e runtime | USA (sede) — elaborazione a Francoforte, UE |
| Brevo (Sendinblue SAS) | Email transazionali | Francia — UE |
| Resend | Email transazionali (canale di riserva, attivo) | USA |
| Stripe Payments Europe | Abbonamenti | Irlanda — UE |
| YouTube (Google Ireland) e Vimeo | Video incorporati nelle pagine evento e format | UE / USA |

**Non c'è alcun sistema di analytics, nessun pixel pubblicitario, nessun tag manager, nessun widget social.** I font sono serviti dal dominio proprio. È una condizione di partenza molto favorevole: gli unici cookie non tecnici dell'intero sito sono quelli di YouTube e Vimeo.

### 1.5 Newsletter e marketing

**Non esistono.** Tutte le 36 email della piattaforma sono transazionali (conferme, notifiche, promemoria). Non c'è alcuna lista contatti, nessuna campagna, nessun modulo di iscrizione a newsletter. Questo elimina un intero capitolo di adempimenti (consenso marketing, doppio opt-in, disiscrizione, profilazione).

> Se in futuro si vorrà fare newsletter o promozioni, servirà un consenso marketing separato e facoltativo: va previsto fin da ora nella struttura delle caselle di consenso, ma lasciato disattivato.

---

## 2. Il piano ibrido: chi fa cosa

| # | Adempimento | Iubenda | Avvocato | Sviluppo |
|---|---|---|---|---|
| 1 | Informativa privacy (art. 13–14 GDPR) | **Genera e mantiene** | Valida le clausole custom | Pubblica e collega |
| 2 | Cookie policy | **Genera e mantiene** | — | Pubblica |
| 3 | Banner cookie e blocco preventivo di YouTube/Vimeo | **Fornisce il banner** | — | Installa e sistema le anteprime video |
| 4 | Archiviazione delle prove di consenso dei moduli | **Fornisce il servizio** | Detta i testi delle caselle | Integra nei moduli |
| 5 | Registro dei trattamenti (art. 30) | **Genera** | Valida | — |
| 6 | Termini e condizioni — parte standard | **Genera** | — | Pubblica |
| 7 | **Termini e condizioni — clausole speciali del marketplace** | ✗ | **Scrive** | Inserisce come clausole custom |
| 8 | **Condizioni per gli artisti** (licenza contenuti, garanzia diritti, manleva) | ✗ | **Scrive** | Pubblica + casella di accettazione |
| 9 | **Condizioni di abbonamento** (recesso, rinnovo, downgrade) | Parziale | **Scrive** | Pubblica + checkout |
| 10 | **Policy contenuti e segnalazioni (DSA)** | ✗ | **Scrive** | Pubblica + modulo di segnalazione |
| 11 | **Policy recensioni** (trasparenza sull'autenticità) | ✗ | **Scrive** | Pubblica |
| 12 | **Parere sulla qualificazione dell'attività** | ✗ | **Rilascia** | — |
| 13 | **Parere sul perimetro normativo** (P2B, DSA, DPIA, DPO, età minima) | ✗ | **Rilascia** | — |
| 14 | Periodi di conservazione dei dati | Li dichiara | **Li stabilisce** | Implementa la cancellazione automatica |
| 15 | Accordi con i fornitori (DPA) | — | Verifica extra-UE | **Li accetta online** (moduli standard) |
| 16 | Diritti degli interessati (accesso, cancellazione, portabilità) | — | Definisce la procedura | **Costruisce le funzioni self-service** |
| 17 | Sicurezza dei dati (art. 32) | ✗ | — | **Interventi tecnici** |
| 18 | Dati societari nel footer | — | Fornisce la dicitura | Pubblica |
| 19 | Verifica dei claim pubblicitari | ✗ | **Valida** | Corregge i testi |

---

## 3. Parte A — Cosa copre Iubenda (e come va configurato)

### 3.1 Informativa privacy

Iubenda genera l'informativa componendola da un catalogo di clausole già redatte e **la aggiorna automaticamente** quando cambia la normativa. Per N'arte vanno dichiarati questi trattamenti:

- **Hosting e infrastruttura backend** → Vercel, Supabase
- **Registrazione e autenticazione** → account gestiti direttamente
- **Contatto con l'utente** → i moduli: contatti, candidatura artista, richiesta evento, interesse format, richiesta consulenza, richiesta booking
- **Gestione indirizzi e invio di messaggi email** → Brevo, Resend
- **Gestione dei pagamenti** → Stripe
- **Visualizzazione di contenuti da piattaforme esterne** → YouTube, Vimeo
- **Statistiche** → nessuna (non c'è analytics)

A queste vanno aggiunte **cinque clausole su misura**, che il catalogo standard non copre e che l'avvocato deve scrivere (vedi §4.3, punto C3):

1. La chat interna tra artisti e organizzatori e **l'accesso del team N'arte al suo contenuto**.
2. La pubblicazione sul profilo pubblico dei **nomi dei componenti della band** inseriti dall'artista (dati di terzi, raccolti indirettamente).
3. La **creazione automatica di un account** e il passaggio automatico da "utente" a "organizzatore" quando si invia una richiesta di booking.
4. Le **recensioni pubbliche** e il potere di moderazione.
5. Il **registro delle email inviate**.

### 3.2 Cookie policy e banner

Situazione reale del sito:

| Cosa | Tipo | Consenso |
|---|---|---|
| Cookie di sessione dell'autenticazione | Tecnico | Non richiesto |
| `narte_active_artist` — quale profilo artista è attivo, durata 365 giorni | Funzionale, prima parte | Non richiesto, **ma va dichiarato in policy** |
| Preferiti, stato della chat, sezioni aperte (memoria del browser) | Funzionali | Non richiesto, va dichiarato |
| **YouTube e Vimeo** nelle pagine evento e format | Terza parte, profilazione | **Richiesto e preventivo** |

Il banner Iubenda serve **solo** per i video incorporati. Tutto il resto del sito è tecnico.

> **Nota tecnica per lo sviluppo.** Le pagine evento e format caricano l'anteprima del video direttamente dai server di YouTube **al primo caricamento della pagina, prima di qualsiasi click**. Il blocco automatico di Iubenda agisce sugli iframe e sugli script: l'immagine di anteprima va comunque sistemata a parte, salvandola sul nostro storage o sostituendola con un segnaposto. È l'intervento più urgente della lista.

### 3.3 Archiviazione delle prove di consenso

Oggi **nessun modulo del sito ha una casella di consenso** e non esiste alcuna traccia di chi ha accettato cosa e quando. Iubenda offre un servizio che registra e conserva la prova di ogni consenso (data, ora, campi del modulo, versione dell'informativa mostrata).

Va attivato sui moduli: registrazione, candidatura artista, richiesta booking, contatti, interesse format, richiesta consulenza.

> Raccomandazione tecnica: registrare la prova **sia** su Iubenda **sia** nel nostro database (versione dei termini accettata, versione dell'informativa, data). Costa poco e ci rende indipendenti dal fornitore.

### 3.4 Termini e condizioni — la parte standard

Il generatore di Iubenda produce bene il corpo standard: uso del servizio, account, proprietà intellettuale, limitazioni di responsabilità generiche, legge applicabile, foro, link alla piattaforma europea di risoluzione delle controversie.

**Non produce** la parte che qualifica N'arte. La proposta è di usare Iubenda come **contenitore** e inserirvi come clausole personalizzate i testi scritti dall'avvocato. È esattamente qui che sta il risparmio: l'avvocato scrive quattro allegati mirati invece di un contratto da zero.

### 3.5 Registro dei trattamenti

Iubenda lo genera a partire dall'informativa già compilata. Va tenuto perché il trattamento di N'arte è continuativo e sistematico, quindi l'esonero per le realtà sotto i 250 dipendenti non si applica nei fatti.

### 3.6 Accordi con i fornitori (DPA) — **non serve l'avvocato**

Supabase, Vercel, Stripe, Brevo e Resend mettono a disposizione un accordo standard di nomina a responsabile che si accetta **online, dal pannello di ciascun servizio**. È un'operazione amministrativa da fare una volta, non una consulenza legale.

All'avvocato resta solo da confermare per iscritto che il meccanismo di trasferimento extra-UE dichiarato da Supabase, Vercel e Resend è adeguato (clausole contrattuali standard / Data Privacy Framework). Mezz'ora di lavoro, non una pratica.

---

## 4. Parte B — Cosa deve fare l'avvocato (e solo lui)

Sono **nove voci**, raggruppate in tre consegne. Nessuna di queste è producibile da un generatore, perché tutte dipendono da cosa N'arte fa realmente e da come vuole posizionarsi.

### 4.1 Consegna A — Due pareri scritti, brevi

#### A1. Qualificazione dell'attività *(prioritario: tutto il resto dipende da questo)*

Le domande, in ordine:

1. **N'arte è un marketplace/prestatore di servizi di hosting, o un intermediario/agenzia di booking?** L'analisi tecnica mostra elementi di entrambi: il denaro non passa dalla piattaforma (marketplace), ma il team gestisce i lead, può annullare booking confermati, media le controversie e vende un servizio di organizzazione eventi completo (agenzia).
2. **L'attività di mettere in contatto artisti e committenti richiede un'autorizzazione** ai sensi della disciplina italiana sull'intermediazione (d.lgs. 276/2003 e norme di settore sullo spettacolo)? È la domanda con l'impatto più alto sul modello di business e va sciolta prima di andare online.
3. **Chi risponde degli adempimenti dell'evento** — SIAE, agibilità INPS ex-ENPALS, sicurezza, autorizzazioni? La piattaforma deve poterlo dichiarare senza ambiguità.
4. Per il servizio **"evento chiavi in mano"** (in cui N'arte cura *"location, permessi e service"*): è un contratto diverso e va inquadrato a parte.

**Esito atteso:** una qualificazione scelta, con l'elenco delle frasi del sito da correggere per essere coerenti. Se i testi dicono una cosa e i contratti un'altra, l'artista può sostenere che esiste un mandato di fatto.

#### A2. Perimetro normativo applicabile

Domande a cui serve un sì/no motivato, ciascuno in poche righe:

| Domanda | Perché conta |
|---|---|
| Si applica il **Regolamento P2B (UE) 2019/1150** sui servizi di intermediazione online? | Se sì: obbligo di dichiarare **come vengono ordinati gli artisti nei risultati** e se il pagamento influisce sul posizionamento. N'arte ha piani a pagamento che danno visibilità, quindi il punto è concreto. Servono anche preavviso minimo per le modifiche ai termini, motivazione delle sospensioni, sistema interno di reclami. |
| Si applica il **DSA (Reg. UE 2022/2065)** e N'arte rientra nell'esenzione per le micro e piccole imprese? | Anche con l'esenzione restano obbligatori il punto di contatto, la trasparenza dei termini e la **procedura di segnalazione dei contenuti illeciti**. |
| Serve una **valutazione d'impatto (DPIA)**? | Il team legge le chat private tra utenti: è l'elemento che va valutato. Se non serve, va messo per iscritto. |
| Serve un **DPO**? | Quasi certamente no, ma va messo per iscritto. |
| **Età minima** per iscriversi e candidarsi come artista? | Gli artisti emergenti possono essere minorenni. Serve una regola (età minima, oppure consenso di chi esercita la responsabilità genitoriale) e va applicata nei moduli. |
| L'artista che si abbona è **consumatore o professionista**? | Determina il diritto di recesso di 14 giorni e gli obblighi informativi precontrattuali. Molti artisti emergenti non hanno partita IVA. |

### 4.2 Consegna B — Quattro testi contrattuali

#### B1. Termini e condizioni — clausole speciali *(da inserire in Iubenda)*

Deve contenere almeno:

- **Ruolo di N'arte** nel contratto di esibizione tra artista e organizzatore: se la piattaforma non è parte, va detto in modo esplicito, insieme all'esclusione di responsabilità per inadempimento, mancato pagamento del cachet, qualità della prestazione, annullamento.
- **Il "prezzo definitivo" concordato in chat**: che valore ha? La piattaforma lo registra con doppia conferma delle parti — è una prova, una proposta, o un contratto?
- **Poteri del team N'arte**: annullamento di un booking confermato, sospensione di un profilo, rimozione di contenuti, oscuramento di una recensione. Vanno tipizzati i casi e previsto un rimedio per l'utente.
- **Accesso del team al contenuto delle chat private**: base giuridica, limiti, informativa preventiva agli utenti.
- **Cancellazioni e no-show** tra artista e organizzatore: chi risponde e verso chi.
- **Modifiche ai termini**: preavviso e conseguenze (rilevante se si applica il P2B).

#### B2. Condizioni per gli artisti

È il documento oggi più mancante: un artista carica foto, tracce audio e video **senza dichiarare nulla e senza concedere nulla a N'arte**.

- **Licenza d'uso** dei contenuti caricati a favore di N'arte: cosa può farne (pubblicare, ridimensionare, usare in promozione, sui social, nelle newsletter future), per quanto tempo, cosa succede alla cessazione.
- **Garanzia di titolarità dei diritti**: brani propri o cover, diritti connessi sui master, diritti d'immagine delle persone ritratte in foto e video.
- **Consenso dei componenti della band**: l'artista inserisce nomi e ruoli di terze persone che finiscono sul profilo pubblico. Serve una dichiarazione che l'artista li abbia raccolti.
- **Manleva** a favore di N'arte per le contestazioni di terzi.
- **Cosa succede alla cessazione** dell'abbonamento e alla chiusura dell'account, coordinato con la promessa già pubblicata sul sito (*"i contenuti oltre i limiti del piano gratuito vengono nascosti, non cancellati"*).

#### B3. Condizioni di abbonamento

- Rinnovo automatico, prezzo, durata, disdetta.
- **Diritto di recesso di 14 giorni** per gli artisti consumatori e modalità di rinuncia in caso di attivazione immediata.
- Cosa accade **in caso di declassamento di piano**: la matrice dei limiti (foto, audio, video) è già implementata, va tradotta in clausola.
- Modifiche di prezzo e preavviso.
- Coerenza con quanto già promesso nelle FAQ pubbliche: *"nessuna esclusiva"*, *"il cachet lo decidi tu"*, *"N'arte non prende percentuali"*. Sono impegni contrattuali a tutti gli effetti e vanno recepiti, non contraddetti.

#### B4. Policy contenuti e segnalazioni + policy recensioni

- **Contenuti vietati** e conseguenze.
- **Procedura di segnalazione** di un contenuto illecito: chi la riceve, entro quanto si risponde, come si motiva la decisione, come si contesta. Serve anche un **indirizzo di contatto dedicato**.
- **Recensioni**: la normativa a tutela del consumatore impone di dichiarare **se e come si verifica che una recensione provenga da chi ha davvero usato il servizio**. Sulla piattaforma le recensioni sono legate a un booking confermato (elemento a favore) ma il team può nasconderle: i criteri vanno resi pubblici.

### 4.3 Consegna C — Tre allegati operativi

Sono brevi, ma senza questi lo sviluppo si ferma.

- **C1 — Tabella dei periodi di conservazione.** Per ciascun tipo di dato: quanto si conserva e perché. Riguarda: richieste di booking, lead, messaggi del modulo contatti, richieste di consulenza, chat e allegati, registro email, account inattivi, eventi di pagamento. Ci serve un numero, non un principio: dobbiamo programmare la cancellazione automatica.
- **C2 — Testi esatti delle caselle di consenso.** Per ogni modulo: il testo letterale della casella (breve), se è obbligatoria o facoltativa, e se va tenuta separata dalle altre.
- **C3 — Le cinque clausole personalizzate dell'informativa privacy** elencate in §3.1, pronte da incollare in Iubenda.

---

## 5. Come l'avvocato deve consegnarci i documenti

I testi non finiscono in un cassetto: vanno pubblicati sul sito, inseriti dentro Iubenda, mostrati dentro i moduli e versionati nel tempo. Un PDF impaginato non è utilizzabile per nessuna di queste operazioni. Chiediamo quindi:

### 5.1 Formato

- **Testo sorgente modificabile**: Markdown, Word o Google Doc. Il PDF firmato va benissimo **in aggiunta**, come copia di archivio, mai come unica consegna.
- **Struttura a titoli numerati** (1., 1.1, 1.2) e paragrafi numerati dove possibile: ci servono riferimenti stabili per collegare una clausola a un punto del sito.
- **Un file per documento.** Sei file distinti: informativa privacy (solo le clausole custom), termini e condizioni, condizioni artista, condizioni abbonamento, policy contenuti e segnalazioni, policy recensioni. Più i tre allegati C1–C3 e i due pareri A1–A2.
- **Nessun segnaposto residuo.** Tutti i campi tipo `[ragione sociale]`, `[P.IVA]`, `[sede]`, `[foro competente]`, `[indirizzo email]` vanno consegnati **già compilati**. Un solo segnaposto dimenticato che finisce online vale una segnalazione.

### 5.2 Versionamento

Ogni documento deve aprirsi con tre righe:

```
Documento: Condizioni per gli artisti
Versione: 1.0
In vigore dal: gg/mm/aaaa
```

Questo perché registriamo nel database **quale versione ha accettato ogni utente**. Agli aggiornamenti futuri chiediamo di alzare il numero di versione e di allegare un elenco delle modifiche, così sappiamo se serve una nuova accettazione o basta una notifica.

### 5.3 Indicazioni che devono accompagnare il testo

Per ciascun documento l'avvocato deve dirci:

| Informazione | Esempio |
|---|---|
| **Dove va pubblicato** | pagina propria del sito / clausola custom dentro Iubenda / allegato scaricabile |
| **Chi deve accettarlo** | tutti / solo artisti / solo organizzatori / solo chi si abbona |
| **Come si accetta** | casella da spuntare obbligatoria / accettazione implicita all'uso / doppia casella separata |
| **Se serve accettazione retroattiva** | sì — gli utenti già registrati non hanno mai accettato nulla: va deciso se bloccarli al prossimo accesso finché non accettano |
| **Quali frasi del sito vanno cambiate** | riferimento puntuale al testo attuale e al testo sostitutivo |

### 5.4 Un punto su cui insistere

Le clausole destinate a Iubenda devono essere **autoconsistenti**: blocchi di testo che si reggono da soli, senza rimandi del tipo "come previsto all'art. 4 che precede", perché finiscono dentro un documento generato che ha una sua numerazione. Va indicato per ognuna in quale sezione di Iubenda inserirla.

---

## 6. Cosa facciamo noi in piattaforma

Lavoro di sviluppo, indipendente dall'avvocato tranne dove indicato.

### 6.1 Interventi di sicurezza — prioritari e a costo zero

Non sono documenti: sono misure tecniche richieste dall'art. 32 GDPR. Nessuna informativa rende conforme un dato esposto.

1. **Rendere privati gli archivi degli allegati di chat e dei video di candidatura**, oggi leggibili da chiunque disponga dell'indirizzo del file. Riguarda documenti scambiati in chat, note vocali e video personali dei candidati.
2. **Chiudere il caricamento anonimo** dei video di candidatura, oggi possibile senza alcuna autenticazione.
3. **Restringere la lettura pubblica** dei recapiti di organizzatori, strutture e consulenti (telefono, email, indirizzo), oggi accessibili senza login.
4. **Limitare la frequenza di invio** dei moduli pubblici, oggi privi di qualsiasi protezione.

### 6.2 Pubblicazione dei documenti

5. Nuove pagine `/privacy`, `/cookie-policy`, `/termini`, `/condizioni-artista`, `/segnalazioni` e link nel footer, oggi privo di qualsiasi riferimento legale.
6. Dati societari completi nel footer (ragione sociale, sede, P.IVA, contatto istituzionale). Oggi c'è solo un numero di telefono e un indirizzo Gmail personale.

### 6.3 Consenso e tracciabilità

7. Casella di consenso e link all'informativa su **tutti** i moduli pubblici: contatti, candidatura artista, richiesta evento, interesse format, richiesta consulenza, richiesta booking, registrazione.
8. **Accettazione dei termini nel modulo di richiesta booking**, che oggi crea un account completo e promuove l'utente a organizzatore senza che questi accetti nulla. È il punto di maggiore esposizione.
9. Salvataggio in banca dati della versione dei documenti accettati e del momento dell'accettazione.
10. Se l'avvocato fissa un'età minima: controllo nei moduli di registrazione e candidatura.

### 6.4 Diritti degli interessati e conservazione

11. Pagina "I tuoi dati" con **esportazione** e **richiesta di cancellazione dell'account** in autonomia. Costa qualche giornata di lavoro e riduce drasticamente la gestione manuale delle richieste.
12. Cancellazione automatica dei dati oltre i termini stabiliti in C1, **inclusi i file caricati**, che oggi restano nello storage anche quando il record viene eliminato.

### 6.5 Cookie e video

13. Installazione del banner Iubenda con blocco preventivo.
14. Sistemazione delle anteprime video di YouTube (§3.2) e passaggio al dominio `youtube-nocookie`.

### 6.6 Testi da correggere

15. **Le testimonianze nella pagina di candidatura artista sono segnaposto inventati** ed è annotato nel codice stesso. Vanno sostituite con testimonianze reali e documentabili o rimosse: pubblicarle sarebbe una pratica commerciale scorretta.
16. Le statistiche pubbliche ("100+ artisti", "50+ eventi", "8+ anni") vanno sostanziate o riformulate.
17. La funzione "candidature a eventi N'arte", venduta nella pagina prezzi, **non è implementata**. O si costruisce o si toglie dal listino.
18. Allineamento dei testi pubblici alla qualificazione scelta dall'avvocato (§4.1).

---

## 7. Ordine di esecuzione

| Fase | Cosa | Chi | Blocca? |
|---|---|---|---|
| **1** | Interventi di sicurezza §6.1 | Sviluppo | No — si parte subito |
| **1** | Sottoscrizione Iubenda e configurazione informativa e cookie policy | Cliente + sviluppo | No |
| **1** | Accettazione dei DPA dai pannelli dei fornitori | Cliente | No |
| **2** | **Parere A1 sulla qualificazione** | Avvocato | **Sì — blocca tutto il resto** |
| **2** | Parere A2 sul perimetro normativo | Avvocato | Blocca l'età minima e le regole di ranking |
| **3** | Testi B1–B4 e allegati C1–C3 | Avvocato | Blocca la pubblicazione delle pagine |
| **3** | Banner cookie, caselle di consenso, pagine legali | Sviluppo | — |
| **4** | Funzioni di esportazione e cancellazione, cancellazione automatica | Sviluppo | Dipende da C1 |
| **4** | Correzione dei testi pubblici | Cliente + sviluppo | Dipende da A1 |
| **5** | Accettazione retroattiva per gli utenti già registrati | Sviluppo | Dipende da §5.3 |

**Il collo di bottiglia è il parere A1.** Va commissionato per primo, separatamente dal resto, perché determina il contenuto di tutti e quattro i testi contrattuali.

---

## 8. Allegato per l'avvocato — scheda tecnica

> Questa scheda esiste perché l'avvocato **non debba fare l'analisi della piattaforma**. È il documento che rende l'incarico chiuso e prevedibile invece che a ore.

### 8.1 Moduli che raccolgono dati personali

| Modulo | Campi raccolti | Chi lo compila | Consenso oggi |
|---|---|---|---|
| Contatti | nome, email, oggetto, messaggio | chiunque | assente |
| Candidatura artista | nome e cognome, email, nome d'arte, generi, strumenti, biografia, social, **video caricato** | chiunque | assente |
| Interesse format | nome, email, telefono, messaggio | chiunque | assente |
| Richiesta evento (home) | nome, email, telefono, tipo evento, data, luogo, budget, messaggio | chiunque | assente |
| Richiesta consulenza | nome, email, telefono, **descrizione libera delle necessità** | chiunque | assente |
| Richiesta booking da profilo artista | nome, email, telefono, data, fascia oraria, luogo, messaggio | chiunque | assente |
| Richiesta booking con registrazione | email, **password**, nome, telefono, nome e città della struttura, data, budget, messaggio → **crea un account** | chiunque | assente |
| Registrazione | nome completo, email, password | chiunque | assente |
| Profilo artista | nome d'arte, città, biografia, foto, gallery, audio, video, social, fascia di prezzo, **nomi dei componenti della band**, scaletta, requisiti tecnici | artista | — |
| Profilo organizzatore | nome, biografia, avatar, **telefono**, sito, social | organizzatore | — |
| Struttura | nome, tipo, **indirizzo**, città, **CAP**, capienza, foto, **telefono**, **email** | organizzatore | — |
| Chat | messaggi, allegati (immagini, PDF, documenti), **note vocali** | artista e organizzatore | — |
| Recensione post-evento | voto 1–5, testo → **pubblicato sul profilo dell'artista** | organizzatore | — |

### 8.2 Chi vede cosa

| Ruolo | Dati di altri utenti a cui accede |
|---|---|
| **Visitatore non registrato** | Profili artista pubblici (inclusa la fascia di prezzo e i nomi dei componenti), calendario delle disponibilità, nome e avatar dell'organizzatore per le date confermate. Inoltre, per una configurazione da correggere: recapiti di organizzatori, strutture e consulenti |
| **Artista** | Nome, email e telefono di chi gli invia una richiesta; profilo, telefono e recapiti dell'organizzatore; dati della struttura |
| **Organizzatore** | Profilo pubblico dell'artista. **Non vede mai l'email dell'artista** |
| **Consulente** | Nome, email, telefono e necessità dichiarate di chi prenota una consulenza |
| **Team N'arte (superadmin)** | Tutto: lead con recapiti, candidature con video, consulenze, **contenuto integrale di tutte le chat private**, registro delle email inviate, elenco completo degli utenti |

### 8.3 Fatti rilevanti per la redazione

1. Nessun flusso di denaro tra artista e organizzatore passa dalla piattaforma. L'unico incasso è l'abbonamento dell'artista.
2. Nessun contratto di scrittura artistica è generato dal sistema. Le parti si scambiano PDF in chat. Un "modello di contratto N'arte" è annunciato nel centro assistenza ma non esiste.
3. Il team può annullare un booking già confermato, con notifica automatica a entrambe le parti.
4. Il piano di abbonamento determina quanti contenuti l'artista pubblica e quanta visibilità ha: è un parametro di posizionamento legato al pagamento.
5. Le recensioni sono agganciate a un booking realmente confermato, ma possono essere nascoste dal team.
6. Non esiste attività di marketing diretto, né newsletter, né profilazione.
7. Non esiste alcuna traccia di consensi prestati: nessun utente attualmente registrato ha mai accettato termini o informative.

---

## 9. Riepilogo delle consegne attese dall'avvocato

| Codice | Documento | Formato | Priorità |
|---|---|---|---|
| **A1** | Parere sulla qualificazione dell'attività | Testo, 2–3 pagine | **Massima — blocca tutto** |
| **A2** | Parere sul perimetro normativo (P2B, DSA, DPIA, DPO, età minima, consumatore) | Testo, 2–3 pagine | Alta |
| **B1** | Termini e condizioni — clausole speciali | Testo, per Iubenda | Alta |
| **B2** | Condizioni per gli artisti | Testo, pagina propria | Alta |
| **B3** | Condizioni di abbonamento | Testo, pagina propria | Alta |
| **B4** | Policy contenuti e segnalazioni + policy recensioni | Testo, pagina propria | Media |
| **C1** | Tabella dei periodi di conservazione | Tabella | **Alta — blocca lo sviluppo** |
| **C2** | Testi delle caselle di consenso | Elenco | **Alta — blocca lo sviluppo** |
| **C3** | Cinque clausole custom per l'informativa privacy | Blocchi di testo | Alta |
| **D** | Dicitura per il footer + conferma DPA extra-UE | Poche righe | Media |

---

*Documento redatto sulla base dell'analisi del codice sorgente, dello schema del database, dei flussi applicativi e dei testi pubblici della piattaforma alla data del 30 luglio 2026. Non costituisce parere legale: è la base istruttoria per il professionista incaricato.*
