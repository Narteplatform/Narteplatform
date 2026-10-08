-- 0071 — Approvazione degli organizzatori
--
-- CONTESTO
-- Finora chi si registrava come organizzatore (o mandava la prima richiesta di
-- booking da utente) era operativo subito: nessuno del team lo verificava. Da
-- ora un nuovo organizzatore nasce «in attesa» e ottiene l'accesso alle
-- funzioni riservate (richieste, chat, calendario, strutture) solo dopo
-- l'approvazione del team da /admin/utenti.
--
-- Questa migration è INDIPENDENTE dalla 0069 e dalla 0070: si può eseguire in
-- qualunque ordine rispetto a loro. Il codice è già online e tollera la
-- colonna mancante (stato assente = «approved», cioè il comportamento di
-- prima): eseguire la migration è ciò che accende l'approvazione.
--
-- GLI ORGANIZZATORI GIÀ ESISTENTI NON VENGONO BLOCCATI. La colonna nasce con
-- default 'approved', quindi ogni riga di `organizers` già presente resta
-- approvata. Solo dopo, il default passa a 'pending' per le righe nuove.
--
--   1. organizers: approval_status, approval_decided_at/by, approval_note, city.
--   2. Backfill: chi ha ruolo 'organizer' ma non ha la riga `organizers`
--      (la 0019 aveva sostituito il trigger della 0009 perdendo l'insert).
--   3. handle_new_user: non accetta più 'consultant' dal metadata del client
--      (era una falla: chiunque, iscrivendosi, poteva dichiararsi consulente);
--      per 'organizer' crea la riga organizers in stato 'pending'.
--   4. promote_user_to_organizer non è più chiamabile dagli utenti: era una
--      scorciatoia con cui un utente si prometteva organizzatore da solo,
--      saltando l'approvazione. Il codice ora usa la service role.
--   5. Indice parziale sulle richieste in attesa.
--
-- Additiva e idempotente: rieseguirla non cambia nulla di quanto già fatto
-- (il backfill e il default 'approved' girano una volta sola, solo se la
-- colonna non esiste ancora).

-- =========================================
-- 1 + 2. Colonne e backfill (una sola volta)
-- =========================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'organizers'
       and column_name = 'approval_status'
  ) then
    -- Default 'approved': le righe già presenti restano approvate.
    alter table public.organizers
      add column approval_status text not null default 'approved';

    -- Backfill: ruolo organizer senza riga. Approvati, come lo erano di fatto.
    insert into public.organizers (user_id, display_name, approval_status)
    select p.id,
           coalesce(nullif(trim(p.full_name), ''), nullif(split_part(au.email, '@', 1), ''), 'Organizzatore'),
           'approved'
      from public.profiles p
      join auth.users au on au.id = p.id
     where p.role = 'organizer'
       and not exists (select 1 from public.organizers o where o.user_id = p.id)
    on conflict (user_id) do nothing;
  end if;
end $$;

alter table public.organizers
  add column if not exists approval_decided_at timestamptz,
  add column if not exists approval_decided_by uuid references auth.users(id) on delete set null,
  add column if not exists approval_note text,
  add column if not exists city text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'organizers_approval_status_check'
       and conrelid = 'public.organizers'::regclass
  ) then
    alter table public.organizers
      add constraint organizers_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- Da qui in poi le righe nuove nascono in attesa.
alter table public.organizers alter column approval_status set default 'pending';

comment on column public.organizers.approval_status is
  'pending = in attesa del team, approved = operativo, rejected = rifiutato. Lo imposta solo il team (service role).';

-- =========================================
-- 5. Indice parziale
-- =========================================
create index if not exists organizers_approval_pending_idx
  on public.organizers (created_at desc)
  where approval_status = 'pending';

-- =========================================
-- 3. handle_new_user
-- =========================================
-- Parte dalla versione della 0019 e mantiene tutto: promozione al superadmin
-- via GUC, full_name, on conflict. Cambia solo:
--   * 'consultant' non si accetta più dal metadata del client;
--   * per 'organizer' si crea anche la riga organizers, in stato 'pending'.
-- La creazione della riga organizers è in un sotto-blocco con eccezione: se
-- fallisce, l'iscrizione NON deve fallire (il codice la ricrea alla prima
-- visita dell'area organizzatore, sempre in attesa).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _superadmin text := current_setting('app.superadmin_email', true);
  _meta_role text := coalesce(new.raw_user_meta_data->>'role', '');
  _role_text text := 'user';
  _full_name text := new.raw_user_meta_data->>'full_name';
  _org_name text;
  _org_city text;
begin
  if _superadmin is not null and lower(new.email) = lower(_superadmin) then
    _role_text := 'superadmin';
  elsif _meta_role = 'organizer' then
    _role_text := 'organizer';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, _role_text::role_enum, coalesce(_full_name, null))
  on conflict (id) do update set role = excluded.role;

  if _role_text = 'organizer' then
    _org_name := left(nullif(trim(coalesce(new.raw_user_meta_data->>'organizer_name', '')), ''), 120);
    _org_city := left(nullif(trim(coalesce(new.raw_user_meta_data->>'organizer_city', '')), ''), 80);
    begin
      insert into public.organizers (user_id, display_name, city, approval_status)
      values (
        new.id,
        coalesce(_org_name, nullif(trim(coalesce(_full_name, '')), ''), nullif(split_part(new.email, '@', 1), ''), 'Organizzatore'),
        _org_city,
        'pending'
      )
      on conflict (user_id) do nothing;
    exception when others then
      raise warning 'handle_new_user: riga organizers non creata per %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

-- =========================================
-- 4. promote_user_to_organizer non più chiamabile dagli utenti
-- =========================================
-- Firma verificata in 0009: (uid uuid). Resta a service_role.
revoke execute on function public.promote_user_to_organizer(uuid) from public, anon, authenticated;
grant execute on function public.promote_user_to_organizer(uuid) to service_role;

-- =========================================
-- Privilegi sulla tabella
-- =========================================
-- La 0056 ha già tolto insert/update/delete a anon e authenticated su
-- `organizers`: un organizzatore non può quindi auto-approvarsi via PostgREST
-- (la RLS «organizers self update» della 0009 resta, ma senza il privilegio
-- non produce effetti). Si ripete qui, idempotente, perché il confine tra
-- «in attesa» e «approvato» dipende interamente da questo.
revoke insert, update, delete on public.organizers from anon, authenticated;

-- Ricarica la cache dello schema di PostgREST: senza, le colonne nuove possono
-- non essere visibili per qualche minuto.
notify pgrst, 'reload schema';

-- =========================================
-- VERIFICA — da eseguire subito dopo
-- =========================================
-- 1) Tutti gli organizzatori esistenti sono approvati (atteso: nessuna riga
--    'pending' o 'rejected' subito dopo la migration):
--
--   select approval_status, count(*) from public.organizers group by 1;
--
-- 2) Nessun ruolo organizer senza riga (atteso: zero righe):
--
--   select p.id from public.profiles p
--    where p.role = 'organizer'
--      and not exists (select 1 from public.organizers o where o.user_id = p.id);
--
-- 3) Gli utenti non possono scrivere su organizers (atteso: zero righe):
--
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'organizers'
--      and grantee in ('anon','authenticated')
--      and privilege_type in ('INSERT','UPDATE','DELETE');
--
-- 4) La RPC non è più eseguibile dagli utenti (atteso: false, false, true):
--
--   select has_function_privilege('anon', 'public.promote_user_to_organizer(uuid)', 'execute'),
--          has_function_privilege('authenticated', 'public.promote_user_to_organizer(uuid)', 'execute'),
--          has_function_privilege('service_role', 'public.promote_user_to_organizer(uuid)', 'execute');
