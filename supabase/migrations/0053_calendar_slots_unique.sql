-- =============================================================================
-- N'arte — Unicità degli slot di calendario
-- =============================================================================
-- ⚠️ È L'UNICA MIGRATION DI QUESTO LOTTO CHE CANCELLA RIGHE.
-- Va eseguita DA SOLA, e solo dopo aver letto il risultato del conteggio qui
-- sotto. Non incollarla insieme ad altre.
--
-- COSA CANCELLA, PRECISAMENTE: solo DUPLICATI ESATTI, cioè righe che hanno lo
-- stesso artista, la stessa data, lo stesso orario di inizio e fine e la stessa
-- etichetta. Righe del genere oggi producono la STESSA identica voce ripetuta
-- due volte nel calendario pubblico: rimuoverle non toglie all'artista un solo
-- minuto di disponibilità, toglie una ripetizione. La `partition by` include
-- ogni campo che l'utente vede, quindi nessuno slot con orario o etichetta
-- diversi viene toccato.
--
-- PERCHÉ SERVE: senza un unique, la modifica in massa del calendario è costretta
-- a cancellare-e-reinserire gli slot di tutto l'intervallo (ed è ciò che fa
-- oggi, distruggendo gli override messi a mano). Con l'unique può fare upsert e
-- non cancellare più niente.
--
-- -----------------------------------------------------------------------------
-- PASSO 1 — CONTEGGIO PREVENTIVO, DA ESEGUIRE E LEGGERE PRIMA DI PROSEGUIRE.
-- Se non restituisce righe, non c'è nulla da cancellare e sotto si creano solo
-- gli indici.
--
--   select artist_id, date, start_time, end_time, coalesce(label,'') as l,
--          count(*)
--     from public.artist_date_slots
--    group by 1,2,3,4,5 having count(*) > 1;
--
--   select artist_id, start_time, end_time, coalesce(label,'') as l, count(*)
--     from public.artist_default_slots
--    group by 1,2,3,4 having count(*) > 1;
-- -----------------------------------------------------------------------------

-- PASSO 2 — deduplica: si tiene la riga con l'id più basso, si scartano le sue
-- copie carbone.
with d as (
  select id,
         row_number() over (
           partition by artist_id, date, start_time, end_time, coalesce(label,'')
           order by id
         ) as rn
    from public.artist_date_slots
)
delete from public.artist_date_slots s
 using d
 where s.id = d.id and d.rn > 1;

with d as (
  select id,
         row_number() over (
           partition by artist_id, start_time, end_time, coalesce(label,'')
           order by id
         ) as rn
    from public.artist_default_slots
)
delete from public.artist_default_slots s
 using d
 where s.id = d.id and d.rn > 1;

-- PASSO 3 — l'unicità, da qui in avanti garantita dal database.
create unique index if not exists artist_date_slots_unique
  on public.artist_date_slots
     (artist_id, date, start_time, end_time, (coalesce(label,'')));

create unique index if not exists artist_default_slots_unique
  on public.artist_default_slots
     (artist_id, start_time, end_time, (coalesce(label,'')));
