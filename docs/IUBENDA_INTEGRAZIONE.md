# N'arte — Integrazione iubenda e copertura legale

> Guida operativa. Versione 1.0 — 14 settembre 2026.
> Il codice è già predisposto: qui c'è cosa fare fuori dal codice, in quale
> ordine, e cosa resta scoperto.

---

## 0. In due minuti

Il sito è già pronto ad accogliere iubenda e il tracciamento. **Niente è acceso**:
tutto dipende da variabili d'ambiente oggi vuote, e finché lo sono il
comportamento del sito è identico a prima.

Mancano tre cose che solo tu puoi fare:

1. **applicare due migration** dal SQL editor Supabase (`0049`, poi `0059`);
2. **aprire iubenda** e incollare due identificativi nelle variabili su Vercel;
3. **fornire i dati del titolare** — nome, P.IVA, sede, email istituzionale.

Finché la prima non è fatta, **le caselle di consenso che il sito mostra non
archiviano nulla**.

---

## 1. Quello che è già stato fatto

| Area | Stato |
|---|---|
| Registro dei consensi | Funzioni SQL, helper applicativo, scrittura da registrazione e da gate |
| Gate di ri-accettazione | `/accetta-condizioni`, agganciato al middleware, con rimedio automatico ai disallineamenti |
| Caselle sui moduli | Tutti e sei i moduli pubblici, più la dichiarazione 18+ su registrazione e candidatura |
| Anti-spam | `guardPublicForm` aggiunto ai due moduli che ne erano privi |
| Banner e tracciamento | Componenti pronti, spenti dietro variabili d'ambiente |
| CSP | Domini iubenda, GA4 e Meta aggiunti; residui Google Fonts rimossi |
| Player video | Non parte più senza consenso |
| Documenti | Termini completati con le tre sezioni mancanti; informativa con le cinque descrizioni su misura |

### I tre buchi che sono stati chiusi

1. **`/api/booking-request` creava account senza che nessuno accettasse nulla**,
   e promuoveva la persona a organizzatore. Ora la casella è obbligatoria e il
   consenso finisce nel registro come per una registrazione normale.
2. **Nessun artista aveva un consenso registrato.** Gli account creati da un
   amministratore non passano da `signUp`, quindi la trigger non trovava niente
   da leggere. Li intercetta il gate al primo accesso — che è l'unica soluzione
   corretta: non si può spuntare una casella al posto di qualcun altro.
3. **Richiesta evento e richiesta consulenza erano senza casella, senza trappola
   anti-bot e senza freno.** Quest'ultima raccoglie nome, telefono e un campo di
   testo libero in cui una persona racconta la propria situazione: era il modulo
   più delicato del sito e il meno protetto.

---

## 2. Cosa devi fare, nell'ordine

### Passo 1 — Le migration *(blocca tutto il resto)*

Dal SQL editor di Supabase, nell'ordine:

1. `supabase/migrations/0048_rate_limits.sql`
2. `supabase/migrations/0049_user_consents.sql` — **è stata modificata**: ora
   contiene anche i `revoke` di tabella che le mancavano
3. `supabase/migrations/0059_consents_write.sql`

Le verifiche da eseguire subito dopo sono in
[`MIGRATION_DA_APPLICARE.md`](./MIGRATION_DA_APPLICARE.md).

> **Cosa cambia per gli utenti.** Dal momento in cui la `0059` è applicata, ogni
> persona già registrata trova al primo accesso alle aree riservate la schermata
> di accettazione. È il comportamento voluto.

### Passo 2 — Le due variabili del sale

Su Vercel, **variabili d'ambiente di produzione**:

```
VISIT_HASH_SALT=<32+ caratteri casuali>
RATE_LIMIT_SALT=<32+ caratteri casuali, diversi>
```

Non è facoltativo. Senza, il limitatore di frequenza ripiega su un sale scritto
in chiaro nel sorgente e **gli hash degli indirizzi IP diventano ricostruibili**
da chiunque conosca un IP — mentre l'informativa dichiara che l'IP è
pseudonimizzato. In più, senza `VISIT_HASH_SALT` le statistiche di profilo
vendute col piano Max sono semplicemente spente.

### Passo 3 — iubenda

**Sottoscrivi il piano gratuito adesso, non Essentials.** La licenza a pagamento
si lega a un dominio, e oggi sei ancora su `*.vercel.app`: pagheresti per il
dominio sbagliato. L'integrazione tecnica del piano gratuito è **identica** a
quella di Essentials — cambiano il marchio sul banner e i limiti dei documenti,
non una riga di codice. Passerai a Essentials il giorno di narteofficial.it.

#### 3.1 Crea il progetto

Dichiara il sito. Per ora l'indirizzo Vercel.

#### 3.2 Genera informativa e cookie policy

Dichiara i servizi in uso. Sono dodici, e vanno cercati con questi nomi nel
catalogo di iubenda:

| Categoria iubenda | Servizi da dichiarare |
|---|---|
| Hosting e infrastruttura backend | Vercel, Supabase, bunny.net |
| Registrazione e autenticazione | «fornita direttamente da questa applicazione» |
| Contattare l'utente | modulo di contatto (sono sei moduli, si dichiarano insieme) |
| Gestione indirizzi e invio messaggi email | Brevo (Sendinblue), Resend |
| Gestione dei pagamenti | Stripe |
| Statistica | Google Analytics 4 — **senza** funzioni pubblicitarie |
| Remarketing e targeting comportamentale | Facebook Pixel (Meta) |
| Visualizzazione di contenuti da piattaforme esterne | player video bunny.net |
| Backup e infrastruttura | Unsplash (immagini remote) |

#### 3.3 Configura la Cookie Solution

Da attivare esplicitamente:

- **consenso per singola finalità** (senza, misurazione e pubblicità sarebbero
  un'unica scelta: il codice si aspetta le finalità 4 e 5 separate);
- **pulsante di rifiuto sullo stesso livello dell'accettazione** — è il punto su
  cui il Garante è stato più netto;
- **blocco preventivo** degli script;
- **Google Consent Mode v2**: attivo lato iubenda come *opzione del banner*, ma
  **non** il template automatico. La modalità consenso la governa il nostro
  codice; averne due significa due gestori che si sovrascrivono a vicenda, con
  esiti che dipendono dall'ordine di caricamento — cioè funzionanti in prova e
  imprevedibili in produzione;
- riproposizione del banner a **12 mesi**.

#### 3.4 Copia gli identificativi su Vercel

```
NEXT_PUBLIC_IUBENDA_SITE_ID=<id del sito>
NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID=<id della cookie policy>
NEXT_PUBLIC_IUBENDA_PRIVACY_URL=<indirizzo del documento>
NEXT_PUBLIC_IUBENDA_COOKIE_URL=<indirizzo del documento>
```

`NEXT_PUBLIC_IUBENDA_TERMS_URL` **resta vuota**: vedi §4.

> ⚠️ Sono variabili `NEXT_PUBLIC_`: vengono inserite nel pacchetto al momento
> del build. **Cambiarle su Vercel senza ridistribuire non ha alcun effetto.**

Appena `NEXT_PUBLIC_IUBENDA_SITE_ID` è valorizzata, il banner provvisorio si
spegne da solo e subentra quello di iubenda.

### Passo 4 — I dati del titolare

Servono: **nome e cognome, partita IVA, indirizzo della sede, email
istituzionale**. Vanno nel footer, nell'informativa, nei termini e nella
configurazione iubenda. Oggi nel footer c'è solo un cellulare e nei documenti un
segnaposto.

### Passo 5 — L'avvocato

Il pacchetto da consegnargli è descritto in
[`COMPLIANCE_PIANO_IBRIDO.md`](./COMPLIANCE_PIANO_IBRIDO.md). Le bozze da fargli
rivedere sono già scritte in `lib/legal/content.ts` e i punti da completare sono
marcati nel testo con la classe `da-completare`: sono **sette**, e compaiono
visibilmente in pagina finché non vengono risolti.

### Passo 6 — Il tracciamento *(solo alla fine)*

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=<id del pixel>
```

**Prima di valorizzarle devono essere vere tutte e tre queste cose:**

1. il banner iubenda è configurato e funzionante;
2. su Meta Business Manager è stato accettato l'**addendum di contitolarità**;
3. su Google Analytics sono stati accettati i **termini per il trattamento dei
   dati**.

La cookie policy si aggiorna da sola: il testo che oggi dice «non usiamo Google
Analytics, non usiamo il pixel di Meta» è legato alle stesse variabili che
accendono i tag, quindi non può restare indietro rispetto alla realtà.

---

## 3. Cosa copre iubenda Essentials

Essentials costa **4,99 €/mese** con pagamento annuale: 1 sito, 25.000 pagine
viste al mese, documenti «standard» fino a 20 servizi (ne servono 12).

**Coperto:** informativa privacy e cookie policy generate e mantenute
aggiornate, banner con consenso granulare, blocco preventivo, Google Consent
Mode v2, archivio delle prove di consenso.

---

## 4. Cosa NON copre, e come è stato risolto

| Scoperto | Perché | Come è stato coperto |
|---|---|---|
| **Termini e condizioni** | Il generatore parte dal piano Advanced (19,99 €/mese) | Restano scritti in `lib/legal/content.ts`, completati con riparto degli adempimenti, licenza sui contenuti e poteri di moderazione. Da far validare all'avvocato. |
| **Clausole personalizzate nell'informativa** | Essentials non le consente | Le cinque descrizioni su misura di N'arte — chat e accesso del team, nomi della formazione, account creato dalla richiesta di booking, recensioni pubbliche, registro email — sono nell'informativa locale. |
| **Registro dei trattamenti (art. 30)** | Solo nel piano Ultimate (79,99 €/mese) | Da produrre come documento. **Non ancora fatto.** |

### Cosa resta all'avvocato, e nessun generatore può fare

1. **Il parere sul modello**: «mette in contatto e si ferma lì» regge? Serve
   un'autorizzazione all'intermediazione?
2. **Regolamento P2B**: si applica? Se sì servono i criteri di posizionamento
   pubblicati — il piano di abbonamento influenza la posizione nei risultati.
3. **DSA**: N'arte ospita profili, chat e recensioni di utenti. Servono un punto
   di contatto e una procedura di segnalazione formale.
4. **Valutazione d'impatto e DPO**: l'elemento da pesare è che il superadmin
   legge il contenuto integrale di tutte le chat private, senza limiti e senza
   che l'accesso resti tracciato.
5. **Trasferimenti extra-UE**: Supabase, Vercel, Resend, Google, Meta, Unsplash.
6. **Validazione delle tre sezioni** aggiunte ai Termini.

---

## 5. Cosa resta da costruire

In ordine di importanza:

1. **Pagina «I miei dati»** — esportazione, storico dei consensi, revoca del
   marketing, richiesta di cancellazione dell'account. Oggi la cancellazione
   non esiste, ma l'informativa e il centro assistenza la promettono entrambi.
2. **Conservazione dei dati** — nessuna retention è attiva. `email_log`
   conserva gli indirizzi in chiaro senza scadenza, `stripe_webhook_events` il
   payload integrale, e `rate_limits_prune()` esiste ma non è chiamata da alcun
   cron. Vanno concentrate in una sola rotta, perché `vercel.json` dichiara un
   solo cron.
3. **Pagine `/criteri-di-posizionamento` e `/segnalazioni`** — se P2B e DSA si
   applicano.
4. **Dati societari nel footer**.
5. **Incorporare i documenti iubenda** nelle nostre pagine invece di rimandare
   fuori, affiancandoli alla sezione con le descrizioni su misura.

### Due testi da correggere

- `lib/help/categories/account.ts` — gli articoli «Eliminare il proprio account»
  e «Privacy e gestione dati» promettono funzioni che non esistono ancora.
- `app/(public)/prezzi/page.tsx:91` — «ogni mese il team ti propone ad almeno
  due eventi» non ha alcun processo dietro.

---

## 6. Come verificare che funzioni

Le prove complete sono nel piano di lavoro. Le tre che contano di più:

**Il tracciamento non parte prima del consenso.** Finestra anonima, pannello
Rete aperto: prima di qualunque click non deve esserci **nessuna** richiesta
verso `google-analytics.com`, `googletagmanager.com`, `facebook.net`. Rifiuta
tutto, ricarica, ricontrolla. Poi accetta, e solo allora devono comparire.

**Il gate non crea cicli.** Da un account di prova: la schermata compare,
`/privacy` e `/termini` restano leggibili, l'uscita funziona, e dopo aver
accettato si torna alla pagina di partenza.

**La CSP.** È ancora in **sola segnalazione**, quindi il browser esegue tutto lo
stesso: è facile concludere «il banner compare, va bene» e scoprire il giorno
dell'attivazione che il banner non si carica più — lasciando il sito senza
gestione del consenso e con il tracciamento acceso. Vanno navigate tutte e
cinque le aree con la console aperta, e solo quando non segnala più nulla si
rinomina la chiave in `Content-Security-Policy`.
