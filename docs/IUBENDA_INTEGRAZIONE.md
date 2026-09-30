# N'arte — Integrazione iubenda e copertura legale

> Guida operativa. Versione 1.0 — 14 settembre 2026.
> Il codice è già predisposto: qui c'è cosa fare fuori dal codice, in quale
> ordine, e cosa resta scoperto.

---

## 0. In due minuti

Il sito è già pronto ad accogliere iubenda e il tracciamento. **Niente è acceso**:
tutto dipende da variabili d'ambiente oggi vuote, e finché lo sono il
comportamento del sito è identico a prima.

Stato al 29 settembre 2026:

- ✅ **Migration applicate.** `0048`, `0049` (revoke inclusi), `0050`, `0051`,
  `0052`, `0055`, `0058`, `0059`. Verificabile con `npm run db:check-migrations`.
- ✅ **Piano Essentials acquistato.**
- ⬜ **Tre variabili da impostare su Vercel** — passo 3.4.
- ⬜ **Due variabili del sale** — passo 2. Non è facoltativo.
- ⬜ **Dati del titolare**: nome, P.IVA, sede, email istituzionale.

Finché le variabili iubenda sono vuote il sito si comporta esattamente come
prima: banner provvisorio, documenti locali, nessun tracciamento.

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

### Passo 1 — Le migration ✅ fatte

Applicate il 29 settembre 2026: `0048`, `0049` (con i `revoke`), `0050`, `0051`,
`0052`, `0055`, `0058`, `0059`.

```bash
npm run db:check-migrations   # sola lettura, per riverificare in qualunque momento
```

Resta **un controllo da fare a mano**, perché nessuno script esterno può leggere
il corpo di una funzione: la `0049` è stata riapplicata per intero, e siccome
ridefinisce `record_signup_consents()` potrebbe aver sovrascritto la versione
della `0059`. La query è la sezione 7 di
[`VERIFICA_MIGRATION.sql`](./VERIFICA_MIGRATION.sql).

> **Cosa è già cambiato per gli utenti.** Il gate è vivo: tutte e 7 le persone
> registrate — 1 superadmin, 3 artisti, 3 organizzatori — trovano la schermata
> di accettazione al primo accesso alle aree riservate. Nessuna di loro aveva mai
> accettato nulla.

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

### Passo 3 — iubenda (piano Essentials attivo)

> ⚠️ **Prima di tutto: su quale dominio è registrata la licenza?**
> Essentials si lega a **un** dominio. Se in fase di acquisto è stato indicato
> `narteplatform.vercel.app`, va corretto in `narteofficial.it` dalle
> impostazioni del sito nel pannello iubenda, **prima** di generare i documenti:
> il dominio compare dentro l'informativa, e cambiarlo dopo significa
> rigenerarla. Se il dominio definitivo non è ancora attivo su Vercel, si può
> registrare comunque quello finale: il banner funziona anche se il sito
> risponde altrove, è il documento che deve dire la verità.

#### 3.1 I documenti — dichiarare i servizi

Nel generatore di privacy e cookie policy vanno dichiarati **dodici** servizi.
Questa è la lista completa, con la categoria iubenda sotto cui cercarli:

| Categoria iubenda | Servizi |
|---|---|
| Hosting e infrastruttura backend | Vercel, Supabase, bunny.net |
| Registrazione e autenticazione | «fornita direttamente da questa applicazione» |
| Contattare l'utente | modulo di contatto — sono sei moduli, si dichiarano insieme |
| Gestione indirizzi e invio messaggi email | Brevo (Sendinblue), Resend |
| Gestione dei pagamenti | Stripe |
| Visualizzazione di contenuti da piattaforme esterne | riproduttore video bunny.net |
| Backup e infrastruttura | Unsplash |
| Statistica | Google Analytics 4 — **senza** funzioni pubblicitarie |
| Remarketing e targeting comportamentale | Facebook Pixel (Meta) |

Le ultime due si dichiarano **adesso**, anche se il tracciamento verrà accesso
dopo: il documento deve essere pronto prima degli script, non viceversa. Sono
dodici su un tetto di venti, quindi c'è margine.

**Da NON fare:** cercare il generatore di termini e condizioni. Non è in
Essentials, e i Termini di N'arte restano nel codice — vedi §4.

#### 3.2 Cookie Solution — il widget

Il pannello genera un solo script:

```html
<script src="https://embeds.iubenda.com/widgets/<UUID>.js"></script>
```

**Non va incollato nel sito**: serve solo l'UUID, che finisce in
`NEXT_PUBLIC_IUBENDA_WIDGET_ID`. Lo carica `components/legal/IubendaCs.tsx`.

Quel singolo script porta con sé **tre cose**, e questo cambia l'architettura:

1. **la configurazione del banner** decisa nel pannello;
2. il **blocco preventivo** degli script di terze parti — intercetta le richieste
   verso i domini di Google Analytics e di Meta e le trattiene;
3. la **modalità consenso di Google v2**, che emette da sé i segnali predefiniti
   e gli aggiornamenti.

Per questo il nostro codice **non scrive più `_iub.csConfiguration` a mano**:
sarebbero due sorgenti per le stesse impostazioni, e due gestori del consenso
Google che si sovrascrivono a vicenda.

> ⚠️ **Conseguenza da tenere a mente.** Le impostazioni del banner non sono più
> nel codice: stanno nel pannello. Se qualcuno le cambia là, il sito cambia
> comportamento senza che nessun commit lo registri. Lo stato **atteso**,
> verificato il 29/09/2026 leggendo il widget, è questo:
>
> | Impostazione | Valore atteso | Perché conta |
> |---|---|---|
> | `perPurposeConsent` | `true` | Misurazione e pubblicità devono essere due scelte separate: il codice legge le finalità 4 e 5 distintamente |
> | `rejectButtonDisplay` | `true` | Il rifiuto deve costare quanto l'accettazione |
> | `explicitWithdrawal` | `true` | Il ritiro deve essere un gesto esplicito |
> | `listPurposes` | `true` | Le finalità vanno elencate, non riassunte |
> | `askConsentAtCookiePolicyUpdate` | `true` | Se il documento cambia, si richiede il consenso |
> | Consent Mode v2 | attiva | La gestisce iubenda; il codice non la duplica |
>
> Se una di queste cambia, va aggiornata questa tabella — o rimessa a posto.

#### 3.2 bis I documenti — un solo numero

Dagli indirizzi dei documenti serve **solo il numero**:

```
https://www.iubenda.com/privacy-policy/98989782            ← privacy
https://www.iubenda.com/privacy-policy/98989782/cookie-policy ← cookie
```

Va in `NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID`. Il secondo indirizzo si ricava dal
primo: su iubenda la cookie policy non è un documento separato ma una sezione
dello stesso.

#### 3.3 Consent Database — archivio delle prove

Due cose da fare qui.

**a) I «legal notices» — e non si fanno dal pannello.**

Un legal notice è l'etichetta del testo che l'utente aveva davanti quando ha
accettato. Ne servono due, `privacy_policy` e `terms`, e si gestiscono in due
modi diversi perché hanno origine diversa:

| Identificativo | Come si registra |
|---|---|
| `privacy_policy` | **Una casella nel pannello.** Dashboard → [sito] → Consent Database → **EMBED** → ☑ *Sync your iubenda legal documents with the Consent Database*. Da lì in poi ogni nuova versione dell'informativa si sincronizza da sé |
| `terms` | **Un comando**: `npm run iubenda:notices`. Il pannello non offre un modo per registrare un documento che iubenda non genera, e i nostri Termini stanno nel codice |

```bash
npm run iubenda:notices -- --dry-run    # mostra cosa invierebbe, non scrive
npm run iubenda:notices                 # registra
```

Lo script legge i Termini **dalla pagina pubblicata**, non dal sorgente: così
registra ciò che gli utenti vedono davvero e non ciò che sta nel ramo corrente.
Se il deploy è indietro rispetto al codice, lo script se ne accorge — e in una
prova di consenso quella differenza conta. Verifica anche di aver estratto il
testo intero, e fallisce invece di registrarne uno troncato.

Va rieseguito ogni volta che i Termini cambiano in modo sostanziale. iubenda
conserva le versioni precedenti, quindi le prove già raccolte restano agganciate
al testo che era in vigore allora.

> **Le versioni sono due sistemi diversi, e non vanno mescolati.** iubenda numera
> i legal notice progressivamente (1, 2, 3…); la nostra `LEGAL_VERSION` è una
> data. Il codice quindi **non** passa una versione nelle prove — iubenda aggancia
> l'ultima che possiede, che è quella che l'utente ha letto — e la nostra la
> scrive dentro il testo della prova, dove resta leggibile.

**b) Generare la chiave API privata.** Quella pubblica non serve: le prove le
manda il nostro server, non il browser. Va in `IUBENDA_CONSENT_API_KEY`, **senza**
prefisso `NEXT_PUBLIC_`.

> La copia su iubenda non è la prova principale. Quella resta nel nostro
> database — `user_consents` per chi ha un account, le colonne
> `consent_version`/`consent_at` per i moduli pubblici. Questa è la copia presso
> un terzo, che ha un peso diverso se qualcuno contesta che il consenso sia stato
> manipolato a posteriori. Se iubenda non risponde, **il modulo dell'utente va a
> buon fine comunque**.

#### 3.4 Le variabili su Vercel

Ambiente **Production** (e Preview, se vuoi provarlo prima):

```
NEXT_PUBLIC_IUBENDA_WIDGET_ID=<UUID del widget>
NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID=<numero del documento>
IUBENDA_CONSENT_API_KEY=<chiave PRIVATA della Consent Database>
```

Le altre tre — `NEXT_PUBLIC_IUBENDA_PRIVACY_URL`, `..._COOKIE_URL`,
`..._TERMS_URL` — **vanno lasciate vuote**. Gli indirizzi dei documenti si
ricavano dall'identificativo, e i Termini non passano da iubenda.

> ⚠️ **Serve un nuovo deploy.** Le due `NEXT_PUBLIC_` vengono sostituite col loro
> valore al momento del build: impostarle su Vercel senza ridistribuire non
> cambia nulla, e sembra che l'integrazione non funzioni.

#### 3.5 Cosa accade appena il deploy è online

Cinque cose, tutte da sé:

1. Il banner provvisorio «Ho capito» **sparisce** e subentra quello di iubenda,
   con rifiuto e scelta per finalità.
2. Il banner comincia a comparire **anche nelle aree riservate**, dove prima non
   appariva mai.
3. `/privacy` e `/cookie-policy` mostrano il documento di iubenda in un riquadro
   sovrapposto, e sotto l'informativa compare la sezione con le cinque
   descrizioni su misura di N'arte.
4. Nel piè di pagina appare **«Preferenze cookie»**.
5. I video degli artisti **non partono più senza consenso**: al posto del play
   compare un riquadro che spiega perché e offre di sbloccare quel singolo video.

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

| Coperto da Essentials | Note |
|---|---|
| Informativa privacy | Generata e mantenuta aggiornata automaticamente |
| Cookie policy | Idem |
| Banner con consenso per finalità | Rifiuto allo stesso livello dell'accettazione, revoca |
| Blocco preventivo degli script | Presente, ma non ci si affida solo a quello |
| Google Consent Mode v2 | Incluso anche nel piano gratuito |
| **Consent Database** | **Incluso anche nel gratuito** — è già integrato nel codice |
| Incorporamento del documento nella pagina | In riquadro sovrapposto, disponibile su tutti i piani |

---

## 4. Cosa NON copre, e come è stato risolto

Tre cose, e tutte e tre sono già coperte diversamente. **Con Essentials più il
lavoro fatto nel codice, la copertura è piena.**

| Scoperto | Perché | Come è stato coperto |
|---|---|---|
| **Termini e condizioni** | Il generatore parte da Advanced (19,99 €/mese) | Restano in `lib/legal/content.ts`, completati con riparto degli adempimenti dell'evento, licenza sui contenuti dell'artista e poteri di moderazione. **È anche la scelta migliore**: quelle tre parti nessun generatore le produce, andrebbero inserite a mano come testo personalizzato comunque. |
| **Clausole personalizzate nell'informativa** | Essentials non le consente | Le cinque descrizioni su misura — chat e accesso del team, nomi della formazione, account creato dalla richiesta di booking, recensioni pubbliche, registro email — sono rese sulla pagina `/privacy` **sotto** il documento di iubenda, in una sezione che dichiara di far parte dell'informativa. Vedi `INTEGRAZIONI_NARTE` in `lib/legal/content.ts`. |
| **Registro dei trattamenti (art. 30)** | Solo in Ultimate (79,99 €/mese) | Scritto a mano: [`REGISTRO_TRATTAMENTI.md`](./REGISTRO_TRATTAMENTI.md), 15 trattamenti con finalità, base giuridica, destinatari, trasferimenti e conservazione. **Da validare dall'avvocato.** |

### Due limiti che restano, e sono accettabili

- **Il testo del documento non è reso in linea nella nostra pagina.** Servirebbe
  l'API JSON di iubenda, che su Essentials risponde 403: parte da Advanced. Si
  usa quindi l'incorporamento in riquadro, disponibile su tutti i piani, che
  almeno non porta l'utente fuori dal sito. Il giorno in cui si passasse ad
  Advanced, il pezzo da cambiare è solo `components/legal/IubendaPolicyEmbed.tsx`.
- **Il marchio iubenda resta sul banner.** Si rimuove del tutto solo con
  Ultimate. È cosmetico.
- **25.000 pagine viste al mese.** Oltre, 0,05 € ogni 1.000. Da tenere d'occhio.

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

1. **Attivare la cancellazione periodica** — vedi §9. Il lavoro è costruito e
   gira, ma in **sola conta**: non cancella niente finché non lo si decide.
2. **Pagine `/criteri-di-posizionamento` e `/segnalazioni`** — se P2B e DSA si
   applicano.
3. **Attivare la CSP**: `CSP_ENFORCE=1` su Vercel, dopo aver letto i log.

### Già fatto, non serve rifarlo

- Incorporamento dei documenti iubenda nelle nostre pagine, con la sezione delle
  descrizioni su misura accanto.
- Collegamento «Preferenze cookie» nel piè di pagina, che compare da sé quando
  iubenda è attivo: la revoca deve costare quanto l'accettazione.
- Consent Database collegata a tutti e sei i punti in cui si raccoglie un
  consenso. Non blocca mai un modulo, non manda l'indirizzo IP e non manda il
  contenuto dei messaggi — solo chi, quando, quale casella e quale versione.
- **Dati del titolare** in un punto solo (`lib/legal/titolare.ts`), da cui li
  prendono piè di pagina, informativa e registro dei trattamenti.
- **Pagina `/account/i-miei-dati`**: storico dei consensi con versione e data,
  esportazione in JSON, revoca del consenso al marketing, richiesta di
  cancellazione dell'account. Collegata dal piè di pagina e dal centro
  assistenza, i cui due articoli promettevano queste funzioni prima che
  esistessero.
- **Raccolta automatica delle violazioni CSP** su `/api/csp-report`, con
  deduplica e taglio dei parametri degli indirizzi. Vedi §8.

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

---

## 7. Il giorno del passaggio a www.narteofficial.it

Oggi la piattaforma vive su `narteplatform.vercel.app`; su `www.narteofficial.it`
c'è ancora il sito precedente, ospitato su Aruba. Quando si farà il passaggio,
il dominio non è una voce sola: compare in nove punti, e dimenticarne uno
produce guasti silenziosi — non errori, comportamenti sbagliati.

| # | Dove | Cosa cambiare | Se lo dimentichi |
|---|---|---|---|
| 1 | Vercel → Domains | Aggiungere `www.narteofficial.it` e puntare il DNS su Aruba | — |
| 2 | Vercel → `NEXT_PUBLIC_SITE_URL` | `https://www.narteofficial.it` | Indirizzi canonici, anteprime social, sitemap e **tutti i collegamenti dentro le email** continuano a puntare a vercel.app. Lo usano 16 file |
| 3 | iubenda → impostazioni del sito | Il dominio della licenza | I documenti nominano un sito dove la piattaforma non sta |
| 4 | `npm run iubenda:notices` | Rieseguirlo, così il testo registrato è quello servito dal nuovo dominio | Il testo resta quello vecchio: non è grave, ma la prova cita una pagina che non è più quella |
| 5 | `lib/legal/titolare.ts` → `emailContatti` / `emailPrivacy` | ✅ fatto il 30/09/2026: recapito unico `info@narteofficial.it` | La casella va attivata e presidiata sul dominio |
| 6 | Brevo → verifica del dominio, e `BREVO_SENDER_EMAIL` | Mittente su `narteofficial.it` | **Nessuna email parte.** È la questione aperta da luglio |
| 7 | Vercel → `BREVO_ASSET_BASE_URL` | `https://www.narteofficial.it` | Logo e immagini rotti dentro le email |
| 8 | Supabase → Auth → Site URL e Redirect URLs | Il nuovo dominio | Conferma email e recupero password rimandano al dominio vecchio: i collegamenti si aprono altrove |
| 9 | Stripe → webhook endpoint | Il nuovo indirizzo | Gli abbonamenti si pagano e la piattaforma non lo viene a sapere |

> **Il numero 2 è quello che fa più danni se sfugge**, perché non dà errore: le
> email continuano a partire con collegamenti al dominio vecchio, e nessuno se ne
> accorge finché un utente non ci clicca.

Nessuno di questi punti è nel codice tranne il 5: sono configurazioni. Il codice
legge già tutto da variabili d'ambiente, quindi il passaggio è un cambio di
valori più un redeploy — non un intervento.


---

## 8. Attivare la Content Security Policy

Oggi la policy è in **sola segnalazione**: il browser esegue tutto e riferisce
soltanto cosa avrebbe bloccato. Quindi **non protegge**.

Il piano iniziale era «navigare le cinque aree con la console aperta». È una
verifica che si fa una volta e poi non si rifà: richiede una persona, un browser
e la pazienza di attraversare pubblico, artista, organizzatore, admin e
consulente toccando ogni funzione. Basta un percorso non provato — un caricamento
audio, una chat con allegato, il portale Stripe — e la violazione si scopre dagli
utenti il giorno dell'attivazione.

Adesso la raccolta è automatica: i browser di chi usa il sito segnalano a
`/api/csp-report`, e le violazioni finiscono nei log di Vercel con prefisso
`[csp]`. Ogni violazione compare **una volta sola** per combinazione di direttiva
e origine bloccata — la stessa risorsa su venti profili artista è una cosa da
sistemare, non venti. Gli indirizzi vengono troncati al percorso, perché una
segnalazione può contenere un token di reimpostazione password nei parametri.

### Come si procede

1. Lasciare passare **almeno una settimana** di uso normale.
2. Cercare `[csp]` nei log di Vercel.
3. Se non compare nulla: `CSP_ENFORCE=1` fra le variabili d'ambiente, e
   ridistribuire. La policy diventa vincolante.
4. Se compare qualcosa: si valuta riga per riga se è una risorsa legittima da
   aggiungere alla policy, o qualcosa che è giusto bloccare.

> **L'attivazione è un interruttore, non una modifica al codice.** Se rompe
> qualcosa, tornare indietro è svuotare `CSP_ENFORCE` e ridistribuire — niente
> revert, niente attesa. Su una policy che può rompere pezzi di pagina in
> silenzio, la via di fuga vale più dell'eleganza.


---

## 9. La conservazione dei dati

Nessun dato veniva mai cancellato: `email_log` conservava gli indirizzi email in
chiaro di chiunque avesse ricevuto una comunicazione, senza scadenza;
`stripe_webhook_events` i messaggi integrali di Stripe; e `rate_limits_prune()`
era una funzione scritta nella migration 0048 e da allora mai chiamata da
nessuno. L'informativa prometteva periodi di conservazione che nella pratica non
esistevano: tutto era «per sempre».

Ora `/api/cron/retention` gira ogni notte alle 3:30. **In sola conta.**

### Perché non cancella subito

Perché nessuno può rispondere a priori alla domanda che conta — *quanto stiamo
per cancellare?* — e una cancellazione su dati di produzione non si annulla. Il
lavoro quindi legge, conta quante righe supererebbero ciascun periodo, e lo
scrive nei log con prefisso `[retention]`. Nient'altro.

Primo giro eseguito il 29/09/2026: **zero righe** in tutte le categorie, nessun
errore. La piattaforma è giovane e niente ha ancora superato i periodi; la cosa
utile è che tutti i nomi di colonna sono risultati corretti, quindi il conteggio
misura davvero quello che dice.

### Come si attiva

1. Lasciarla contare per qualche giorno e leggere `[retention]` nei log.
2. Confrontare i numeri con i periodi proposti in
   [`REGISTRO_TRATTAMENTI.md`](./REGISTRO_TRATTAMENTI.md) — che sono **ancora una
   proposta**, in attesa della revisione dell'avvocato.
3. Solo allora `RETENTION_ENFORCE=1` fra le variabili d'ambiente.

Serve anche `CRON_SECRET`: senza, la rotta risponde 401 a chiunque. A differenza
del keep-alive — che senza segreto resta aperto di proposito, perché fa solo
letture innocue — qui il segreto è obbligatorio, perché questa rotta può
cancellare.

### Cosa NON cancella, e va fatto a mano

I file. Né su bunny.net né su Supabase Storage: il lavoro tocca solo righe di
database. Quando si cancella una candidatura non approvata, il suo video resta
dov'è. Per quelli c'è `scripts/bunny-orfani.mjs`, che è un'altra procedura e
un'altra decisione.
