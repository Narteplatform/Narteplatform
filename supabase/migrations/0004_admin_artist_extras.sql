-- =========================================
-- N'arte — extra columns per admin/artist UX
-- =========================================
-- - events.ticket_url   : link biglietti
-- - leads.tags          : etichette libere per gestione lead
-- - artists.videos      : URL video (es. YouTube/Vimeo) per il profilo artista
-- Idempotente.

alter table public.events
  add column if not exists ticket_url text;

alter table public.leads
  add column if not exists tags text[] not null default '{}';

alter table public.artists
  add column if not exists videos text[] not null default '{}';

create index if not exists leads_tags_idx on public.leads using gin (tags);
