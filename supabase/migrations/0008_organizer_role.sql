-- =========================================
-- N'arte — Ruolo "organizer"
-- =========================================
-- Aggiunge il ruolo organizer all'enum role_enum e aggiorna la trigger
-- handle_new_user per impostare il ruolo dal metadata raw_user_meta_data
-- (campo "role"), così la signup può differenziare user / organizer.
-- Idempotente.

alter type public.role_enum add value if not exists 'organizer';

-- Ricrea la function handle_new_user usando il role dal metadata, con
-- fallback sicuro a 'user' e promozione automatica a superadmin via GUC.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _superadmin text := current_setting('app.superadmin_email', true);
  _meta_role text := coalesce(new.raw_user_meta_data->>'role', '');
  _role role_enum := 'user';
begin
  -- 1. superadmin via GUC
  if _superadmin is not null and lower(new.email) = lower(_superadmin) then
    _role := 'superadmin';
  -- 2. role esplicito dal signup metadata (solo organizer è auto-assegnabile)
  elsif _meta_role = 'organizer' then
    _role := 'organizer';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, _role, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do update set role = excluded.role;
  return new;
end;
$$;
