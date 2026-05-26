-- =========================================
-- N'arte — Artist tier (free/pro/max) + percorso artistico
-- =========================================
-- - Enum artist_tier_enum + artist_path_enum
-- - Colonne artists.tier (default 'free') + artists.percorso_artistico (nullable)
-- - Trigger: percorso_artistico ammesso solo per tier in ('pro','max')
-- - tier modificabile solo da superadmin (RLS dedicata)
-- Idempotente.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'artist_tier_enum') then
    create type public.artist_tier_enum as enum ('free', 'pro', 'max');
  end if;
  if not exists (select 1 from pg_type where typname = 'artist_path_enum') then
    create type public.artist_path_enum as enum ('cover_artist', 'tribute_band', 'progetto_inedito');
  end if;
end $$;

alter table public.artists
  add column if not exists tier public.artist_tier_enum not null default 'free',
  add column if not exists percorso_artistico public.artist_path_enum;

create or replace function public.artists_validate_tier_path()
returns trigger
language plpgsql
as $$
begin
  if new.percorso_artistico is not null and new.tier = 'free' then
    -- Forza a null se tier free
    new.percorso_artistico := null;
  end if;
  return new;
end;
$$;

drop trigger if exists artists_validate_tier_path_trg on public.artists;
create trigger artists_validate_tier_path_trg
  before insert or update of tier, percorso_artistico on public.artists
  for each row execute function public.artists_validate_tier_path();

-- RLS: tier modificabile solo da superadmin.
-- Le policy "artist self update" su artists non vengono ristrette qui
-- (cambio tier richiede SUPERADMIN/service role lato server action).
