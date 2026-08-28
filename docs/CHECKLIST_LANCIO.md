# N'arte — Checklist per il lancio

> Analisi del 28 agosto 2026. Ogni voce è stata verificata nel codice o con una
> lettura in sola lettura del database di produzione. Nessun dato è stato
> modificato durante l'analisi.

## Come leggere la checklist

**Chi la esegue:**

| Sigla | Significato |
|---|---|
| **A** | Lo fa Claude Code in autonomia. Serve solo il tuo via libera. |
| **B** | Lo fate voi a mano: contenuti, foto, account esterni, dashboard, avvocato. |
| **C** | Serve prima una decisione tua/del team. Finché non è presa, non si parte. |

**Priorità:**

| Simbolo | Significato |
|---|---|
| 🔴 | Blocca il lancio. Il sito non può andare online al pubblico così. |
| 🟡 | Importante. Si può lanciare, ma va chiuso entro poche settimane. |
| 🟢 | Miglioria. Quando c'è tempo. |

---

## Riepilogo: quanto manca

| Area | Stato | Voci 🔴 |
|---|---|---|
| **Archivio contenuti su bunny.net** | **Confermato, da sviluppare** | **1** |
| Contenuti pubblici (format, blog, aiuto, eventi, artisti) | Impianto pronto, contenuti mancanti | 6 |
| Email | Costruite bene, **mai realmente consegnate** | 5 |
| Legale / GDPR | Assente | 6 |
| Sicurezza | Lacune note | 3 |
| Abbonamenti Stripe | Codice pronto, mai usato in produzione | 2 |
| Recensioni | A metà | 1 |
| Mobile | Migliore del previsto, da collaudare | 1 |
| SEO / performance | Fondamenta mancanti | 3 |
| Infrastruttura / operatività | Rischi da piano Free | 2 |

La piattaforma è **funzionalmente molto più avanti** di quanto suggerisca la
lista: booking, chat, offerte, calendari, consulenze, abbonamenti, pannello
admin e aree per cinque ruoli sono costruiti e coerenti. Quello che manca è
quasi tutto nella stessa famiglia: **contenuti reali, configurazione dei
servizi esterni e adempimenti legali**. Sono le tre cose che non si possono
scrivere in codice al posto tuo.

---

## 0. Archivio dei contenuti su bunny.net 🔴

**Scelta confermata.** Oggi video, foto e audio vivono su Supabase Storage, con un
tetto di **50 MB per video** che rende inutilizzabile la funzione più importante
del profilo artista: un video di un concerto ne pesa 250. L'architettura di
destinazione è già progettata in [`VIDEO_ARCHITETTURA_BUNNY.md`](./VIDEO_ARCHITETTURA_BUNNY.md).

Va fatto **per primo**: ogni altro lavoro sui contenuti dipende da dove finiscono
i file.

- [ ] 🔴 **B** — Creare account bunny.net, Video Library (Stream) e Storage Zone, e passare le credenziali
- [ ] 🔴 **A** — Modulo `lib/bunny/`, variabili d'ambiente, migration per id e stato di elaborazione
- [ ] 🔴 **A** — Caricamento video diretto dal browser a Bunny, ripristinabile se cade la linea, limite a **500 MB**
- [ ] 🔴 **A** — Accettare i video girati da iPhone senza conversione manuale (oggi i `.mov` vengono rifiutati)
- [ ] 🔴 **A** — Stato "in elaborazione" in dashboard + webhook di Bunny a conversione finita
- [ ] 🔴 **A** — Riproduttore a qualità adattiva e anteprima automatica sul profilo pubblico
- [ ] 🔴 **A** — Spostare gallery, copertine, avatar e tracce audio su Bunny Storage, con immagini già ridimensionate
- [ ] 🔴 **A** — Adeguare tutti i punti di caricamento esistenti (`GalleryUpload`, `ImageUpload`, `AudioUpload`, `VideoUpload`, `ApplicationVideoUpload`, `EventVideoUpload`)
- [ ] 🟡 **A** — Script di trasferimento dei contenuti già caricati, **con verifica prima di rimuovere qualsiasi originale**
- [ ] 🟡 **A** — Mantenere l'applicazione dei limiti di piano sul nuovo percorso e cancellare su Bunny quando si elimina un contenuto

> Effetto collaterale positivo: senza i file pesanti dentro, **Supabase può restare
> sul piano gratuito** e continuare a occuparsi solo di database e accessi. Il che
> ridimensiona il punto 9.

---

## 1. Contenuti del sito pubblico

### 1.1 Pagine dei format 🔴

I 4 format pubblicati hanno una descrizione da **65-74 caratteri** e nient'altro:
nessuna copertina, nessuna galleria, nessun video, nessun testo SEO.

| Format | Descrizione | Cover | Gallery | Video | SEO |
|---|---|---|---|---|---|
| NaJam | 65 caratteri | ✗ | 0 | 0 | ✗ |
| NuLive | 64 caratteri | ✗ | 0 | 0 | ✗ |
| NaBand | 70 caratteri | ✗ | 0 | 0 | ✗ |
| NaCena | 74 caratteri | ✗ | 0 | 0 | ✗ |

La buona notizia: [format/[slug]/page.tsx](app/(public)/format/[slug]/page.tsx)
è **già pronta** a mostrare copertina, galleria con lightbox, video, testi SEO e
form di interesse. Il codice non è il collo di bottiglia: mancano i contenuti.

- [ ] 🔴 **B** — Scrivere la descrizione lunga di ciascuno dei 4 format (indicativamente 1500-2500 caratteri): cos'è, per quale tipo di locale, quanto dura, cosa serve tecnicamente, cosa include il prezzo
- [ ] 🔴 **B** — Caricare una copertina per ciascun format
- [ ] 🔴 **B** — Caricare 6-10 foto di galleria per format (da eventi già fatti)
- [ ] 🟡 **B** — Caricare 1-2 video per format
- [ ] 🟡 **B** — Scrivere titolo e descrizione SEO per ciascun format
- [ ] 🟡 **C** — Decidere quali sezioni aggiuntive deve avere la pagina di un format: fascia di prezzo indicativa, durata, numero di artisti, "eventi passati con questo format", artisti tipici, FAQ, scheda tecnica scaricabile. *Serve la tua decisione perché cambia il modello dati.*
- [ ] 🟡 **A** — Una volta decise le sezioni: estendere tabella `formats`, form admin e pagina pubblica
- [ ] 🟢 **A** — Collegare i format agli eventi passati che li hanno usati, così ogni pagina si popola da sola nel tempo

### 1.2 Blog 🔴

6 articoli pubblicati. Uno **è un test rimasto online**.

| Articolo | Lunghezza | Stato |
|---|---|---|
| `come-si-sta-al-brusco` — titolo "brusco" | **45 caratteri** | 🔴 Test da rimuovere |
| Come scegliere l'artista musicale perfetto | 4.142 caratteri | Bozza generica da rivedere |
| Booking di artisti emergenti: guida completa | 2.873 caratteri | Bozza generica da rivedere |
| Format live N'arte: cosa sono e come funzionano | 2.225 caratteri | Bozza generica da rivedere |
| Organizzare un evento musicale di successo | 2.789 caratteri | Bozza generica da rivedere |
| Tendenze della musica dal vivo in Italia | 2.777 caratteri | Bozza generica da rivedere |

- [ ] 🔴 **A** — Rimuovere l'articolo di test `come-si-sta-al-brusco` (è pubblico ora)
- [ ] 🔴 **B** — Riscrivere o sostituire i 5 articoli provvisori con i contenuti ufficiali
- [ ] 🟡 **B** — Nessun articolo ha le parole chiave SEO compilate né l'immagine social: vanno aggiunte
- [ ] 🟡 **C** — Decidere se il blog serve categorie/tag e autori reali (oggi tutti gli articoli sono firmati "N'arte")
- [ ] 🟡 **A** — Aggiungere: tempo di lettura, articoli correlati, pulsanti di condivisione, paginazione, feed RSS
- [ ] 🟢 **C** — Decidere un piano editoriale: quanti articoli al mese, chi li scrive

### 1.3 Centro assistenza 🔴

**23 articoli su 36 sono segnaposto** che mostrano al pubblico "Questo articolo
è in preparazione". Due categorie intere sono completamente vuote.

Articoli da scrivere, raggruppati per categoria:

| Categoria | Articoli mancanti |
|---|---|
| Iniziare | tour della piattaforma, differenze tra i ruoli |
| Per artisti | piani Pro/Max, compensi e fatturazione, video promo |
| Per organizzatori | strutture multiple, annullare una data, guida al rider tecnico |
| Booking | differenza lead/booking, contratto modello |
| Consulenza | annullare una consulenza, diventare consulente |
| Account | cambiare email, eliminare l'account, privacy e dati |
| **Pagamenti** (categoria vuota) | come ci si accorda sul compenso, fattura fra artista e organizzatore, SIAE, acconto e saldo |
| **Policy** (categoria vuota) | termini di servizio, codice di condotta, contestazioni, sicurezza account |

- [ ] 🔴 **B** — Scrivere i 23 articoli mancanti (o **C**: decidere di nascondere le categorie non pronte invece di mostrarle vuote)
- [ ] 🔴 **B** — La categoria "Pagamenti" ora ha una posizione chiara da spiegare: **N'arte non interviene nel pagamento dell'ingaggio.** Artista e organizzatore si accordano e regolano direttamente fra loro; la piattaforma non incassa, non anticipa e non trattiene nulla. Gli articoli vanno scritti su questa base: chi fattura a chi, come funziona la SIAE, acconti e tutele diventano **consigli di buona pratica**, non regole della piattaforma. L'unica somma incassata da N'arte è l'abbonamento dell'artista.
- [ ] 🔴 **A** — Correggere l'articolo "Quali email automatiche invia N'arte": descrive email che oggi non partono (vedi sezione 2)
- [ ] 🔴 **A** — Gli articoli "Eliminare il proprio account" e "Privacy e gestione dati" promettono funzioni che non esistono ancora. O si costruiscono (vedi 3.4) o si riscrive il testo.
- [ ] 🟡 **A** — Nascondere dalla navigazione pubblica gli articoli segnaposto finché non sono scritti

### 1.4 Eventi 🔴

9 eventi in database. Uno è visibilmente rotto.

- [ ] 🔴 **A/B** — Evento "Brunch del 1 Maggio": data **1 settembre 2000**, descrizione di **4 caratteri**. È online adesso. Va corretto o rimosso *(decidi tu quale delle due — io non cancello nulla senza richiesta esplicita)*
- [ ] 🟡 **B** — 8 eventi su 9 non hanno il link per i biglietti
- [ ] 🟡 **B** — Solo 1 evento su 9 ha una galleria fotografica; nessuno ha video
- [ ] 🟢 **B** — Gli eventi passati sono il patrimonio più credibile del sito: vale la pena arricchirli con foto e resoconti

### 1.5 Artisti ufficiali da caricare 🔴

Il catalogo conta 11 profili, tutti con schede molto scarne: bio fra i 33 e i 91
caratteri, **nessuna galleria, nessuna traccia audio**, un solo video su tutta la
piattaforma. I profili creati in fase di sviluppo restano dove sono per scelta:
verranno superati dal caricamento di quelli ufficiali.

- [ ] 🔴 **B** — Caricare gli artisti ufficiali con profilo completo: foto, brani, video, bio estesa, fascia di prezzo. **È il passaggio che dà valore all'intero catalogo.** Il minimo credibile per aprire è intorno ai 15-20 profili reali.
- [ ] 🔴 **B** — Nessun artista ha caricato tracce audio: un profilo artista senza musica è il difetto più grave del catalogo
- [ ] 🟡 **A** — Rendere più insistente il blocco che spinge l'artista a completare il profilo in dashboard (esiste già `ProfileCompletionCard`)
- [ ] 🟡 **A** — Guida al primo caricamento per i nuovi artisti approvati, così arrivano da soli a un profilo completo

### 1.6 Altre pagine

- [ ] 🟡 **B** — Confermare le due date con `TODO` in [lib/content/milestones.ts](lib/content/milestones.ts): "Settembre 2018" e "Dal 2025, ogni domenica"
- [ ] 🟡 **B** — Verificare che statistiche, loghi partner e testimonianze in home siano dati reali e autorizzati
- [ ] 🟢 **A** — Il footer non ha link legali (vedi sezione 3)

---

## 2. Email 🔴

**Questa è la sezione più critica del progetto.** Il sistema è costruito molto
bene — 37 template, doppio provider con fallback, registro degli invii — ma
**nessuna email è mai stata consegnata**.

Il registro `email_log` contiene 9 righe, tutte con esito **"skipped"** e
motivo *"RESEND_API_KEY mancante"*. L'ultima è del 18 luglio 2026.

### 2.1 Perché non parte niente

| Problema | Valore attuale | Conseguenza |
|---|---|---|
| `BREVO_ENABLED_KEYS` non è impostata | assente | I 37 template Brevo pubblicati non vengono **mai** usati: tutto ricade su Resend |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | Dominio di prova di Resend: consegna **solo al tuo indirizzo**, a nessun altro |
| `BREVO_SENDER_EMAIL` | `narteweb@libero.it` | Casella Libero gratuita: niente SPF/DKIM/DMARC, finisce in spam o viene rifiutata |
| `BREVO_ASSET_BASE_URL` non è impostata | assente | Logo e immagini rotti dentro le email |

- [ ] 🔴 **B** — **Sbloccare la verifica del dominio su Brevo.** È il punto fermo reale: la verifica spettava al partner che detiene il dominio e **non è stata completata correttamente**. Luigi sta sollecitando formalmente. Finché non è chiusa, nessuna email può partire da un indirizzo N'arte — qualunque cosa faccia il codice.
- [ ] 🔴 **B** — Impostare il mittente su `noreply@narte.it` (o simile) al posto di libero.it e resend.dev
- [ ] 🔴 **B** — Impostare `BREVO_ENABLED_KEYS=*` su Vercel per attivare davvero Brevo
- [ ] 🔴 **B** — Impostare `BREVO_ASSET_BASE_URL` sul dominio finale
- [ ] 🔴 **A+B** — Test end-to-end di **ogni** email: io preparo lo scenario, tu confermi la ricezione su Gmail, Outlook e Libero

### 2.2 Email che mancano del tutto

Tre template esistono e sono pubblicati su Brevo, ma **nessuno li invia mai**
perché manca il processo pianificato che dovrebbe farlo partire:

- [ ] 🔴 **A** — Promemoria evento (`event_reminder`): nessun cron lo attiva
- [ ] 🔴 **A** — Promemoria consulenza (`consultation_reminder`): nessun cron lo attiva
- [ ] 🔴 **A** — Invito a recensire dopo l'evento (`feedback_request`): nessun cron lo attiva → **il flusso recensioni non parte mai** (vedi sezione 6)
- [ ] 🟡 **B** — Verificare i template di Supabase per conferma email e recupero password: se non sono stati personalizzati sono in **inglese** con il marchio Supabase
- [ ] 🟡 **A** — 5 punti del codice inviano ancora direttamente via Resend saltando il sistema Brevo: consulenze, lead da profilo artista, approvazione candidatura, richieste booking. Vanno uniformati.

### 2.3 Revisione del design

- [ ] 🟡 **A+B** — Rivedere il design di tutti i template: coerenza col marchio, logo, colori, piè di pagina con indirizzo fisico e link legali (obbligatorio per legge sulle email commerciali)
- [ ] 🟡 **A** — Aggiungere il link di disiscrizione dove serve
- [ ] 🟢 **A** — Pannello admin per rinviare un'email fallita

---

## 3. Privacy, GDPR e adempimenti legali 🔴

Oggi **non esiste nulla**: nessuna pagina legale, nessun consenso raccolto,
nessun banner. Va fatto prima di aprire al pubblico.

Una nota positiva: **il sito non usa Google Analytics, Meta Pixel o altri
tracciatori di terze parti**. Questo semplifica molto: il banner cookie sarà
leggero e la conformità è alla portata.

### 3.1 Documenti da far scrivere

- [ ] 🔴 **B** — Informativa privacy (avvocato / Uband). Deve coprire: registrazione, candidature, booking, chat con allegati e messaggi vocali, statistiche profilo, pagamenti Stripe, email Brevo
- [ ] 🔴 **B** — Cookie policy
- [ ] 🔴 **B** — Termini e condizioni d'uso della piattaforma
- [ ] 🔴 **B** — Condizioni di abbonamento artista: rinnovo, disdetta, **diritto di recesso di 14 giorni** (obbligatorio verso i consumatori UE)
- [x] ✅ **DECISO** — **N'arte è una piattaforma di collegamento e nulla più.** Non è parte del contratto fra artista e organizzatore e non intermedia il pagamento dell'esibizione. I termini vanno scritti su questa base: niente clausole di mandato, deposito o gestione fondi. *Semplifica sensibilmente il lavoro dell'avvocato.*
- [ ] 🟡 **B** — Registro dei trattamenti e accordi con i fornitori (Supabase, Brevo, Stripe, Vercel)

### 3.2 Cosa costruisco io una volta pronti i testi

- [ ] 🔴 **A** — Pagine `/privacy`, `/cookie-policy`, `/termini` + link nel footer
- [ ] 🔴 **A** — Banner cookie con consenso (leggero, visto che non ci sono tracciatori)
- [ ] 🔴 **A** — Casella di accettazione privacy e termini nei form di **registrazione**, **candidatura artista** e **contatti**: oggi non c'è in nessuno dei tre
- [ ] 🟡 **A** — Consenso marketing separato da quello obbligatorio

### 3.3 Diritti degli utenti

- [ ] 🔴 **A** — Cancellazione dell'account dall'area personale: oggi può farlo **solo l'amministratore**, l'utente non ha alcun modo
- [ ] 🟡 **A** — Esportazione dei propri dati
- [ ] 🟡 **C** — Politica di conservazione: per quanto si tengono chat, allegati, messaggi vocali e registro email? *Serve una decisione, poi la implemento.*

---

## 4. Sicurezza 🔴

- [ ] 🔴 **A** — Nessuna intestazione di sicurezza configurata: mancano CSP, HSTS e protezione contro l'inclusione in iframe
- [ ] 🔴 **A** — La pagina `/__health` è **pubblica**: mostra a chiunque lo stato del database, quali variabili d'ambiente sono configurate e il commit in produzione
- [ ] 🔴 **A** — Nessuna protezione anti-spam sui form pubblici (candidatura artista, contatti, richiesta booking): niente captcha, niente limite di invii. Un bot può riempire il database.
- [ ] 🟡 **A** — Limitare la frequenza delle richieste sulle rotte di caricamento file
- [ ] 🟢 **B** — Far fare una revisione di sicurezza indipendente prima del lancio

---

## 5. Abbonamenti Stripe 🟡

Il codice è solido: firma del webhook verificata, protezione dai doppi invii,
6 tipi di evento gestiti, portale clienti Stripe collegato per carta, fatture e
disdetta.

**Ma in produzione ci sono zero abbonamenti**: il flusso non è mai stato
percorso da nessuno.

- [ ] 🔴 **B** — Provare l'intero percorso con una carta reale: attivazione Pro, passaggio a Max, disdetta, pagamento fallito, riattivazione
- [ ] 🔴 **B** — Verificare che il webhook di produzione sia configurato sulla dashboard Stripe e che risponda
- [ ] 🟡 **C** — **I prezzi degli abbonamenti sono IVA inclusa o esclusa?** Vanno raccolti i dati di fatturazione (codice fiscale / partita IVA)? Va attivato Stripe Tax? *Da chiarire col commercialista.* Riguarda **solo** l'abbonamento artista: il compenso dell'ingaggio non passa mai da N'arte.
- [ ] 🟡 **C** — Tre funzioni sono vendute sulla pagina prezzi ma **non hanno alcun processo dietro**: "ti candidiamo a 2 eventi al mese" (Max), "proposta alle strutture" (Max), "shooting fotografico incluso nell'annuale". Chi le eroga, come, con che tempi? O si definisce il processo o si tolgono dalla pagina.
- [ ] 🟡 **A** — Chiarire all'artista Free cosa succede scendendo di piano: foto e video in eccesso restano o spariscono?
- [ ] 🟢 **A** — Report entrate nel pannello admin

---

## 6. Recensioni post-evento 🟡

A metà strada. La tabella esiste, il form esiste, la moderazione admin esiste.
Mancano i due pezzi che la rendono utile:

- [ ] 🔴 **A** — Le recensioni **non compaiono sul profilo pubblico dell'artista**. Oggi si vedono solo nella dashboard artista e nel pannello admin: nessun organizzatore le vedrà mai.
- [ ] 🟡 **A** — Nessun invito automatico a recensire dopo l'evento (serve il cron della sezione 2.2)
- [ ] 🟡 **C** — L'artista può rispondere a una recensione? Il documento di scope dice di sì, il database non ha il campo. *Da decidere.*

---

## 7. Mobile e accessibilità 🟡

**Sta meglio di quanto temevi.** Ho verificato: le aree autenticate hanno un
menu laterale a scomparsa e una barra di navigazione in basso che rispetta la
tacca dell'iPhone; le tabelle scorrono orizzontalmente da sole; la chat diventa
a tutto schermo sotto i 768px.

Quello che manca è il **collaudo su dispositivi veri**, non la costruzione.

- [ ] 🔴 **B** — Provare su iPhone e Android reali, ruolo per ruolo: registrazione → candidatura → dashboard → caricamento foto/video → calendario → chat con offerta → conferma booking. E lato organizzatore: creazione struttura → richiesta → trattativa → conferma.
- [ ] 🟡 **A** — I calendari usano griglie a 7 colonne senza dimensione minima delle celle: su schermi stretti i giorni si comprimono
- [ ] 🟡 **A** — Oltre 25 immagini usano il tag base invece del componente ottimizzato: pesano di più e caricano più lentamente in mobile
- [ ] 🟡 **B** — Verificare il contrasto dell'arancio `#FF5722` sul bianco: sotto i 18px non passa lo standard di accessibilità AA
- [ ] 🟢 **A** — Passata di accessibilità completa con tastiera e lettore di schermo

---

## 8. SEO e prestazioni 🟡

- [ ] 🔴 **A** — Mancano `sitemap.xml` e `robots.txt`: Google non sa cosa indicizzare
- [ ] 🔴 **A** — **Ogni pagina del sito manda al browser l'istruzione di non memorizzare nulla in cache.** Era una soluzione tampone per un vecchio problema, ma oggi rallenta l'intero sito per tutti i visitatori.
- [ ] 🟡 **A** — Manca la pagina 404 personalizzata
- [ ] 🟡 **A** — Manca l'immagine di anteprima social predefinita: i link condivisi su WhatsApp e Instagram appaiono spogli
- [ ] 🟡 **A** — Manca la marcatura strutturata per Google (eventi, artisti, articoli): senza, gli eventi non compaiono nei risultati arricchiti
- [ ] 🟡 **B** — Confermare il dominio finale e impostarlo su Vercel: oggi le configurazioni puntano a `narteplatform.vercel.app` e a `localhost`
- [ ] 🟢 **A** — Rimuovere lo script di pulizia della vecchia app installabile, che gira su ogni caricamento di pagina

---

## 9. Infrastruttura e operatività 🟡

- [ ] 🟡 **C** — **Supabase è sul piano gratuito.** Con bunny.net che si prende foto, video e audio (sezione 0), il vincolo di archiviazione smette di essere urgente e il piano gratuito regge più a lungo. Restano però due questioni: **nessun backup ripristinabile a piacere** e **pausa del progetto dopo 7 giorni di inattività** (oggi mitigata dal risveglio automatico giornaliero). *Il passaggio a Pro diventa una scelta di sicurezza, non più di capienza.*
- [ ] 🔴 **B** — Nessun backup del database configurato oltre a quello base del piano gratuito
- [ ] 🟡 **C** — **Non esiste un ambiente di prova: `main` è la produzione.** Ogni modifica va online subito. Vale la pena creare un ambiente separato?
- [ ] 🟡 **A/B** — Nessun sistema di monitoraggio degli errori: se un utente incontra un errore, nessuno lo viene a sapere
- [ ] 🟡 **B** — `VISIT_HASH_SALT` non è impostata: **le statistiche del profilo, vendute col piano Max, sono spente**
- [ ] 🟢 **A** — Nessun test automatico e nessun controllo automatico prima del rilascio
- [ ] 🟢 **A** — Documentazione interna da aggiornare: descrive 3 ruoli, ma il sistema ne ha 5 (mancano organizzatore e consulente) e non menziona chat, blog, format, abbonamenti e recensioni

---

## Decisioni: tre chiuse, due aperte

### Già decise ✅

| Decisione | Esito | Cosa sblocca |
|---|---|---|
| **Ruolo della piattaforma** | N'arte mette in contatto e basta: nessuna intermediazione del pagamento dell'ingaggio | Termini d'uso, categoria "Pagamenti" del centro assistenza |
| **Archivio dei contenuti** | **bunny.net confermato** | Video a 500 MB, caricamento da telefono, anteprime, foto più veloci |
| **Profili artista di sviluppo** | Restano, non si citano nei documenti al cliente | Superati dal caricamento degli artisti ufficiali |

### Ancora aperte

1. **Le tre promesse del piano Max** — candidature agli eventi, proposta alle strutture, shooting fotografico: si erogano davvero, e con quale processo, o si tolgono dal listino?
2. **Supabase passa a Pro?** Con bunny.net che si prende foto, video e audio, il piano gratuito diventa sufficiente più a lungo: resta però il tema dei backup del database e della pausa dopo 7 giorni di inattività.

## Ordine di lavoro consigliato

**Settimana 1 — fondamenta**
Integrazione bunny.net (appena arrivano le credenziali). In parallelo: sollecito
al partner per la verifica del dominio email, e brief all'avvocato per privacy,
cookie e termini.

**Settimana 2 — contenuti**
Caricamento degli artisti ufficiali, format, articoli del blog, articoli del
centro assistenza, correzione dell'evento rotto. Lato nostro: trasferimento dei
file su bunny.net e pagine legali.

**Settimana 3 — quello che faccio io**
Pagine legali, banner cookie, caselle di consenso, cancellazione account,
intestazioni di sicurezza, protezione anti-spam, `/__health` chiusa, sitemap,
robots, pagina 404, rimozione del blocco cache, recensioni sul profilo pubblico,
i tre cron per i promemoria.

**Settimana 4 — collaudo**
Percorso completo su dispositivi reali per tutti e cinque i ruoli, prova reale
degli abbonamenti Stripe, upgrade Supabase, monitoraggio errori.

---

*Documento generato da un'analisi in sola lettura del codice e del database di
produzione. Nessun dato è stato modificato.*
