-- =========================================
-- N'arte — 0037 Format reali (NaJam / NuLive / NaBand / NaCena)
-- =========================================
-- Sostituisce i 3 format segnaposto creati da 0032_seed_formats_blog.sql
-- ("Format 1/2/3", tagline "Placeholder — definire titolo") con i 4 format
-- reali di N'arte. Idempotente.
--
-- Mappatura sulle card di /format:
--   title       → titolo grande in display
--   description → testo sotto il titolo
--   tagline     → didascalia sotto il filetto (la formazione)
--   order_index → determina il colore, assegnato ciclicamente sui 4 gradienti
--                 definiti in app/(public)/format/page.tsx (CARD_GRADIENTS):
--                 0 blu, 1 blu chiaro, 2 navy, 3 corallo.
--
-- I segnaposto non sono referenziati da nessuna FK: si possono rimuovere.

delete from public.formats
where slug in ('format-live-club', 'format-live-festival', 'format-live-brand');

insert into public.formats
  (slug, title, tagline, description, icon, order_index, details, published)
values
  (
    'najam',
    'NaJam',
    'Per due persone',
    'Il duo. Voce e strumentale: due elementi per i format più intimi.',
    'Music2',
    0,
    '{"bullets": []}',
    true
  ),
  (
    'nulive',
    'NuLive',
    'Per tre persone',
    'Il trio. Per i format più cantautorali o groove, un suono pieno.',
    'Mic',
    1,
    '{"bullets": []}',
    true
  ),
  (
    'naband',
    'NaBand',
    'Per quattro o + persone',
    'Quattro o più elementi. L''energia della band, per i palchi più grandi.',
    'Music',
    2,
    '{"bullets": []}',
    true
  ),
  (
    'nacena',
    'NaCena',
    'Cene aperte a più artisti',
    'Il momento di unione: ci si riunisce, ci si esibisce, si creano contenuti.',
    'Utensils',
    3,
    '{"bullets": []}',
    true
  )
on conflict (slug) do update set
  title       = excluded.title,
  tagline     = excluded.tagline,
  description = excluded.description,
  icon        = excluded.icon,
  order_index = excluded.order_index,
  published   = excluded.published,
  updated_at  = now();
