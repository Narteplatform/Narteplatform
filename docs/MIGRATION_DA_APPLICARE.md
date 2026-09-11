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

0048 → 0049 → 0050 → [verifica] → 0050_validate
     → 0051 → [verifica] → [validate constraint] → 0052
     → [conteggio duplicati] → 0053 → 0054
     → 0055
```

`0051/0052`, `0053/0054` e `0055` sono indipendenti fra loro: si possono
applicare in momenti diversi.
