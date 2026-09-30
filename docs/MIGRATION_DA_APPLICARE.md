# Migration da applicare a mano — istruzioni operative

`npm run db:apply` non funziona su questo progetto (manca `DATABASE_URL`): tutto
si esegue dal **SQL editor di Supabase**, copiando il contenuto dei file.

Le migration qui elencate vanno eseguite **nell'ordine indicato**. Fermarsi a
metà non rompe niente — sono tutte additive tranne dove segnalato — ma le
funzionalità nuove restano spente finché non si arriva in fondo.

> **L'ordine fra codice e migration non conta.** Il codice rileva da solo se lo
> schema è già stato aggiornato: finché la `0051` non è applicata, i video si
> vedono tutti e i media si pubblicano senza approvazione, cioè esattamente
> come prima. Nessuna finestra in cui i contenuti spariscono dai profili o in
> cui un artista non riesce a salvare. Vale anche per la `0055`: finché manca,
> il pulsante di blocco in chat non ha dove scrivere e la chat funziona come
> oggi.

---

---

## `0058_private_buckets_and_organizers.sql` — l'ultimo residuo

⚠️ **È L'UNICA MIGRATION DI TUTTO IL LAVORO CHE VA APPLICATA *DOPO* IL DEPLOY
DEL CODICE, NON PRIMA.** Le altre si possono eseguire in qualsiasi ordine
rispetto al rilascio; questa no.

Chiude le due cose rimaste aperte dopo la `0057`:

1. **I bucket diventano privati.** Prima restavano pubblici: la `0057` aveva
   tolto la possibilità di *elencare* i file, ma chi avesse avuto l'indirizzo
   esatto poteva ancora scaricarli senza account, per sempre. Ora gli indirizzi
   si firmano e scadono dopo un'ora, quindi un link inoltrato o finito in un log
   smette di valere.
2. **L'anagrafica organizzatori non è più pubblica.** `organizers` contiene i
   telefoni e `venues` anche indirizzi ed email: erano leggibili da chiunque con
   la anon key. La vetrina pubblica non ne risente, perché nome e struttura
   arrivano dalla vista `booking_requests_public`, che espone solo le colonne
   mostrabili e gira con i privilegi del proprietario.

**Perché l'ordine conta:** da quando i bucket sono privati, gli allegati si
aprono solo tramite URL firmati, e a firmarli è il codice
(`lib/storage/signed.ts`). Eseguendo la migration prima del deploy, nella
finestra intermedia allegati e video di candidatura non si aprirebbero. Nessun
file va perso in nessun caso — cambia solo come se ne ricava l'indirizzo — e
oggi i due bucket sono comunque **vuoti**.

Dopo l'esecuzione, le tre verifiche sono scritte in fondo al file. La più utile
è la seconda: `select organizer_name, venue_name from booking_requests_public
limit 5;` deve restituire righe come prima (al momento del controllo erano 5).

---

# ⛔ PRIORITÀ ASSOLUTA — le due migration di sicurezza

Queste due **vengono prima di tutto il resto** e non dipendono dalle altre.

## `0056_security_hardening.sql` — falla critica

**Il problema, verificato sul database di produzione con un test che non ha
scritto nulla:** RLS è *row-level*, non *column-level*. La policy
`profiles update self` decide quale RIGA puoi modificare, non quali COLONNE — e
fra le colonne di `profiles` c'è `role`.

Chiunque si registri (la registrazione è aperta) poteva prendere la anon key —
che è pubblica, sta nel bundle del browser — e fare:

```
PATCH /rest/v1/profiles?id=eq.<proprio_id>   {"role":"superadmin"}
```

diventando amministratore della piattaforma: accesso a `/admin`, a tutte le
chat, a tutti i lead, cancellazione artisti, override dei piani.

È **lo stesso identico buco** che `0038_artists_column_hardening.sql` aveva già
diagnosticato e chiuso per `artists`. La stessa medicina non era mai stata data
a `profiles`, né a `booking_requests` (dove permetteva a un organizzatore di
confermare una data da solo, bloccando il calendario dell'artista senza il suo
consenso).

Dopo l'esecuzione, la verifica scritta in fondo al file deve restituire **zero
righe**.

## `0057_storage_hardening.sql` — allegati di chat enumerabili

Il bucket `chat-attachments` concedeva `select` ad `anon`: un anonimo poteva
elencare e scaricare **tutti i file di tutte le trattative**. Stessa cosa per i
video di candidatura, che sono dati personali. E su `application-videos`
chiunque poteva scrivere file arbitrari senza passare da nessun controllo.

**Va applicata ora perché i due bucket sono ancora vuoti**: zero file da
migrare, zero rischio di far sparire qualcosa. Fra un mese, con le trattative
in corso, sarebbe un'operazione ben più delicata.

---

## Come sapere cosa è già stato applicato

Non esiste un registro: le migration si incollano a mano nel SQL editor e non
lasciano traccia, e la cronologia del SQL editor non è numerata.

```bash
npm run db:check-migrations
```

È in **sola lettura** e non chiama nessuna funzione: cerca gli oggetti che
ciascuna migration crea — tabelle, colonne, funzioni, bucket, privilegi
anonimi — e stampa un riepilogo con l'elenco di ciò che resta da fare.

Quattro cose non si vedono da fuori, perché PostgREST non le espone: indici
univoci, vincoli validati, pubblicazioni realtime e policy di Storage. Per
quelle ci sono le query in [`VERIFICA_MIGRATION.sql`](./VERIFICA_MIGRATION.sql),
da incollare nel SQL editor — anch'esse di sola lettura.

---

## Prerequisito: il lotto già in attesa

Queste erano già da applicare prima di questo lavoro e **vengono per prime**:

| # | File | Cosa fa |
|---|---|---|
| 1 | `0048_rate_limits.sql` | Limitatore di frequenza. Finché manca, i freni registrano un avviso e lasciano passare. |
| 2 | `0049_user_consents.sql` | Registro dei consensi. |
| 3 | `0050_bunny_video.sql` | Colonne Bunny su `artist_videos` + `media_assets`. |
| 4 | `0050_bunny_video_validate.sql` | Validazione dei vincoli della 0050. Solo dopo aver letto l'esito dei controlli scritti nel file. |

Dopo la 3, il controllo obbligatorio (deve dare **una sola riga**,
`supabase | ready | <totale>`):

```sql
select provider, playback_state, count(*) from public.artist_videos group by 1,2;
```

---

## 1. Approvazione dei media artista

### `0051_media_moderation.sql`

⚠️ **Richiede la 0050 già applicata.** Controllo preventivo — devono uscire
tutte e tre le colonne:

```sql
select column_name from information_schema.columns
 where table_schema='public' and table_name='artist_videos'
   and column_name in ('provider','playback_state','upload_state');
```

Poi esegui il file. **Subito dopo**, il controllo che conta — deve dare **una
sola riga**, `approved | <totale video>`:

```sql
select moderation_state, count(*) from public.artist_videos group by 1;
```

> Se uscisse una riga `pending`, **non mettere online il codice**: il profilo
> pubblico filtra su questa colonna e quei video sparirebbero dai profili. Il
> default è `'approved'` apposta.

Solo se il conteggio è corretto:

```sql
alter table public.artist_videos validate constraint artist_videos_moderation_chk;
```

### `0052_media_moderation_rpc.sql`

Le due funzioni di approvazione. Nessun controllo particolare: non tocca dati.

**Da qui in poi** i nuovi caricamenti degli artisti entrano in coda e si
approvano da `/admin/moderazione`. Quelli già online restano online.

---

## 2. Calendario

### `0053_calendar_slots_unique.sql` — ⚠️ l'unica che cancella righe

**Eseguila da sola**, e solo dopo aver letto l'esito di questo conteggio:

```sql
select artist_id, date, start_time, end_time, coalesce(label,'') as l, count(*)
  from public.artist_date_slots
 group by 1,2,3,4,5 having count(*) > 1;

select artist_id, start_time, end_time, coalesce(label,'') as l, count(*)
  from public.artist_default_slots
 group by 1,2,3,4 having count(*) > 1;
```

Se non restituiscono righe non c'è niente da cancellare e il file crea solo gli
indici. Se restituiscono righe, quelle sono **duplicati esatti**: stesso
artista, stessa data, stessi orari, stessa etichetta — voci che oggi compaiono
due volte identiche nel calendario. Cancellarle non toglie disponibilità.

### `0054_calendar_realtime.sql`

Attiva il tempo reale sul calendario. Verifica dopo:

```sql
select tablename from pg_publication_tables
 where pubname='supabase_realtime' and schemaname='public'
   and tablename in ('artist_availability','artist_date_slots','artist_default_slots');
```

Devono comparire tutte e tre.

---

## 3. Moderazione della chat

### `0055_conversation_blocks.sql`

Interamente additiva: con la tabella vuota la chat si comporta esattamente come
oggi. Finché non la applichi, il pulsante di blocco in `/admin/chat` non ha dove
scrivere e il controllo lato invio lascia passare (scelta voluta: la chat non
deve rompersi nella finestra fra il rilascio del codice e l'esecuzione qui).

---

## Riepilogo dell'ordine

```
0056 → [verifica grant]        ← PRIMA DI TUTTO: falla critica
0057                            ← finché i bucket sono vuoti
0058                            ← SOLO DOPO il deploy del codice

0048 → 0049 → 0050 → [verifica] → 0050_validate
     → 0051 → [verifica] → [validate constraint] → 0052
     → [conteggio duplicati] → 0053 → 0054
     → 0055

0049 → 0059                     ← consensi: scrittura, gate, moduli pubblici
```

`0051/0052`, `0053/0054` e `0055` sono indipendenti fra loro: si possono
applicare in momenti diversi.

---

## Consensi — `0059_consents_write.sql`

⚠️ **Richiede la `0049` già applicata**, e la `0049` è stata **modificata**:
ora contiene anche i `revoke` di tabella che le mancavano. Se l'avessi già
eseguita, riesegui solo il blocco finale (`revoke all on public.user_consents
from anon, authenticated;` più il `grant select`): il resto del file è
ripetibile e non fa danni, ma quel blocco è l'unica aggiunta.

Cosa introduce la `0059`:

| Oggetto | A cosa serve |
|---|---|
| `record_consent(kind, version, accepted)` | Scrive un consenso per l'utente in sessione. `accepted = false` registra un ritiro. |
| `accept_legal_documents(version, marketing)` | Privacy + termini (+ marketing) in una transazione sola, più l'aggiornamento della cache. |
| `profiles.legal_version_accepted` | Versione già accettata. La legge il middleware. |
| `consent_version` / `consent_at` su 4 tabelle | Prova del consenso per chi non ha un account. |
| `record_signup_consents()` ridefinita | Ora aggiorna anche la colonna: senza, chi si registra accettando finirebbe **comunque** nel gate al primo accesso. |

Verifica subito dopo — devono uscire entrambe le funzioni:

```sql
select proname from pg_proc
where proname in ('record_consent', 'accept_legal_documents');
```

E la colonna:

```sql
select column_name from information_schema.columns
where table_name = 'profiles' and column_name = 'legal_version_accepted';
```

### Ordine rispetto al deploy del codice

Il codice **tollera lo schema vecchio**: se arriva online prima della migration,
il middleware si accorge che la colonna non esiste, ripiega sulla lettura del
solo ruolo e **lascia passare tutti**. Nessuno resta chiuso fuori dalla propria
dashboard, e il gate resta semplicemente inattivo finché la colonna non c'è.

Quindi l'ordine è libero, ma conviene: **prima la migration, poi il deploy** —
così il gate entra in funzione senza una finestra intermedia in cui il consenso
non viene archiviato.

### Cosa succede il giorno dopo

Dal momento in cui la `0059` è applicata, **ogni utente già registrato** —
artisti, organizzatori, consulenti, superadmin — trova al primo accesso alle
aree riservate la schermata `/accetta-condizioni`. È voluto: nessuno di loro ha
mai accettato nulla, e gli account creati da un amministratore non hanno mai
visto una casella.


---

## Cancellazione account — `0060_account_deletion.sql`

Crea `account_deletion_requests`: la tabella delle richieste di cancellazione,
con token di conferma (conservato come impronta, mai in chiaro), scadenza e
stato di ripristino.

Additiva, non tocca nessuna tabella esistente. RLS più `revoke`, come 0046 e
0049: ognuno legge le proprie richieste, il superadmin tutte, e nessuno scrive
se non dal server.

Verifica subito dopo:

```sql
select column_name from information_schema.columns
where table_name = 'account_deletion_requests'
order by ordinal_position;
```

### Cosa cambia quando è applicata

La pagina `/account/i-miei-dati` comincia a funzionare per intero. Il percorso è:

1. l'utente chiede la cancellazione → si registra la richiesta e parte un'email;
2. l'utente apre il collegamento (vale 48 ore) → **l'accesso viene chiuso e i
   profili artista tornano a `pending`**, quindi spariscono dal catalogo;
3. la rimozione definitiva di dati e file resta un passaggio da eseguire a mano
   entro 30 giorni — procedura in `REGISTRO_TRATTAMENTI.md` §6.

Finché la migration non è applicata, la richiesta fallisce con un messaggio che
invita a scrivere dalla pagina contatti: non si rompe nulla, semplicemente non
parte.

> **La disattivazione è reversibile per trenta giorni**, e deve restarlo: la
> colonna `restore_state` registra cosa è stato cambiato — quali profili sono
> stati riportati a `pending`, e che l'accesso è stato bloccato — proprio perché
> si possa tornare indietro finché la cancellazione non è stata eseguita.

## Integrità del booking — `0061_booking_integrity.sql`

**Cosa fa.** Aggiunge un trigger che rifiuta le transizioni di stato non ammesse
sulle richieste di booking e ridefinisce `accept_offer_v2`.

| Da | A |
|---|---|
| `pending` | `in_trattativa`, `rifiutata`, `annullata`, `confermata` |
| `in_trattativa` | `confermata`, `annullata` |
| `confermata` | `annullata` (solo il Team, con motivazione) |
| `rifiutata`, `annullata` | nessuna |

Con la nuova `accept_offer_v2`, accettare un'Offerta in chat **conferma la
trattativa già aperta** fra le due parti invece di creare un secondo booking. Se
la data è già occupata restituisce un messaggio leggibile.

**Rischio.** Basso: nessun dato viene modificato, il trigger guarda solo i
cambi di stato futuri. Le server action sono già state corrette nel codice e
funzionano anche prima che questa migration sia applicata.

**Verifica.** Le due query in fondo a `docs/VERIFICA_MIGRATION.sql`.

## Allineamento legale — `0062` → `0067` (30/09/2026)

Nate dal fascicolo legale v0.95 e dalla decisione del cliente che N'arte sia
solo una piattaforma promozionale. **Ordine consigliato:** 0061, 0062, 0063,
0064, 0065, 0066, 0067. Tutte additive o limitate a vincoli e policy: nessuna
riga esistente viene modificata o cancellata. Il codice funziona anche prima
che siano applicate, con i limiti descritti in CLAUDE.md per ciascuna.

| File | In breve | Attenzione |
|---|---|---|
| 0062 | nuovi tipi di consenso, colonna `ref` | ricrea `record_consent` con 4 argomenti |
| 0063 | segnalazioni DSA | — |
| 0064 | registro accessi chat, policy chat senza superadmin | dopo l'esecuzione l'admin legge le chat solo con accesso motivato |
| 0065 | registro decisioni di moderazione | prima della 0066 |
| 0066 | recensioni: risposta, cancellazione logica, moderazione motivata | — |
| 0067 | cancellazione senza danni alla controparte, vista date privata | `organizers.user_id` diventa facoltativa |

Verifica dopo l'esecuzione: `npm run db:check-migrations` e le query in fondo a
`docs/VERIFICA_MIGRATION.sql`.
