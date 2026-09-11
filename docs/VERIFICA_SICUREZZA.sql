-- =============================================================================
-- N'arte — Verifica delle migration di sicurezza 0056 e 0057
-- =============================================================================
-- SOLA LETTURA: non scrive, non modifica, non cancella niente.
-- Da incollare nel SQL editor di Supabase ed eseguire tutta insieme.
-- =============================================================================

-- ── 1. Nessuna scrittura via PostgREST ───────────────────────────────────────
-- ATTESO: zero righe. Ogni riga restituita è una tabella su cui un utente
-- autenticato può ancora scrivere saltando le Server Actions.
select 'SCRITTURA ANCORA APERTA' as problema,
       table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and grantee in ('anon','authenticated')
   and privilege_type in ('INSERT','UPDATE','DELETE')
 order by table_name, grantee;

-- ── 2. Il trigger che protegge il ruolo esiste ed è attivo ───────────────────
-- ATTESO: una riga, tgenabled = 'O' (abilitato).
select 'trigger ruolo' as controllo,
       tgname,
       case tgenabled when 'O' then 'attivo' when 'D' then 'DISABILITATO' else tgenabled end as stato
  from pg_trigger
 where tgrelid = 'public.profiles'::regclass
   and tgname = 'profiles_guard_role_trg';

-- ── 3. Le policy di Storage sono quelle nuove ────────────────────────────────
-- ATTESO di vedere:
--   chat-attachments read party        SELECT  {authenticated}
--   chat-attachments insert party      INSERT  {authenticated}
--   application-videos superadmin select SELECT {authenticated}
--   blog-covers superadmin insert      INSERT  {authenticated}
--   format-covers superadmin insert    INSERT  {authenticated}
--   event-videos superadmin insert     INSERT  {authenticated}
-- NON devono più comparire:
--   "chat-attachments read public", "chat-attachments insert authenticated",
--   "application-videos anon insert", "application-videos public select",
--   "blog-covers auth insert", "format-covers auth insert", "event-videos auth insert"
select policyname, cmd, roles
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and (policyname ilike 'chat-attachments%'
     or policyname ilike 'application-videos%'
     or policyname ilike 'blog-covers%'
     or policyname ilike 'format-covers%'
     or policyname ilike 'event-videos%')
 order by policyname;

-- ── 4. Le vecchie policy pericolose sono sparite ─────────────────────────────
-- ATTESO: zero righe.
select 'POLICY VECCHIA ANCORA PRESENTE' as problema, policyname, cmd, roles
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname in (
     'chat-attachments read public',
     'chat-attachments insert authenticated',
     'application-videos anon insert',
     'application-videos public select',
     'blog-covers auth insert',
     'format-covers auth insert',
     'event-videos auth insert'
   );

-- ── 5. Controprova sul ruolo: nessuno si è già promosso ──────────────────────
-- ATTESO: una sola riga superadmin, la tua.
select p.role, count(*) as quanti
  from public.profiles p
 group by p.role
 order by 1;
