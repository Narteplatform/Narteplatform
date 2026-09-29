-- N'arte — Quali migration sono state applicate?
--
-- ⛔ SOLA LETTURA. Nessuna di queste query scrive, cancella o modifica niente.
--    Si possono incollare nel SQL editor di Supabase senza alcun rischio.
--
-- ────────────────────────────────────────────────────────────────────────────
-- PERCHÉ SERVE.
-- Le migration di questo progetto vengono incollate a mano nel SQL editor:
-- `db:apply` non funziona perché DATABASE_URL non è configurato. Di conseguenza
-- NON esiste una tabella con l'elenco di quelle applicate, e la cronologia del
-- SQL editor non è numerata. L'unico modo di saperlo è cercare gli oggetti che
-- ciascuna migration crea.
--
-- PRIMA DI QUESTO FILE, prova:
--     npm run db:check-migrations
--
-- Quello script copre tabelle, colonne, funzioni, bucket e privilegi anonimi,
-- e stampa un riepilogo. Questo file serve per le quattro cose che PostgREST
-- non espone e che quindi da fuori non si possono vedere: indici univoci,
-- vincoli validati, pubblicazioni realtime e policy di Storage.
-- ────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. QUADRO D'INSIEME — una riga per migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Da eseguire per prima: dice a colpo d'occhio cosa manca.

with atteso(migration, oggetto, tipo) as (values
  ('0048_rate_limits',        'rate_limits',                  'tabella'),
  ('0048_rate_limits',        'rate_limit_hit',               'funzione'),
  ('0049_user_consents',      'user_consents',                'tabella'),
  ('0049_user_consents',      'record_signup_consents',       'funzione'),
  ('0050_bunny_video',        'media_assets',                 'tabella'),
  ('0050_bunny_video',        'artist_videos.bunny_guid',     'colonna'),
  ('0051_media_moderation',   'artist_media_submissions',     'tabella'),
  ('0052_media_moderation',   'approve_artist_media_submission', 'funzione'),
  ('0055_conversation_blocks','conversation_blocks',          'tabella'),
  ('0056_security_hardening', 'guard_profile_role',           'funzione'),
  ('0059_consents_write',     'record_consent',               'funzione'),
  ('0059_consents_write',     'accept_legal_documents',       'funzione'),
  ('0059_consents_write',     'profiles.legal_version_accepted', 'colonna'),
  ('0059_consents_write',     'leads.consent_version',        'colonna')
)
select
  a.migration,
  a.tipo,
  a.oggetto,
  case
    when a.tipo = 'tabella' then
      (to_regclass('public.' || a.oggetto) is not null)
    when a.tipo = 'funzione' then
      exists (select 1 from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = a.oggetto)
    when a.tipo = 'colonna' then
      exists (select 1 from information_schema.columns c
              where c.table_schema = 'public'
                and c.table_name  = split_part(a.oggetto, '.', 1)
                and c.column_name = split_part(a.oggetto, '.', 2))
  end as presente
from atteso a
order by a.migration, a.tipo, a.oggetto;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. `0050_bunny_video_validate.sql` — i vincoli sono stati VALIDATI?
-- ═══════════════════════════════════════════════════════════════════════════
-- La 0050 crea i vincoli `not valid`: esistono ma non sono stati verificati
-- sulle righe già presenti. La 0050_validate è il passo che li verifica.
--
-- `convalidated = false` → la 0050 è passata, la 0050_validate no.
-- Nessuna riga             → non è passata nemmeno la 0050.

select conname as vincolo, convalidated as validato
from pg_constraint
where conrelid = 'public.artist_videos'::regclass
  and conname like 'artist_videos_%_chk'
order by conname;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. `0053_calendar_slots_unique.sql` — gli indici univoci
-- ═══════════════════════════════════════════════════════════════════════════
-- Devono uscire DUE righe. Se ne esce una sola o nessuna, la migration non è
-- passata (o si è fermata a metà).

select tablename as tabella, indexname as indice
from pg_indexes
where schemaname = 'public'
  and indexname in ('artist_date_slots_unique', 'artist_default_slots_unique')
order by indexname;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. `0054_calendar_realtime.sql` — le tabelle sono nella pubblicazione?
-- ═══════════════════════════════════════════════════════════════════════════
-- Devono uscire TRE righe. Senza, il calendario non si aggiorna da solo e
-- bisogna ricaricare la pagina per vedere una data appena confermata.

select tablename as tabella
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. `0056` e `0049` — i privilegi sono stati REVOCATI?
-- ═══════════════════════════════════════════════════════════════════════════
-- La RLS filtra le RIGHE; i privilegi governano l'accesso alla TABELLA. Sono
-- due strati distinti e servono entrambi: è la lezione della 0056.
--
-- ⚠️ COME SI LEGGE. Questa query elenca ciò che ANCORA è concesso. La risposta
--    giusta è quindi una SELECT vuota, o quasi: ogni riga è un privilegio che
--    una migration avrebbe dovuto togliere.
--
--    Per `user_consents` deve restare soltanto `SELECT` a `authenticated`.
--    Per `profiles` non devono comparire INSERT, UPDATE o DELETE.

select
  table_name   as tabella,
  grantee      as ruolo,
  privilege_type as privilegio
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('user_consents', 'profiles', 'rate_limits',
                     'artist_profile_views', 'organizers', 'venues')
order by table_name, grantee, privilege_type;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. `0057` e `0058` — Storage: bucket e policy
-- ═══════════════════════════════════════════════════════════════════════════
-- `chat-attachments` e `application-videos` DEVONO risultare privati: il primo
-- contiene allegati e note vocali delle trattative, il secondo i video delle
-- candidature. Se `public` è true, quei file sono raggiungibili da chiunque
-- disponga dell'indirizzo — senza login e senza scadenza.

select id as bucket, public as pubblico
from storage.buckets
order by public desc, id;

-- Le policy sostituite dalla 0057. Non devono uscire le vecchie
-- («read public», «anon insert», «public select»): se compaiono, la migration
-- non è passata.

select policyname as policy, cmd as operazione
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
