-- =========================================
-- N'arte — Massimo 3 generi per artista
-- =========================================
-- - Trunca array genre a 3 elementi su tutti gli artisti esistenti
-- - Trigger BEFORE INSERT OR UPDATE che rifiuta inserimenti >3 generi
-- Idempotente.

update public.artists
   set genre = genre[1:3]
 where coalesce(array_length(genre, 1), 0) > 3;

update public.artist_applications
   set genre = genre[1:3]
 where coalesce(array_length(genre, 1), 0) > 3;

create or replace function public.artists_max_3_genres()
returns trigger
language plpgsql
as $$
begin
  if coalesce(array_length(new.genre, 1), 0) > 3 then
    raise exception 'Massimo 3 generi per artista (ricevuti %)', array_length(new.genre, 1)
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists artists_max_3_genres_trg on public.artists;
create trigger artists_max_3_genres_trg
  before insert or update of genre on public.artists
  for each row execute function public.artists_max_3_genres();

drop trigger if exists artist_applications_max_3_genres_trg on public.artist_applications;
create trigger artist_applications_max_3_genres_trg
  before insert or update of genre on public.artist_applications
  for each row execute function public.artists_max_3_genres();
