# Task che Claude Code può sviluppare in autonomia

> Lista operativa interna, scorporata dalla [checklist completa](./CHECKLIST_LANCIO.md).
> Qui c'è **solo** ciò che posso costruire io. Contenuti, testi legali, account
> esterni e decisioni di business restano fuori: sono elencati come *prerequisiti*
> dove servono davvero.
>
> Ogni blocco è autonomo. Puoi dirmi «vai col blocco 3» e procedo senza altro contesto.

## Legenda

| Simbolo | Significato |
|---|---|
| 🟢 | **Parto subito.** Nessun prerequisito: dammi il via e lo faccio. |
| 🔑 | **Serve una credenziale o un accesso** da te prima di iniziare. |
| ❓ | **Serve una tua decisione** prima di iniziare. |

---

## Quadro d'insieme

| # | Blocco | Stato | Peso | Rischio |
|---|---|---|---|---|
| 0 | Pulizia e correzioni immediate | 🟢 | Basso | Nullo |
| 1 | Integrazione bunny.net | 🔑 | **Alto** | Medio |
| 2 | Sicurezza | 🟢 | Basso | Nullo |
| 3 | SEO e prestazioni | 🟢 | Medio | Basso |
| 4 | Impianto privacy e GDPR | 🟢 | Medio | Basso |
| 5 | Email: promemoria e uniformazione | 🟢 | Medio | Basso |
| 6 | Recensioni sul profilo pubblico | 🟢 | Basso | Basso |
| 7 | Pagine format estese | ❓ | Medio | Basso |
| 8 | Rifiniture mobile | 🟢 | Basso | Nullo |
| 9 | Pannello admin e strumenti interni | 🟢 | Medio | Basso |

**Ordine consigliato:** 0 → 2 → 3 → 1 → 5 → 6 → 4 → 8 → 7 → 9.
Il blocco 1 è il più grosso e conviene affrontarlo quando i tre veloci sono chiusi.

---

## Blocco 0 — Pulizia e correzioni immediate 🟢

Cose piccole, verificate, a rischio zero. Un'ora scarsa in tutto.

- [ ] Rimuovere l'articolo di prova `come-si-sta-al-brusco` dal blog *(è pubblico adesso)*
- [ ] Nascondere dalla navigazione pubblica i 23 articoli segnaposto del centro assistenza, finché non sono scritti
- [ ] Riscrivere l'articolo «Quali email automatiche invia N'arte»: oggi descrive invii che non avvengono
- [ ] Riscrivere gli articoli «Eliminare il proprio account» e «Privacy e gestione dati», o collegarli alle funzioni reali una volta pronto il blocco 4
- [ ] Aggiungere la pagina 404 personalizzata (`app/not-found.tsx`, oggi assente)
- [ ] Rimuovere lo script che disinstalla la vecchia PWA a ogni caricamento di pagina (`app/layout.tsx`)
- [ ] Aggiornare `CLAUDE.md` e `docs/`: descrivono 3 ruoli su 5 e ignorano chat, blog, format, abbonamenti, recensioni

**Non incluso qui:** l'evento «Brunch del 1 Maggio» (data 2000, descrizione di 4 caratteri). È un dato di produzione: dimmi se correggerlo o rimuoverlo e lo faccio, ma non lo tocco di iniziativa.

**Profili artista di sviluppo:** restano dove sono, per scelta. Non li tocco e non li cito nei documenti destinati al cliente. Verranno naturalmente superati dal caricamento degli artisti ufficiali, che spetta al team N'arte.

---

## Blocco 1 — Integrazione bunny.net 🔑

**Scelta confermata dal cliente.** È il blocco più importante e il più grosso.
L'architettura è già progettata in
[`VIDEO_ARCHITETTURA_BUNNY.md`](./VIDEO_ARCHITETTURA_BUNNY.md): non parto da zero.
L'unica cosa che manca per iniziare sono le credenziali.

### Cosa mi serve da te prima di iniziare

1. Account bunny.net attivo
2. **Video Library** creata su Bunny Stream → mi servono `library id` e `API key`
3. **Storage Zone** creata su Bunny Storage → mi servono `zone name`, `password` e l'`hostname` di consegna
4. Conferma che le chiavi vadano su Vercel (Production) e non solo in locale

### Cosa faccio io

**Fondamenta**
- [ ] Modulo `lib/bunny/` — client Stream e client Storage, tipi, gestione errori
- [ ] Variabili d'ambiente e loro documentazione in `.env.local.example`
- [ ] Migration: colonne per id Bunny, stato di elaborazione e url di consegna su `artist_videos`, `artists`, `events`, `formats`

**Video (Bunny Stream)**
- [ ] Caricamento diretto dal browser a Bunny con url firmato dal server: il file non passa più dai nostri server
- [ ] Caricamento ripristinabile — se cade la linea riparte dal punto esatto
- [ ] Alzare il limite da 50 MB a 500 MB, lato client e lato server
- [ ] Accettare i video girati da iPhone senza conversione manuale (oggi i `.mov` vengono rifiutati)
- [ ] Stato «in elaborazione» nella dashboard artista, con aggiornamento automatico quando il video è pronto
- [ ] Webhook di Bunny per sapere quando la conversione è finita
- [ ] Riproduttore con qualità adattiva e anteprima automatica sul profilo pubblico

**Foto e audio (Bunny Storage)**
- [ ] Spostare gallery, copertine, avatar e tracce audio su Bunny Storage
- [ ] Consegna delle immagini già ridimensionate per il riquadro in cui appaiono
- [ ] Adeguare tutti i punti di caricamento esistenti: `GalleryUpload`, `ImageUpload`, `AudioUpload`, `VideoUpload`, `ApplicationVideoUpload`, `EventVideoUpload`

**Migrazione e sicurezza**
- [ ] Script di trasferimento dei contenuti già su Supabase Storage → Bunny, **con verifica prima di rimuovere qualsiasi originale**
- [ ] Mantenere l'applicazione dei limiti di piano (3/10/30 foto, 1/3 video, 0/1 audio) sul nuovo percorso
- [ ] Cancellazione su Bunny quando si elimina un profilo o un contenuto, per non pagare spazio inutilizzato

> **Sul trasferimento dei file esistenti:** preparo lo script, lo eseguo in sola
> lettura per mostrarti il piano, e procedo alla scrittura solo dopo tuo via libera.
> Nessun file viene rimosso da Supabase finché non hai confermato che su Bunny c'è tutto.

---

## Blocco 2 — Sicurezza 🟢

Tutto verificato come mancante. Rischio nullo, beneficio immediato.

- [ ] Intestazioni di sicurezza in `next.config.ts`: CSP, HSTS, protezione dall'inclusione in iframe, `X-Content-Type-Options`
- [ ] Proteggere `/__health`, oggi **pubblica**: espone stato del database, variabili configurate e commit in produzione
- [ ] Protezione anti-spam sui tre form pubblici — candidatura artista, contatti, richiesta booking — che oggi non hanno né captcha né limite di invii
- [ ] Limite di frequenza sulle rotte di caricamento file

**Nota:** per il captcha propongo Cloudflare Turnstile (gratuito, senza cookie, quindi non complica il banner privacy). Se preferisci altro, dimmelo — altrimenti procedo così.

---

## Blocco 3 — SEO e prestazioni 🟢

- [ ] `app/sitemap.ts` con eventi, artisti, format, articoli e pagine statiche
- [ ] `app/robots.ts`
- [ ] **Rimuovere il blocco della cache del browser** presente su ogni pagina in `app/layout.tsx`: è un residuo che oggi rallenta tutto il sito
- [ ] Immagine di anteprima social predefinita + anteprima dedicata per artisti, eventi e articoli
- [ ] Marcatura strutturata per Google: `Event`, `MusicGroup`, `Article`, `Organization`, `BreadcrumbList`
- [ ] `generateMetadata` sulle pagine pubbliche che ne sono prive, con url canonici
- [ ] Sostituire le oltre 25 immagini che usano il tag base con il componente ottimizzato

**Prerequisito parziale:** per gli url canonici serve il dominio definitivo. Se non è ancora deciso procedo lo stesso, leggendolo dalla configurazione, e si aggiorna dopo con una sola variabile.

---

## Blocco 4 — Impianto privacy e GDPR 🟢

**Posso costruire tutto l'impianto senza aspettare l'avvocato.** I testi arrivano
dopo e si incollano dentro: le pagine sono predisposte per riceverli.

> **Posizionamento deciso, e semplifica parecchio.** N'arte è una piattaforma di
> collegamento: non incassa, non anticipa e non intermedia il compenso
> dell'esibizione, che artista e organizzatore concordano e regolano direttamente
> fra loro. I termini d'uso vanno scritti su questa base — niente clausole di
> mandato, deposito o gestione fondi. L'unica somma incassata da N'arte è
> l'abbonamento dell'artista.

- [ ] Pagine `/privacy`, `/cookie-policy`, `/termini` con impaginazione curata e struttura pronta per i testi definitivi
- [ ] Link legali nel footer, che oggi non ne ha nessuno
- [ ] Banner cookie con consenso *(leggero: il sito non ha tracciatori di terze parti)*
- [ ] Casella di accettazione privacy e termini nei tre form: registrazione, candidatura artista, contatti — **oggi assente in tutti e tre**
- [ ] Consenso marketing separato da quello obbligatorio, con registrazione di data e versione accettata
- [ ] **Cancellazione dell'account dall'area personale**: oggi può farlo solo l'amministratore
- [ ] Esportazione dei propri dati in un file scaricabile

**Prerequisito per andare online:** i testi dall'avvocato. L'impianto tecnico no, quello lo faccio subito.

---

## Blocco 5 — Email: promemoria e uniformazione 🟢

I 37 template esistono già. Qui costruisco solo quello che manca attorno.

- [ ] **Tre processi pianificati che oggi non esistono**, ed è il motivo per cui tre email non partono mai:
  - promemoria evento in arrivo
  - promemoria consulenza in arrivo
  - invito a recensire dopo l'evento — *senza questo il flusso recensioni non parte mai*
- [ ] Uniformare i 5 punti del codice che inviano ancora direttamente via Resend saltando il sistema Brevo: consulenze, lead da profilo artista, approvazione candidatura, richieste booking
- [ ] Revisione grafica dei template: logo, colori, piè di pagina con indirizzo e link legali *(obbligatorio per le email commerciali)*
- [ ] Link di disiscrizione dove serve
- [ ] Rinvio di un'email fallita dal pannello admin

**Attenzione:** questo blocco rende gli invii corretti, ma **non li fa arrivare**.

Il blocco reale è esterno: **la verifica del dominio su Brevo non è stata completata
correttamente dal partner che detiene il dominio**, a cui spettava. Finché quella
verifica non è chiusa, nessuna email può partire da un indirizzo N'arte, qualunque
cosa faccia il codice. Luigi sta sollecitando formalmente il partner.

Una volta sbloccata, servono tre impostazioni su Vercel — le faccio io se mi passi
gli accessi, o le fai tu in cinque minuti:

- mittente reale al posto di `narteweb@libero.it` e `onboarding@resend.dev`
- `BREVO_ENABLED_KEYS=*`
- `BREVO_ASSET_BASE_URL` sul dominio definitivo

---

## Blocco 6 — Recensioni sul profilo pubblico 🟢

Tabella, form e moderazione esistono già. Manca il pezzo che le rende utili.

- [ ] Mostrare le recensioni sul profilo pubblico dell'artista: voto medio, numero, elenco
- [ ] Voto medio nella scheda artista dentro il catalogo
- [ ] Rispettare la moderazione: le recensioni nascoste non compaiono
- [ ] Applicare il limite di piano: le recensioni sono una funzione Pro e Max

❓ *Da decidere separatamente:* se l'artista può rispondere a una recensione. Il documento di scope dice di sì, il database non ha il campo. Se confermi, aggiungo colonna e interfaccia.

---

## Blocco 7 — Pagine format estese ❓

**Bloccato finché non decidi quali sezioni deve avere la pagina di un format.**

La pagina attuale mostra già copertina, galleria, video, descrizione e form di
interesse. Le candidate da aggiungere:

fascia di prezzo indicativa · durata tipica · numero di artisti · formazione ·
scheda tecnica (service, spazio, corrente) · eventi passati che hanno usato il
format · artisti tipici · domande frequenti · scheda scaricabile in PDF

- [ ] Estendere la tabella `formats` con i campi decisi
- [ ] Estendere il form di gestione in `/admin/format`
- [ ] Ricostruire la pagina pubblica con le nuove sezioni
- [ ] Collegare format ed eventi, così ogni pagina si popola da sola nel tempo
- [ ] Testi SEO e anteprima social per ciascun format

**Dimmi quali sezioni vuoi e parto.** Se preferisci, ti propongo io una struttura e tu la approvi.

---

## Blocco 8 — Rifiniture mobile 🟢

La navigazione mobile c'è già ed è fatta bene: menu a scomparsa, barra inferiore
con rispetto della tacca, tabelle scorrevoli, chat a tutto schermo. Restano
dettagli.

- [ ] Dimensione minima delle celle nei calendari: a sette colonne su schermi stretti i giorni si comprimono
- [ ] Verifica delle aree toccabili sotto i 44px
- [ ] Tipo di tastiera corretto sui campi numerici e telefonici
- [ ] Contrasto dell'arancio `#FF5722` dove è usato come colore di testo sotto i 18px
- [ ] Passata di accessibilità: navigazione da tastiera, etichette, lettore di schermo

---

## Blocco 9 — Pannello admin e strumenti interni 🟢

Non blocca il lancio, ma vi fa risparmiare tempo da subito.

- [ ] Report entrate e stato abbonamenti degli artisti
- [ ] Esportazione in CSV di lead, artisti e richieste
- [ ] Gestione utenti e organizzatori senza passare da Supabase
- [ ] Registro delle azioni amministrative
- [ ] Monitoraggio degli errori, così un problema in produzione si vede invece di restare invisibile
- [ ] Test automatici sui percorsi critici e controllo automatico prima del rilascio

---

## Riepilogo dei prerequisiti

Quello che serve da te, raccolto in un posto solo:

| Cosa | Serve per | Chi | Stato |
|---|---|---|---|
| Credenziali bunny.net (Stream + Storage) | Blocco 1 | Tu | ⏳ attesa |
| **Verifica del dominio su Brevo** | Consegna di tutte le email | Partner che detiene il dominio | ⏳ **sollecito in corso** |
| Testi legali dall'avvocato | Pubblicazione blocco 4 | Avvocato | ⏳ attesa |
| Dominio definitivo del sito | Url canonici, blocco 3 | Tu | ⏳ attesa |
| Sezioni della pagina format | Blocco 7 | Tu | ⏳ attesa |
| L'artista risponde alle recensioni? | Blocco 6 | Tu | ⏳ attesa |
| Che fare dell'evento con data 2000 | Blocco 0 | Tu | ⏳ attesa |
| Caricamento degli artisti ufficiali | Credibilità del catalogo | Team N'arte | ⏳ da programmare |

### Decisioni già chiuse

| Decisione | Esito | Effetto |
|---|---|---|
| Ruolo della piattaforma nei pagamenti | **N'arte non intermedia l'ingaggio** | Semplifica termini d'uso e sblocca la sezione «Pagamenti» del centro assistenza |
| Archivio dei contenuti | **bunny.net confermato** | Sblocca il blocco 1 |
| Profili artista di sviluppo | **Restano, non si citano** | Superati dal caricamento degli artisti ufficiali |

---

## Come procediamo

Dimmi semplicemente **quali blocchi avviare** e in che ordine. Quelli marcati 🟢
non hanno bisogno d'altro: parto, lavoro, e ti riporto cosa ho cambiato.

Su ogni cosa che tocca dati di produzione — trasferimento file, record esistenti,
cancellazioni — mi fermo e chiedo prima, mostrandoti esattamente cosa verrebbe
scritto e su quale record.
