# Operatività — runbook

> Scritto il 13/11/2026. Breve di proposito: cosa fare quando qualcosa si rompe e
> come accorgersene prima degli utenti. Il DB Supabase è **quello di produzione** e
> non esiste staging: ogni comando di questo documento che scrive va eseguito solo
> sapendo cosa tocca (CLAUDE.md, «Regola numero uno»).

## 1. Backup del database

**Stato oggi: nessun backup ripristinabile.** Il progetto Supabase è sul piano
Free, che non offre backup scaricabili/ripristinabili dal pannello né il
Point-in-Time Recovery. Se il DB si corrompe o una cancellazione sbagliata va a
segno, oggi non c'è un punto da cui tornare. I file dei media sono su Supabase
Storage e su bunny.net: un dump di Postgres **non** li contiene (contiene solo gli
URL in colonna).

Due strade, non alternative fra loro:

### A. Supabase Pro (consigliata)

- Pro include backup giornalieri conservati 7 giorni, ripristinabili dal pannello
  (Database → Backups). Il PITR (ripristino a un istante qualsiasi) è un add-on a
  pagamento sopra Pro.
- Toglie anche la pausa dopo 7 giorni di inattività (oggi tamponata dal cron
  `/api/keepalive`).
- Nessuna modifica al codice: è una scelta di piano. Decisione del cliente.

### B. `pg_dump` programmato (anche col piano Free)

Un dump logico notturno conservato fuori da Supabase. Da preparare, **non è
attivo**. Schema della procedura:

1. Stringa di connessione: Supabase → Project Settings → Database → Connection
   string, modalità **Session pooler** (porta 5432; il Transaction pooler non va
   bene per `pg_dump`). La password del DB è un segreto: mai nel repo.
2. Dump in formato custom, senza proprietari e privilegi (ripristinabili su un
   progetto nuovo), includendo `public` e `auth` (gli utenti):
   ```bash
   pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges \
     --schema=public --schema=auth --schema=storage \
     -f narte-$(date +%F).dump
   ```
   In alternativa `supabase db dump --db-url "$DATABASE_URL" -f schema.sql` e
   `supabase db dump --db-url "$DATABASE_URL" --data-only -f dati.sql`.
   Versione di `pg_dump` ≥ a quella del server (Supabase usa Postgres 15+).
3. Dove farlo girare: un job pianificato fuori da Vercel (GitHub Actions con
   `schedule:` e il segreto `DATABASE_URL` nei secret del repository, oppure un
   cron su una macchina del team). Vercel non è adatto: niente `pg_dump` nel
   runtime e limiti di durata.
4. Dove conservarlo: storage privato e cifrato (es. bucket S3/Backblaze con
   cifratura lato server, o il dump cifrato con `age`/`gpg` prima del caricamento).
   **Il dump contiene dati personali**: va dichiarato nel registro dei trattamenti
   (`docs/REGISTRO_TRATTAMENTI.md`) con un periodo di conservazione (es. 30 giorni a
   rotazione) e l'accesso limitato al root.
5. Verifica: un backup mai ripristinato non è un backup. Una volta al mese
   ripristinarlo su un progetto Supabase **di prova, separato** (vedi §2).

Lo `storage` di Supabase nel dump contiene solo i metadati dei file. Per i file
veri: `supabase storage` / script di copia dei bucket, e il pannello bunny.net per
le zone Bunny (replica geografica o copia periodica).

## 2. Ripristino

**Mai ripristinare sopra la produzione senza una decisione esplicita del
cliente.** Un ripristino sovrascrive tutto ciò che è successo dopo il backup
(iscrizioni, pagamenti registrati, messaggi).

- **Con Supabase Pro:** Database → Backups → scegliere il giorno → Restore. Il
  progetto resta irraggiungibile per qualche minuto; poi verificare login,
  catalogo artisti, `/api/health?deep=1`.
- **Da un dump (`pg_dump`):**
  1. creare un progetto Supabase nuovo (o usare quello di prova);
  2. `pg_restore --no-owner --no-privileges -d "$DATABASE_URL_NUOVO" narte-AAAA-MM-GG.dump`;
  3. applicare eventuali migration successive al dump (`docs/MIGRATION_DA_APPLICARE.md`);
  4. controllare i conteggi con `npm run db:check-migrations` puntato al nuovo progetto;
  5. solo allora, se si decide di passare, aggiornare su Vercel
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` e fare redeploy. Gli URL OAuth di Google e i
     redirect di Supabase Auth vanno riconfigurati sul nuovo progetto.
- **Ripristino parziale** (es. una galleria svuotata): si legge il valore dal dump
  ripristinato sul progetto di prova e lo si riscrive sul singolo record di
  produzione, dopo averlo mostrato e fatto approvare. Mai un ripristino totale per
  recuperare un record.

## 3. Se un cron fallisce

I cron sono dichiarati in `vercel.json` (fonte di verità per gli orari) e si
autenticano con `Authorization: Bearer $CRON_SECRET`.

| Rotta | Cosa fa | Se non gira |
|---|---|---|
| `/api/keepalive` | 3 SELECT `head` per tenere sveglio Supabase Free | dopo ~7 giorni il progetto va in pausa: sito con liste vuote |
| `/api/cron/retention` | conservazione dei dati + promemoria rinnovi annuali | nessun danno immediato; i rinnovi annuali non vengono avvisati |
| `/api/cron/cancellazioni` | chiusure account al 30° giorno | le cancellazioni promesse slittano (termine GDPR di un mese) |
| `/api/cron/misure-programmate` | sospensioni/chiusure P2B con preavviso scaduto | la misura non parte alla data comunicata |
| `/api/cron/inviti` | premi del programma «Invita un artista» | i premi slittano al giorno dopo |
| `/api/cron/promemoria` | promemoria evento/consulenza, inviti a recensire | recuperati il giorno dopo (finestra di recupero), tranne le consulenze |

**Avviso automatico.** Keepalive, retention, cancellazioni, misure-programmate e
promemoria passano da `eseguiCron` (`lib/cron/esegui.ts`): un'eccezione, una
risposta non 2xx (esclusa la 401) o un JSON `ok: false` fanno partire un avviso al
root — notifica in-app e email (chiave `contact_message`, oggetto «Cron «nome» non
riuscito») — **al massimo una volta al giorno per cron**. Con Supabase in pausa la
notifica in-app non si può scrivere: arriva solo l'email a `SUPERADMIN_EMAIL`.

**Cosa fare quando arriva l'avviso:**

1. Vercel → progetto → Logs, filtrare per la rotta e per `[cron]`: la riga JSON
   riporta `cron`, `esito`, `status`, `errore`.
2. Se l'errore è del DB (timeout, `PGRST`, «paused»): controllare lo stato del
   progetto su Supabase e ripristinarlo (Restore project) se in pausa.
3. Se è una variabile mancante (`env mancanti`, «Root non identificabile»):
   correggere su Vercel e fare redeploy.
4. Rilanciare a mano, **dopo** aver capito la causa:
   ```bash
   curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/<nome>
   ```
   - `promemoria`: provare prima `?dry=1` (calcola e non invia). Rilanciarlo è
     sicuro: ogni invio è idempotente su `email_log`.
   - `retention` e `cancellazioni`: controllare prima gli interruttori (§5). Con
     `=1` il rilancio **cancella**.
   - `keepalive`: rilanciarlo è sempre innocuo.

## 4. Monitor esterno

`/api/health` è pubblica e minimale: `{ ok, time, version }`, nessuna query,
nessun segreto. Consigliato un monitor esterno gratuito (UptimeRobot, Better Stack):

- **ogni 5 minuti** `GET https://<dominio>/api/health`, allarme se lo status non è
  200 o se manca `"ok":true` → il deploy non risponde;
- **ogni 30-60 minuti** `GET https://<dominio>/api/health?deep=1` con header
  `Authorization: Bearer <CRON_SECRET>` (solo se il servizio tiene il segreto in
  modo riservato) → 503 se il DB non risponde, cioè Supabase in pausa o giù. Fa
  una sola HEAD su `formats`: nessuna scrittura.

`version` è il commit online (`VERCEL_GIT_COMMIT_SHA`): utile per capire se un
problema è iniziato con un deploy.

**Errori delle pagine.** `instrumentation.ts` scrive ogni errore di richiesta come
riga JSON con prefisso `[errore-richiesta]` nei log di Vercel (rotta, metodo,
tipo, digest, messaggio; niente header, cookie, query né percorsi con token).
Il `digest` è quello mostrato all'utente nella pagina d'errore: se qualcuno lo
segnala, lo si cerca nei log. Sentry è predisposto ma non attivo (vedi
`instrumentation.ts`).

## 5. Interruttori d'ambiente

Si cambiano su Vercel (Settings → Environment Variables) e richiedono un
**redeploy**. Tornare indietro = ripristinare il valore + redeploy, mai un revert
di codice.

| Variabile | Valori | Significato |
|---|---|---|
| `RETENTION_ENFORCE` | `1` / altro | `1` = `/api/cron/retention` cancella i dati oltre i periodi. Vuota o altro = **sola conta**. Dal 13/11/2026 è opt-in: se su Vercel non è impostata, il cron conta e basta. |
| `AUTO_CANCELLAZIONE_ENFORCE` | `1` / altro | `1` = le chiusure account oltre il 30° giorno vengono completate. Vuota o altro = **sola conta**, riepilogo al root. Dal 13/11/2026 è opt-in. |
| `INVITI_ATTIVI` | vuoto / `conta` / `1` | spento / traccia senza assegnare premi / attivo. |
| `BUNNY_UPLOADS_ENABLED` | vuoto, `0` / `1` | nuovi caricamenti su Supabase Storage / su bunny.net. |
| `CSP_ENFORCE` | vuoto / `1` | CSP in sola segnalazione / vincolante. |
| `NEXT_PUBLIC_LEGAL_V2_PUBBLICATO` | vuoto / `1` | pagine legali v2 spente / pubblicate (solo dopo l'approvazione del legale). |
| `CRON_SECRET` | segreto | autentica i cron e `/api/health?deep=1`. Senza, i cron che scrivono rispondono 401 (il keepalive resta aperto in sola lettura). |
| `SUPERADMIN_EMAIL` | email | identifica il root: destinatario degli avvisi dei cron e firmatario delle azioni automatiche. |
| `SENTRY_DSN` | — | non usata finché Sentry non è installato (vedi `instrumentation.ts`). |

⚠️ **Attenzione al cambio del 13/11/2026.** Fino a quella data `RETENTION_ENFORCE`
e `AUTO_CANCELLAZIONE_ENFORCE` cancellavano di default salvo `=0`. Ora cancellano
solo con `=1`. Se su Vercel non sono impostate (o valgono `0`), da ora i due cron
sono in **sola conta**: per mantenere le cancellazioni approvate dal cliente il
05/11/2026 vanno impostate esplicitamente a `1`.
