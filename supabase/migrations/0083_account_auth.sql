-- 0083 — Account e autenticazione: candidatura collegata all'account, avatar da Google
--
-- CONTESTO
-- Revisione dell'area account (novembre 2026). Due cambi al database, entrambi
-- additivi:
--
--   1. artist_applications.user_id (nullable). Chi invia la candidatura da
--      loggato, con la stessa email dell'account, la collega all'account: al
--      momento dell'approvazione si sa di chi è, e l'export dei dati (art. 15
--      GDPR) la trova anche dopo un cambio di email. Le righe esistenti restano
--      con user_id NULL: nessun backfill (l'abbinamento per email sarebbe
--      un'ipotesi, non un dato).
--      `on delete set null`: se l'account viene cancellato la candidatura segue
--      le sue regole di conservazione, non sparisce con l'account.
--
--   2. handle_new_user: ripresa ESATTAMENTE dalla 0071 (ultima che la definisce:
--      promozione al superadmin via GUC, solo 'organizer' accettato dal
--      metadata, riga organizers 'pending' in un sotto-blocco con eccezione,
--      on conflict che aggiorna solo il ruolo). Unica aggiunta: avatar_url del
--      profilo dai metadati del provider (`avatar_url` o `picture`, li manda
--      Google), solo se è un URL https e non più lungo di 2000 caratteri. Sul
--      conflitto l'avatar NON si tocca: un profilo esistente tiene il suo.
--
-- Il codice funziona anche PRIMA di questa migration: l'inserimento della
-- candidatura toglie `user_id` se la colonna non c'è (colonnaAssente), e senza
-- la nuova funzione i nuovi account Google nascono senza foto, come oggi.
--
-- Nessuna tabella nuova: niente revoke da aggiungere. artist_applications
-- mantiene RLS e privilegi delle migration precedenti.
--
-- Idempotente: rieseguirla non cambia nulla.

-- =========================================
-- 1. artist_applications.user_id
-- =========================================
alter table public.artist_applications
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists artist_applications_user_id_idx
  on public.artist_applications (user_id)
  where user_id is not null;

comment on column public.artist_applications.user_id is
  'Account che ha inviato la candidatura (solo se loggato con la stessa email). NULL per le candidature anonime e per quelle precedenti alla 0083.';

-- =========================================
-- 2. handle_new_user (dalla 0071 + avatar_url)
-- =========================================
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
  -- 0083: foto del provider (Google manda `avatar_url` e `picture`).
  _avatar text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    ''
  )), '');
begin
  if _avatar is not null and (_avatar !~* '^https://' or char_length(_avatar) > 2000) then
    _avatar := null;
  end if;

  if _superadmin is not null and lower(new.email) = lower(_superadmin) then
    _role_text := 'superadmin';
  elsif _meta_role = 'organizer' then
    _role_text := 'organizer';
  end if;

  insert into public.profiles (id, role, full_name, avatar_url)
  values (new.id, _role_text::role_enum, coalesce(_full_name, null), _avatar)
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
