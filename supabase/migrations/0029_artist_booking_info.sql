-- =========================================
-- N'arte — Booking information artisti (profilo esteso)
-- =========================================
-- Aggiunge colonne per la sezione "Booking information" del profilo
-- pubblico (price range, languages, gig length, what to expect, about,
-- personnel, set list, influences, setup requirements). Tutti i campi
-- sono editabili dall'artista in /dashboard/profilo-artista.

alter table public.artists
  add column if not exists price_range text,
  add column if not exists gig_min_minutes integer,
  add column if not exists gig_max_minutes integer,
  add column if not exists languages text[] not null default '{}',
  add column if not exists what_to_expect text,
  add column if not exists about_extended text,
  add column if not exists personnel jsonb not null default '[]'::jsonb,
  add column if not exists set_list text,
  add column if not exists influences text[] not null default '{}',
  add column if not exists setup_requirements text;

-- Vincoli soft: durata minuti positiva e plausibile
alter table public.artists
  drop constraint if exists artists_gig_min_minutes_check,
  drop constraint if exists artists_gig_max_minutes_check;
alter table public.artists
  add constraint artists_gig_min_minutes_check check (gig_min_minutes is null or gig_min_minutes between 0 and 1440),
  add constraint artists_gig_max_minutes_check check (gig_max_minutes is null or gig_max_minutes between 0 and 1440);
