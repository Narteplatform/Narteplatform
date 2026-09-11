# Migration da applicare a mano — istruzioni operative

`npm run db:apply` non funziona su questo progetto (manca `DATABASE_URL`): tutto
si esegue dal **SQL editor di Supabase**, copiando il contenuto dei file.

Le migration qui elencate vanno eseguite **nell'ordine indicato**. Fermarsi a
metà non rompe niente — sono tutte additive tranne dove segnalato — ma le
funzionalità nuove restano spente finché non si arriva in fondo.

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
0048 → 0049 → 0050 → [verifica] → 0050_validate
     → 0051 → [verifica] → [validate constraint] → 0052
     → [conteggio duplicati] → 0053 → 0054
     → 0055
```

`0051/0052`, `0053/0054` e `0055` sono indipendenti fra loro: si possono
applicare in momenti diversi.
