-- =========================================
-- N'arte — Seed elenco generi completo
-- =========================================
-- Inserisce/aggiorna i generi standard mostrati nei filtri pubblici.
-- Idempotente: on conflict do nothing su unique(name).

insert into public.genres (name, order_index) values
  ('Afro',         10),
  ('Ambient',      20),
  ('Blues',        30),
  ('Classical',    40),
  ('Country',      50),
  ('Drum and Bass',60),
  ('Dubstep',      70),
  ('EDM',          80),
  ('Elettronica',  90),
  ('Flamenco',     100),
  ('Folk',         110),
  ('Funk',         120),
  ('Fusion',       130),
  ('Gospel',       140),
  ('Hip-Hop',      150),
  ('House',        160),
  ('Jazz',         170),
  ('Latin',        180),
  ('Metal',        190),
  ('Opera',        200),
  ('Pop',          210),
  ('Progressive',  220),
  ('R&B',          230),
  ('Rap',          240),
  ('Reggae',       250),
  ('Reggaeton',    260),
  ('Rock',         270),
  ('Ska',          280),
  ('Soul',         290),
  ('Swing',        300),
  ('Techno',       310),
  ('Trap',         320),
  ('World Music',  330)
on conflict (name) do nothing;
