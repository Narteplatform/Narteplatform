-- 0007_event_cover_home.sql
-- Aggiunge una seconda immagine cover per evento, ottimizzata per la card
-- in home/listing (3:4 portrait). cover_image rimane usata come hero
-- orizzontale 16:9 nella pagina singola.

alter table public.events
  add column if not exists cover_image_home text;

comment on column public.events.cover_image_home is
  'Immagine portrait 3:4 ottimizzata per la card homepage / listing eventi.';
