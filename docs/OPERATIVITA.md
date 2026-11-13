# Operatività — runbook

> Scritto il 13/11/2026. Breve di proposito: cosa fare quando qualcosa si rompe e
> come accorgersene prima degli utenti. Il DB Supabase è **quello di produzione** e
> non esiste staging: ogni comando di questo documento che scrive va eseguito solo
> sapendo cosa tocca (CLAUDE.md, «Regola numero uno»).

## 1. Backup del database

**Attivo dal 13/11/2026, gratuito:** workflow GitHub Actions
[`.github/workflows/backup-db.yml`](../.github/workflows/backup-db.yml).

- Ogni notte alle 02:30 UTC (e a mano da GitHub → Actions → «Backup database» → *Run workflow*).
- `pg_dump` di `public`, `auth` (utenti) e `storage` (elenco dei file), formato *custom*
  compresso, con controllo d'integrità (`pg_restore --list`, almeno 20 tabelle con dati).
- **Cifrato con [age](https://age-encryption.org)** verso la chiave pubblica scritta nel workflow.
  La **chiave privata** è solo sul Mac di Luigi: `~/NARTE-backup-CHIAVE-PRIVATA.txt`. Va copiata
  nel gestore di password e in un secondo posto offline: **senza, i backup non si aprono**.
- Conservato come *artifact* per **30 giorni** (uno per notte). Il repository è pubblico: per questo
  il file in chiaro non lascia mai il runner.
- Segreto GitHub `SUPABASE_DB_URL`: stringa del **session pooler**
  `postgresql://postgres.nppzchkgzltcokvxcpji:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`
  (la connessione diretta `db.<ref>.supabase.co` è solo IPv6, irraggiungibile dai runner).
  Se si cambia la password del database su Supabase, va aggiornato anche questo segreto.
- Se il backup fallisce, GitHub manda un'email all'account del repository.

**Cosa NON copre:** i file caricati (foto, audio, video) stanno su Supabase Storage e Bunny; il
dump contiene solo l'elenco dei file di Storage, non i file. Né le impostazioni del pannello
Supabase (auth, SMTP, redirect).

Alternativa a pagamento: Supabase Pro (backup giornalieri gestiti, PITR opzionale).

## 2. Ripristino

1. GitHub → Actions → «Backup database» → esecuzione della data voluta → scarica l'artifact
   (zip con dentro `narte-db-AAAAMMGG-HHMM.dump.age`).
2. Decifra (serve `age`, `brew install age libpq`):
   ```bash
   age --decrypt -i ~/NARTE-backup-CHIAVE-PRIVATA.txt -o narte.dump narte-db-....dump.age
   /opt/homebrew/opt/libpq/bin/pg_restore --list narte.dump | head   # controllo
   ```
3. **Mai ripristinare sopra la produzione per provare.** Si ripristina in un progetto Supabase
   NUOVO (o locale), poi si verifica e solo allora si decide:
   ```bash
   # schema e dati di public (gli schemi auth/storage esistono già in un progetto nuovo:
   # se ne ripristinano solo i dati)
   pg_restore --no-owner --no-privileges --schema=public -d "<URL del progetto NUOVO>" narte.dump
   pg_restore --no-owner --no-privileges --data-only --schema=auth -d "<URL del progetto NUOVO>" narte.dump
   pg_restore --no-owner --no-privileges --data-only --schema=storage -d "<URL del progetto NUOVO>" narte.dump
   ```
4. Recuperare un singolo dato perso (es. una galleria svuotata): ripristinare in un progetto di
   appoggio, leggere la riga e riscriverla in produzione con una scrittura mirata e verificata.
5. Cancellare i file decifrati quando non servono più: contengono dati personali.

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
