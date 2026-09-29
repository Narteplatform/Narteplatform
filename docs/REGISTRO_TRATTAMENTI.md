# N'arte — Registro delle attività di trattamento

> Articolo 30 GDPR. Versione 1.0 — 29 settembre 2026.
> Redatto sull'analisi del codice sorgente, dello schema del database e dei
> flussi applicativi. **Da validare dall'avvocato incaricato.**

---

## Perché esiste questo documento

Il piano Essentials di iubenda non genera il registro dei trattamenti: è una
funzione del piano Ultimate (79,99 €/mese contro i 4,99 di Essentials). Passare
a Ultimate per questo solo documento non ha senso — il registro non cambia al
variare della normativa, cambia quando cambia la piattaforma, e chi sa com'è
fatta la piattaforma siamo noi.

Va tenuto perché il trattamento è continuativo e sistematico: l'esonero per le
realtà sotto i 250 dipendenti previsto dall'art. 30 § 5 non si applica nei fatti.

**Va aggiornato** quando: si aggiunge un fornitore, si aggiunge una categoria di
dati, cambia una finalità, cambia un periodo di conservazione.

---

## 1. Titolare del trattamento

| Voce | Valore |
|---|---|
| Titolare | Eduardo Castronuovo — ditta individuale |
| Partita IVA | IT11071661216 |
| Sede | Via Domenico Fontana 27, 80128 Napoli (Italia) |
| Contatto per la privacy | narteweb@libero.it — *da sostituire* con una casella dedicata (es. `privacy@narteofficial.it`) quando la posta sul dominio sarà attiva: un indirizzo pubblicato e non presidiato è peggio di nessun indirizzo, perché fissa un canale per esercitare i diritti e poi non risponde, mentre il termine di un mese decorre comunque |
| Responsabile della protezione dei dati | Non nominato — *da confermare dall'avvocato: la piattaforma non svolge monitoraggio sistematico su larga scala ai sensi dell'art. 37* |

---

## 2. Le attività di trattamento

### T1 — Account e autenticazione

| Voce | Valore |
|---|---|
| Finalità | Creare e gestire l'account, autenticare l'accesso, assegnare il ruolo |
| Base giuridica | Esecuzione del contratto (art. 6.1.b) |
| Interessati | Utenti registrati, artisti, organizzatori, consulenti, staff |
| Dati | Email, password (cifrata dal fornitore, mai leggibile da noi), nome completo, immagine del profilo, ruolo |
| Dove | `auth.users`, `profiles` |
| Destinatari | Supabase (banca dati e autenticazione), Vercel (esecuzione) |
| Extra-UE | Sì — Supabase Inc. e Vercel Inc. sono statunitensi |
| Conservazione | Finché l'account resta attivo; *proposta:* chiusura dopo 24 mesi di inattività, con avviso preventivo |

### T2 — Registro dei consensi

| Voce | Valore |
|---|---|
| Finalità | Dimostrare che e quando l'interessato ha accettato i documenti |
| Base giuridica | Obbligo legale (art. 6.1.c) — l'art. 7 § 1 impone di poter dimostrare il consenso |
| Interessati | Tutti gli utenti registrati |
| Dati | Identificativo utente, tipo di consenso, versione del documento, esito, istante. **Nessun indirizzo IP, nessun user agent** |
| Dove | `user_consents`, `profiles.legal_version_accepted` |
| Destinatari | Supabase; iubenda (Consent Database, copia della prova) |
| Extra-UE | Supabase sì; iubenda no (Italia) |
| Conservazione | Per la durata dell'account e oltre, per il tempo in cui la prova può servire |
| Note | Il ritiro di un consenso non cancella la riga precedente: ne aggiunge una nuova. Cancellarla distruggerebbe la prova che fino a quel momento il trattamento era legittimo |

### T3 — Profilo pubblico dell'artista

| Voce | Valore |
|---|---|
| Finalità | Pubblicare la vetrina dell'artista e permettere agli organizzatori di trovarlo |
| Base giuridica | Esecuzione del contratto (art. 6.1.b) per l'artista; **consenso** (art. 6.1.a) per i terzi ritratti o nominati |
| Interessati | Artisti; **terzi**: componenti della formazione, persone in foto e video |
| Dati | Nome d'arte, biografia, città, generi, strumenti, fascia di prezzo, fotografie, tracce audio, video, collegamenti social, scaletta, requisiti tecnici, **nomi e ruoli dei componenti** |
| Dove | `artists` (incluso `personnel` jsonb), `artist_videos`, `media_assets` |
| Destinatari | Supabase, bunny.net (archiviazione e distribuzione), Vercel |
| Extra-UE | Supabase e Vercel sì; bunny.net ha sede in Slovenia (UE) ma distribuisce da nodi mondiali per i contenuti pubblici |
| Conservazione | Finché il profilo resta pubblicato; *proposta:* rimozione entro 30 giorni dalla chiusura dell'account, **file archiviati inclusi** |
| Rischio specifico | I dati dei componenti della formazione sono raccolti **indirettamente**, dall'artista e non dall'interessato: si applica l'art. 14. È coperto dalla dichiarazione che l'artista rende accettando i termini, e dall'informativa che lo descrive |

### T4 — Anagrafica di organizzatori e strutture

| Voce | Valore |
|---|---|
| Finalità | Permettere all'organizzatore di presentarsi e all'artista di sapere dove suonerebbe |
| Base giuridica | Esecuzione del contratto (art. 6.1.b) |
| Interessati | Organizzatori, anche persone fisiche |
| Dati | Nome, biografia, immagine, **telefono**, sito, social; per le strutture: **indirizzo**, città, CAP, capienza, telefono, email, fotografie |
| Dove | `organizers`, `venues` |
| Destinatari | Supabase, bunny.net, Vercel |
| Extra-UE | Come sopra |
| Conservazione | Durata dell'account |
| Note | Per un organizzatore privato l'indirizzo della «struttura» può essere il suo domicilio. La lettura pubblica di queste due tabelle è stata chiusa: sono raggiungibili solo da chi ha un rapporto in corso |

### T5 — Richieste di booking e trattativa in chat

| Voce | Valore |
|---|---|
| Finalità | Recapitare la richiesta, permettere la negoziazione, tenere traccia di quanto concordato |
| Base giuridica | Esecuzione del contratto (art. 6.1.b) fra ciascuna parte e N'arte, limitatamente al servizio di messa in contatto |
| Interessati | Artisti, organizzatori, utenti richiedenti |
| Dati | Data, fascia oraria, luogo, budget, messaggi di testo liberi, **allegati** (immagini, PDF, documenti), **note vocali registrate dal microfono**, offerte economiche, prezzo annotato |
| Dove | `booking_requests`, `conversations`, `messages`, bucket privato `chat-attachments` |
| Destinatari | Supabase; Brevo e Resend per le notifiche |
| Extra-UE | Supabase sì; Resend (USA) sì; Brevo no (Francia) |
| Conservazione | *Proposta:* 36 mesi dalla chiusura della richiesta — è il tempo in cui può servire come prova in una contestazione fra le parti. Allegati e note vocali per la stessa durata della conversazione |
| Rischio specifico | **Il team N'arte può leggere il contenuto integrale delle conversazioni.** Va circoscritto ai casi di assistenza, contestazione e verifica di una segnalazione, e ogni accesso andrebbe motivato e registrato. È l'elemento che più espone la piattaforma e il solo che apra la discussione sulla valutazione d'impatto |
| Nota tecnica | Gli allegati stanno in un bucket privato e si raggiungono solo con indirizzi firmati che scadono in un'ora |

### T6 — Candidature artista

| Voce | Valore |
|---|---|
| Finalità | Valutare chi chiede di entrare nel roster |
| Base giuridica | Esecuzione di misure precontrattuali (art. 6.1.b) |
| Interessati | Candidati, anche non registrati |
| Dati | Nome, email, nome d'arte, generi, strumenti, biografia, social, **video caricato**, versione dell'informativa accettata e istante |
| Dove | `artist_applications`, bucket privato `application-videos` |
| Destinatari | Supabase, Brevo, Resend |
| Extra-UE | Resend sì |
| Conservazione | *Proposta:* 12 mesi per le candidature non approvate, **video incluso** |

### T7 — Richieste dai moduli pubblici

| Voce | Valore |
|---|---|
| Finalità | Rispondere a chi ci scrive e gestire la relazione commerciale |
| Base giuridica | Consenso (art. 6.1.a), raccolto con casella obbligatoria |
| Interessati | Visitatori non registrati |
| Dati | Nome, email, telefono, oggetto, messaggio; per la richiesta evento anche tipo, data, luogo e budget; per la consulenza una **descrizione libera delle proprie necessità** |
| Dove | `contact_messages`, `leads`, `consultations` — ciascuna con `consent_version` e `consent_at` sulla stessa riga |
| Destinatari | Supabase, Brevo, Resend, iubenda (copia della prova) |
| Extra-UE | Resend sì |
| Conservazione | *Proposta:* 24 mesi per i contatti non convertiti e per le consulenze |
| Rischio specifico | Il campo «necessità» della consulenza è testo libero: una persona può scriverci spontaneamente informazioni che noi non chiediamo. Non va trattato come un campo qualunque |

### T8 — Recensioni post-evento

| Voce | Valore |
|---|---|
| Finalità | Permettere agli organizzatori di valutare l'artista e agli altri di leggere le valutazioni |
| Base giuridica | Legittimo interesse (art. 6.1.f) — trasparenza del mercato e affidabilità della vetrina |
| Interessati | Artisti (oggetto della recensione), organizzatori (autori) |
| Dati | Voto, testo, collegamento alla data confermata, identificativi delle due parti |
| Dove | `feedback` |
| Destinatari | Supabase |
| Conservazione | Finché il profilo resta pubblicato |
| Note | È un giudizio pubblico su una persona identificata. Deve restare agganciato a una data realmente confermata e passata, deve essere contestabile, e il team può nasconderlo se offensivo, falso o estraneo all'esperienza. Va dichiarato come sono verificate (Codice del consumo) |

### T9 — Statistiche di visita del profilo

| Voce | Valore |
|---|---|
| Finalità | Mostrare all'artista quante volte il suo profilo è stato aperto |
| Base giuridica | Legittimo interesse (art. 6.1.f) |
| Interessati | Visitatori del sito |
| Dati | **Nessun dato identificativo conservato.** L'indirizzo IP viene letto in memoria e trasformato in un codice irreversibile con un sale segreto e la data del giorno; **non viene mai salvato**. Il codice cambia ogni notte, quindi non permette di seguire nessuno nel tempo |
| Dove | `artist_profile_views` |
| Destinatari | Supabase |
| Conservazione | *Proposta:* 14 mesi |
| Note | Nessun cookie, nessun user agent, nessun referrer. Le visite del team sono scartate in scrittura. Se il sale non è configurato la raccolta si disattiva da sé |

### T10 — Abbonamenti degli artisti

| Voce | Valore |
|---|---|
| Finalità | Incassare l'abbonamento, applicare i limiti del piano, adempiere agli obblighi contabili |
| Base giuridica | Esecuzione del contratto (art. 6.1.b); obbligo legale (art. 6.1.c) per la parte fiscale |
| Interessati | Artisti abbonati |
| Dati | In piattaforma: identificativo cliente e abbonamento, piano, stato, periodi. **I dati della carta non transitano mai dai nostri sistemi**: li raccoglie Stripe sul proprio dominio |
| Dove | `billing_customers`, `subscriptions`, `stripe_webhook_events` |
| Destinatari | Stripe Payments Europe (Irlanda) / Stripe Inc. (USA) |
| Extra-UE | Sì |
| Conservazione | *Proposta:* 24 mesi per gli eventi tecnici; i documenti contabili secondo i termini fiscali |
| Nota | `stripe_webhook_events` conserva il messaggio integrale ricevuto da Stripe, che può contenere nome ed email. Va sottoposto a scadenza |

### T11 — Comunicazioni di servizio

| Voce | Valore |
|---|---|
| Finalità | Confermare, notificare, ricordare: circa 40 messaggi automatici legati a fatti della piattaforma |
| Base giuridica | Esecuzione del contratto (art. 6.1.b) — sono parte del servizio e non si disattivano separatamente |
| Interessati | Tutti |
| Dati | Indirizzo del destinatario, nome, e i dati del fatto che ha generato il messaggio |
| Dove | Brevo (principale), Resend (riserva); registro degli invii in `email_log` |
| Extra-UE | Resend sì |
| Conservazione | *Proposta:* 12 mesi per il registro degli invii |
| Nota | `email_log.to_addresses` conserva gli indirizzi in chiaro di chiunque abbia mai ricevuto una comunicazione, ed è consultabile dal pannello amministrativo. Va sottoposto a scadenza |

### T12 — Comunicazioni promozionali

| Voce | Valore |
|---|---|
| Finalità | Inviare novità su eventi e opportunità |
| Base giuridica | **Consenso specifico e revocabile** (art. 6.1.a), separato da quello obbligatorio |
| Interessati | Chi ha spuntato la casella facoltativa |
| Dati | Email, nome |
| Dove | `user_consents` con tipo `marketing` |
| Stato | **Il consenso è raccolto ma non ancora utilizzato**: non esiste alcuna newsletter. Prima del primo invio servono il collegamento di disiscrizione in ogni messaggio e l'interruttore di revoca nell'area personale |

### T13 — Sicurezza e limitazione degli abusi

| Voce | Valore |
|---|---|
| Finalità | Impedire che moduli e caricamenti vengano usati da automatismi |
| Base giuridica | Legittimo interesse (art. 6.1.f) e art. 32 |
| Interessati | Visitatori |
| Dati | Codice irreversibile ricavato dall'indirizzo IP e dall'email con un sale segreto, conteggio, finestra temporale. **Nessun IP in chiaro** |
| Dove | `rate_limits` |
| Conservazione | 7 giorni |
| ⚠️ Condizione | La pseudonimizzazione regge **solo se il sale è configurato**. Senza, il codice ripiega su un valore scritto nel sorgente e i codici diventano ricostruibili: in quel caso questa riga del registro non è vera |

### T14 — Statistiche di navigazione e pubblicità *(non ancora attivo)*

| Voce | Valore |
|---|---|
| Finalità | Misurare le visite; misurare le conversioni delle campagne e ri-proporre gli annunci |
| Base giuridica | **Consenso preventivo** (art. 6.1.a e art. 122 Codice privacy) |
| Interessati | Visitatori |
| Dati | Identificativi pubblicitari, pagine viste, eventi di conversione, pubblici di remarketing |
| Destinatari | Google (Analytics 4, senza funzioni pubblicitarie), Meta (pixel) |
| Extra-UE | Sì per entrambi |
| Stato | **Codice predisposto e spento.** Nessuno script parte finché non si valorizzano le variabili d'ambiente, e anche allora nessuno parte prima del consenso |
| Da fare prima di attivarlo | Accettare i termini per il trattamento dei dati su Google Analytics; accettare l'**addendum di contitolarità** su Meta Business Manager — sui dati del pixel Meta è contitolare, non responsabile |

### T15 — Riproduzione dei video

| Voce | Valore |
|---|---|
| Finalità | Trasmettere i video degli artisti |
| Base giuridica | **Consenso** per i cookie del riproduttore (art. 122 Codice privacy) |
| Interessati | Visitatori |
| Dati | Statistiche di visione raccolte dal riproduttore di terza parte |
| Destinatari | BunnyWay d.o.o. (Slovenia) |
| Stato | Il riproduttore non viene caricato finché non c'è il consenso, generale o per il singolo video |

---

## 3. Responsabili del trattamento e accordi

| Fornitore | Ruolo | Sede | Accordo da accettare | Dove |
|---|---|---|---|---|
| Supabase | Banca dati, autenticazione, archiviazione | USA (infrastruttura AWS) | Nomina a responsabile | Pannello Supabase |
| Vercel | Pubblicazione ed esecuzione | USA, elaborazione a Francoforte | Nomina a responsabile | Pannello Vercel |
| bunny.net (BunnyWay d.o.o.) | Archiviazione e distribuzione dei file, streaming | **Slovenia — UE** | Nomina a responsabile | Pannello bunny.net |
| Brevo (Sendinblue) | Email di servizio | **Francia — UE** | Nomina a responsabile | Pannello Brevo |
| Resend | Email di servizio, canale di riserva | USA | Nomina a responsabile | Pannello Resend |
| Stripe Payments Europe | Abbonamenti | **Irlanda — UE** | Nomina a responsabile | Pannello Stripe |
| iubenda | Documenti legali, gestione e archivio dei consensi | **Italia — UE** | Nomina a responsabile | Pannello iubenda |
| Google | Statistiche di navigazione | Irlanda / USA | Termini per il trattamento dei dati | Amministrazione della proprietà GA4 |
| Meta | Misurazione e remarketing — **contitolare** | Irlanda / USA | Addendum per la contitolarità | Impostazioni di Business Manager |
| Unsplash | Immagini remote | USA | — | *da valutare: sostituibile ospitando le immagini* |

**Da confermare dall'avvocato:** l'adeguatezza dei meccanismi di trasferimento
dichiarati da Supabase, Vercel, Resend, Google e Meta.

---

## 4. Misure di sicurezza (art. 32)

Presenti:

- Sicurezza a livello di riga su tutte le tabelle, con doppio strato: policy sulle
  righe **più** revoca dei privilegi verso i ruoli pubblici. La sola RLS non
  basta, ed è stata la lezione di un incidente reale.
- Bucket privati per allegati delle trattative, note vocali e video di
  candidatura; si raggiungono solo con indirizzi firmati che scadono in un'ora.
- Intestazioni di sicurezza: HSTS, protezione contro l'inclusione in iframe,
  politica di riferimento restrittiva, permessi del browser limitati.
- Nessuna chiave con privilegi elevati nel browser.
- Pseudonimizzazione degli indirizzi IP dove serve contarli, senza conservarli.
- Trappola anti-automatismo e limitazione della frequenza su tutti i moduli
  pubblici.
- Cifratura in transito e a riposo presso i fornitori.

Da completare:

- **Politica di sicurezza dei contenuti ancora in sola segnalazione**: rileva e
  non blocca. Va attivata dopo la verifica su tutte le aree.
- **Sale della pseudonimizzazione da configurare** in produzione (vedi T13).
- **Accesso del team alle conversazioni da circoscrivere e tracciare** (vedi T5).
- **Cancellazione dei dati alla scadenza**, che oggi non avviene per nessuna
  categoria.
- **Backup ripristinabili a piacere**: il piano gratuito di Supabase non li
  offre.

---

## 5. Valutazione d'impatto

**Proposta: non necessaria.** La piattaforma non tratta categorie particolari di
dati per finalità dichiarate, non prende decisioni automatizzate con effetti
giuridici, non svolge monitoraggio sistematico su larga scala di luoghi
accessibili al pubblico.

L'elemento da valutare è uno solo, e va sottoposto all'avvocato: **l'accesso del
team al contenuto integrale delle conversazioni private**. Circoscrivendolo ai
casi di assistenza e contestazione, richiedendo una motivazione e registrando
ogni accesso, diventa un potere documentato e limitato invece di una facoltà
generale — e la questione si chiude.

---

## 6. Diritti degli interessati

Tutti esercitabili dalla pagina **`/account/i-miei-dati`**, collegata dal piè di
pagina e dal centro assistenza.

| Diritto | Come si esercita |
|---|---|
| Accesso | Storico dei consensi in pagina + esportazione completa |
| Portabilità | Esportazione in JSON, in autonomia |
| Rettifica | Dal proprio profilo |
| Cancellazione | Richiesta in pagina → conferma via email → disattivazione immediata |
| Revoca del consenso | Interruttore per il marketing in pagina; banner per i cookie |
| Limitazione e opposizione | Pagina contatti |
| Reclamo | Garante per la protezione dei dati personali |

### Procedura di cancellazione — cosa fa il sistema e cosa resta a mano

**Automatico, alla conferma dell'interessato:** accesso bloccato; profili artista
riportati a `pending`, quindi fuori dal catalogo pubblico. Lo stato precedente è
registrato in `account_deletion_requests.restore_state`, così è reversibile.

**A mano, entro 30 giorni**, perché tocca cose che nessun cascade raggiunge:

1. `leads`, `contact_messages`, `artist_applications`, `consultations`,
   `email_log` — non sono legate a `auth.users` e sopravvivono alla cancellazione
   dell'utente: vanno cercate per indirizzo email.
2. I file su **bunny.net**: il cascade del database non li tocca. Vedi
   `scripts/bunny-orfani.mjs`.
3. I file su **Supabase Storage** nei bucket dell'artista.
4. Infine `auth.admin.deleteUser`, che porta via per cascade profilo, artisti,
   consensi e preferiti.

> ⛔ Ognuno di questi passaggi cancella dati di produzione. Vanno eseguiti dopo
> aver verificato che la richiesta sia confermata e non annullata, e dopo aver
> contato cosa si sta per rimuovere.

---

*Documento redatto sull'analisi del codice sorgente e dello schema del database
alla data del 29 settembre 2026. Non costituisce parere legale: è la base
istruttoria per il professionista incaricato, e va letto insieme a*
`docs/IUBENDA_INTEGRAZIONE.md` *e* `docs/COMPLIANCE_PIANO_IBRIDO.md`.
