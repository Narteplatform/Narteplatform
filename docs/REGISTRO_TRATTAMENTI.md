# N'arte — Registro delle attività di trattamento

> Articolo 30 GDPR. Versione 1.1 — 27 ottobre 2026 (la 1.0 era del 29 settembre 2026).
> Novità della 1.1: testo delle email nel registro (T11), segnalazioni Max ai privati
> registrati (T16), feed del calendario e notifiche in-app (T17), fornitori Google e Unsplash (§3).
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
| Contatto per la privacy | info@narteofficial.it — *da sostituire* con una casella dedicata (es. `privacy@narteofficial.it`) quando la posta sul dominio sarà attiva: un indirizzo pubblicato e non presidiato è peggio di nessun indirizzo, perché fissa un canale per esercitare i diritti e poi non risponde, mentre il termine di un mese decorre comunque |
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
| Dati | Identificativo utente, tipo di consenso, versione del documento, esito, istante. Con la migration 0070 anche ruolo, browser (user agent) e **impronta irreversibile dell'IP** con sale segreto (`CONSENT_IP_SALT`, ripiego `VISIT_HASH_SALT`); l'IP in chiaro non è salvato |
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
| Conservazione | *Proposta:* 12 mesi per il registro degli invii (regola `email_log` 365 giorni nel cron di conservazione, **oggi in sola conta** finché `RETENTION_ENFORCE` ≠ 1) |
| Nota | `email_log.to_addresses` conserva gli indirizzi in chiaro di chiunque abbia mai ricevuto una comunicazione, ed è consultabile dal pannello amministrativo. Va sottoposto a scadenza |

#### T11-bis — Testo delle email nel registro degli invii *(estensione di T11, dal 27/10/2026, migration 0075)*

| Voce | Valore |
|---|---|
| Finalità | Assistenza agli utenti («non mi è arrivata», «cosa diceva l'email»), verifica del contenuto delle comunicazioni dovute, prova di quanto comunicato |
| Base giuridica | *Proposta:* legittimo interesse (art. 6.1.f) — **da confermare dall'avvocato** insieme alla necessità di conservare il testo integrale |
| Interessati | Tutti i destinatari delle email della piattaforma |
| Dati | HTML completo dell'email inviata: nome, date, importi delle offerte, motivazioni delle decisioni del team, dati delle consulenze e degli abbonamenti. **Non** il testo dei messaggi di chat (le email della chat non lo riportano) |
| Esclusioni | Le email con link d'accesso **non si conservano** (`body_source = riservato`): approvazione artista/organizzatore con impostazione della password, recupero password, conferma della cancellazione, inviti. Negli altri link i token sono oscurati (es. link di disattivazione delle segnalazioni, feed iCal) |
| Dove | `email_log.body_html`, `email_log.body_source` (`salvato` / `provider` / `riservato`); lettura da `/admin/email/[id]` in un riquadro isolato |
| Chi vi accede | Tutti i superadmin (pagina «Ultimi invii»). *Da valutare:* limitarlo a chi ha la delega |
| Invii precedenti alla 0075 | Il testo non è salvato: si legge in sola lettura dal fornitore (Brevo o Resend) finché lo conserva (`lib/emails/recupera-corpo.ts`) |
| Destinatari | Supabase; Brevo e Resend per i propri registri |
| Extra-UE | Supabase e Resend sì |
| Conservazione | 365 giorni, come il resto del registro — **cancellazione automatica oggi spenta**: finché resta spenta il testo non scade |
| Stato | Codice online; la colonna esiste solo dopo l'applicazione della 0075 (senza, il testo non si salva) |
| Da fare | Correggere il doc. 09 del fascicolo (§5.1 dice che il testo non è registrato) e l'informativa |

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

### T16 — Segnalazioni del profilo degli artisti Max *(estesa ai privati il 27/10/2026)*

| Voce | Valore |
|---|---|
| Finalità | Promuovere il profilo di un artista Max inviandone il link a destinatari in linea (beneficio del piano, doc. 02 art. 9) |
| Base giuridica | Strutture e organizzatori professionali: legittimo interesse (da confermare). **Privati registrati** (organizzatori dichiarati privati, utenti con ruolo `user`): **da definire con l'avvocato** — comunicazione promozionale su un terzo a persone fisiche (art. 130 Codice privacy: consenso? legittimo interesse?) |
| Interessati | Destinatari (anche persone fisiche); l'artista segnalato |
| Dati | Nome ed email del destinatario, collegamento a struttura/organizzatore/profilo (`profile_id`, 0075), artista, data, nota del team |
| Dove | `profile_referrals`, `referral_optouts` (impronta dell'email di chi ha disattivato) |
| Destinatari | Supabase, Brevo/Resend |
| Opt-out | Link firmato (`REFERRAL_OPTOUT_SECRET`) in ogni email; controllato prima di ogni invio |
| Riservatezza | L'artista vede il conteggio mensile e il nome delle strutture, non quello dei privati; la 0075 toglie la policy che gli faceva leggere via API le email dei destinatari |
| Conservazione | *Da definire* |

### T17 — Feed del calendario personale e notifiche in-app

| Voce | Valore |
|---|---|
| Finalità | Portare le date confermate nel calendario dell'utente; avvisarlo nell'app di richieste, offerte e decisioni |
| Base giuridica | Esecuzione del contratto (art. 6.1.b) |
| Interessati | Artisti e organizzatori |
| Dati | Feed: token segreto e date confermate (luogo, controparte). Notifiche: titolo, testo breve, link, stato di lettura |
| Dove | `calendar_feeds` (0074), `notifications` (0073) |
| Destinatari | Supabase; Google/Apple/Microsoft solo se l'utente collega il feed al proprio calendario |
| Rischio | Il link del feed è l'unica protezione: chi lo conosce legge le date. Rigenerabile. Va spiegato all'utente |
| Conservazione | Feed: finché l'utente non lo rigenera o chiude l'account. Notifiche: *da definire* |

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
| Google — Analytics 4 | Statistiche di navigazione (**spento**) | Irlanda / USA | Termini per il trattamento dei dati | Amministrazione della proprietà GA4 |
| Google — accesso con Google | Registrazione e accesso tramite account Google (OAuth, `components/forms/OAuthButtons.tsx`) | Irlanda / USA | Su iniziativa dell'utente: da dichiarare nell'informativa | Console Google Cloud / Supabase Auth |
| Google — Calendar | Link «aggiungi al calendario» nelle email (`lib/emails/format.ts`); feed iCal personale se l'utente lo collega (`lib/calendar/feed.ts`) | Irlanda / USA | Su iniziativa dell'utente: da dichiarare nell'informativa | — |
| Google — Meet | Link della videochiamata delle consulenze, inviato per email | Irlanda / USA | *Da verificare* l'account usato dal team (Workspace con DPA o account personale) | — |
| Google — Gmail | Casella condivisa del team `narte.official.eventi@gmail.com`, destinatario aggiuntivo predefinito delle notifiche interne (nuove candidature, richieste dal sito…) con dati personali (`lib/emails/admin-recipients.ts`) | Irlanda / USA | **Da valutare**: un account Gmail gratuito non prevede un accordo sul trattamento dei dati come Google Workspace. Alternativa: casella sul dominio narteofficial.it | Impostazioni dell'account |
| Feed iCal personale | Non è un fornitore: link con token segreto (32 byte) che espone le date confermate a chi lo conosce | — | Unica protezione il token; rigenerabile | `calendar_feeds` (0074) |
| Meta | Misurazione e remarketing — **contitolare** (**spento**) | Irlanda / USA | Addendum per la contitolarità | Impostazioni di Business Manager |
| Unsplash | Immagini remote decorative (`lib/content/hero-images.ts`): il browser del visitatore contatta i server Unsplash (IP, user agent) | USA | — | *da valutare: sostituibile ospitando le immagini* |

**Da confermare dall'avvocato:** l'adeguatezza dei meccanismi di trasferimento
dichiarati da Supabase, Vercel, Resend, Google (accesso, Calendar, Meet, Gmail, Analytics), Meta e Unsplash.

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

**Completamento, entro 30 giorni dalla conferma:** si esegue con lo strumento
root in **`/admin/impostazioni/cancellazioni`** (codice:
`lib/legal/completa-cancellazione.ts`). Non c'è più una procedura a mano.

Come si usa: «Anteprima» (sola lettura) elenca cosa verrebbe rimosso o
anonimizzato e blocca l'esecuzione se anche una sola lettura fallisce; poi si
ridigita l'email dell'account, si spunta «Ho verificato l'anteprima» e, prima
dei 30 giorni dalla conferma, la seconda casella «su richiesta dell'interessato».
Il server ricalcola l'anteprima e cancella solo ciò che ha appena letto.

Sequenza, con arresto al primo errore (nessun rollback automatico, log
dettagliato; si può riprovare):

1. `user_consents`: le righe ricevono `subject_hash` = sha256 dell'email in minuscolo.
2. `organizers`: anonimizzati (nome «Utente cancellato», foto, bio, telefono, sito, Instagram a null). La riga resta.
3. File: bunny.net Storage (chiavi in `media_assets`, poi la riga), bunny.net Stream (video dei profili e delle candidature), Supabase Storage (`<userId>/` in `artist-images`, `artist-audio`, `artist-videos`, `venue-images`; video in `application-videos`). Vengono tolti prima delle righe che ne conservano il riferimento, così un errore si può riprovare.
4. `leads`, `contact_messages`, `artist_applications`, `consultations`: righe eliminate (per email e per utente). `content_reports`: nome, email e utente anonimizzati.
5. `artists` dell'utente: **anonimizzati**, non eliminati — nome «Artista cancellato», contenuti e dati personali svuotati, `status = rejected`, `user_id` a null; eliminate le righe `artist_videos` (i file sono già rimossi). La riga resta perché cancellarla farebbe cadere a cascata conversazioni, messaggi e date dell'organizzatore, che ha diritto a conservarli.
6. `account_deletion_requests.completed_at`: scritto **prima** dell'eliminazione dell'utente, perché la riga cade a cascata con l'utente. Se l'eliminazione fallisce il campo torna a null.
7. `auth.admin.deleteUser`: porta via profilo e preferiti.
8. `moderation_actions`: decisione «cancellazione_completata» (motivo, data di conferma, attore) e comunicazione finale all'interessato, non contestabile. È la traccia durevole dell'avvenuta cancellazione.

**Cosa si conserva, e perché:**

| Dato | Come resta | Motivo |
|---|---|---|
| `user_consents` | Senza `user_id`, con `subject_hash` | Prova dei consensi passati, senza identità in chiaro |
| `content_reports` | Anonimizzate (il testo della segnalazione resta) | Registro DSA |
| `moderation_actions` | Intatte, compresa l'email nella riga di cancellazione | Registro delle decisioni e prova dell'adempimento |
| Conversazioni e date dell'organizzatore | Restano alla controparte, con l'organizzatore anonimizzato e mittente null | Diritto della controparte a conservare i propri messaggi |
| Documenti contabili | Su Stripe, fuori dal database | Obblighi contabili e fiscali |

**Non coperto dallo strumento** (da verificare a mano, restano possibili):
`email_log`, file su bunny.net non registrati in `media_assets`, copertine
(`cover_image`) di strutture dell'organizzatore che puntano a file rimossi da
`venue-images`, backup.

> ⛔ Lo strumento cancella dati di produzione in modo irreversibile. Va usato
> solo dal superadmin root, su una richiesta confermata e non annullata, dopo
> aver letto l'anteprima.

---

*Documento redatto sull'analisi del codice sorgente e dello schema del database
alla data del 29 settembre 2026. Non costituisce parere legale: è la base
istruttoria per il professionista incaricato, e va letto insieme a*
`docs/IUBENDA_INTEGRAZIONE.md` *e* `docs/COMPLIANCE_PIANO_IBRIDO.md`.
