-- =============================================================================
-- N'arte — Calendario in tempo reale
-- =============================================================================
-- ADDITIVA: aggiunge tre tabelle alla publication e alza la replica identity.
-- Nessun dato letto o scritto, nessuna policy modificata, nessuna colonna
-- toccata. Se eseguita due volte non fa nulla la seconda.
--
-- Le tre tabelle hanno già `select using (true)` dalla 0001/0006: il realtime
-- rispetta le RLS in lettura, quindi funziona anche per il visitatore anonimo
-- sul profilo pubblico senza bisogno di nuove policy.
-- =============================================================================

-- ⚠️ `replica identity full` SERVE DAVVERO, non è una precauzione generica.
-- Nel payload di un DELETE, Postgres manda per difetto solo la chiave primaria.
-- Il client si iscrive con `filter: artist_id=eq.<id>`: senza le altre colonne
-- quel filtro SCARTEREBBE OGNI DELETE — e "liberare un giorno" è, letteralmente,
-- una delete su artist_availability. Senza questa riga il calendario pubblico
-- vedrebbe comparire le date occupate ma non sparire quelle liberate.
alter table public.artist_availability  replica identity full;
alter table public.artist_date_slots    replica identity full;
alter table public.artist_default_slots replica identity full;

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'artist_availability',
      'artist_date_slots',
      'artist_default_slots'
    ]
    loop
      if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
