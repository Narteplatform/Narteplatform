-- =========================================
-- N'arte — Seed contenuti reali + artisti placeholder
-- Idempotente: rieseguibile in sicurezza grazie ai conflict su slug.
-- Eseguire via SQL editor Supabase o psql.
-- =========================================

-- =========================================
-- Eventi (5 ricavati da narteofficial.it)
-- =========================================
insert into public.events (title, slug, category, date, city, venue, price, cover_image, description, featured)
values
  (
    'Memorial Pino Daniele',
    'memorial-pino-daniele-2026',
    'music',
    '2026-03-19 21:00+01',
    'Napoli',
    'Teatro Augusteo',
    25,
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=70',
    'Una serata speciale dedicata alla memoria di Pino Daniele, con artisti emergenti e ospiti della scena napoletana.',
    true
  ),
  (
    'Capodanno 2025 in Piazza del Plebiscito',
    'capodanno-2025-plebiscito',
    'festivals',
    '2024-12-31 22:00+01',
    'Napoli',
    'Piazza del Plebiscito',
    0,
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=70',
    'Concertone di fine anno gratuito nel cuore di Napoli con la migliore selezione di artisti N''arte.',
    true
  ),
  (
    'Sunday N''arte al Brusco',
    'sunday-narte-al-brusco',
    'music',
    '2025-11-09 19:00+01',
    'Napoli',
    'Brusco Restaurant',
    15,
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=70',
    'Appuntamento settimanale con musica dal vivo e brunch. Ogni domenica un nuovo artista N''arte sul palco.',
    false
  ),
  (
    'Oktoberland Edenlandia',
    'oktoberland-edenlandia-2025',
    'festivals',
    '2025-10-09 18:00+02',
    'Napoli',
    'Edenlandia',
    10,
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=70',
    'Tre giorni di musica, birra e divertimento al parco divertimenti di Napoli. Line-up curata da N''arte.',
    false
  ),
  (
    'Capri Music Awards',
    'capri-music-awards-2025',
    'music',
    '2025-07-16 21:30+02',
    'Capri',
    'Piazzetta di Capri',
    0,
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1600&q=70',
    'Premio annuale alla scena musicale italiana emergente. Tre serate di concerti e premiazioni a Capri.',
    true
  )
on conflict (slug) do nothing;

-- =========================================
-- Artisti italiani di prova (8 record)
-- =========================================
insert into public.artists (stage_name, slug, bio, genre, city, cover_image, social_links, status)
values
  (
    'Marta Esposito',
    'marta-esposito',
    'Cantautrice napoletana classe 1998. Mescola pop e indie con liriche in italiano e dialetto.',
    array['pop','indie'],
    'Napoli',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@martaesposito","spotify":"https://open.spotify.com/"}'::jsonb,
    'approved'
  ),
  (
    'Luca Romano',
    'luca-romano',
    'Cantautore romano. Chitarra acustica e parole, eredità di De André e Dalla.',
    array['cantautore'],
    'Roma',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@lucaromano.music"}'::jsonb,
    'approved'
  ),
  (
    'Aria Mare',
    'aria-mare',
    'Voce jazz e soul partenopea. Repertorio tra standard americani e brani originali.',
    array['jazz','soul'],
    'Napoli',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@aria.mare"}'::jsonb,
    'approved'
  ),
  (
    'DJ Solis',
    'dj-solis',
    'Producer e DJ milanese. House melodica e set notturni nei migliori club italiani.',
    array['elettronica','house'],
    'Milano',
    'https://images.unsplash.com/photo-1571266028243-d220bc2b6cb1?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@djsolis","spotify":"https://open.spotify.com/"}'::jsonb,
    'approved'
  ),
  (
    'Federico Conte',
    'federico-conte',
    'Frontman della scena rock alternative bolognese. Live energetici e testi in italiano.',
    array['rock','alternative'],
    'Bologna',
    'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@federicoconte.band"}'::jsonb,
    'approved'
  ),
  (
    'Sara Greco',
    'sara-greco',
    'R&B e neo-soul con un timbro caldo. Originaria del Vomero, formata tra Napoli e Londra.',
    array['r&b','neo-soul'],
    'Napoli',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@saragreco.soul"}'::jsonb,
    'approved'
  ),
  (
    'Il Collettivo Sud',
    'il-collettivo-sud',
    'Sei elementi tra fiati e percussioni. World music e folk del Mediterraneo.',
    array['world','folk'],
    'Salerno',
    'https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@collettivosud"}'::jsonb,
    'approved'
  ),
  (
    'Vera Iovine',
    'vera-iovine',
    'Pop urban con influenze trap. Voce riconoscibile della nuova scena napoletana.',
    array['pop urban','trap'],
    'Napoli',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=70',
    '{"instagram":"@vera.iovine"}'::jsonb,
    'approved'
  )
on conflict (slug) do nothing;

-- =========================================
-- Collaborazioni (3 partner storici)
-- La tabella non ha unique su name, quindi inseriamo solo se mancante.
-- =========================================
insert into public.collaborations (name, logo_url, link, description, order_index)
select v.name, v.logo_url, v.link, v.description, v.order_index
from (values
  ('Edenlandia', null::text, 'https://www.edenlandia.it'::text,
    'Parco divertimenti storico di Napoli, partner di Oktoberland.'::text, 1),
  ('Brusco Restaurant', null::text, null::text,
    'Location della rassegna Sunday N''arte.'::text, 2),
  ('Comune di Capri', null::text, null::text,
    'Patrocinio dei Capri Music Awards.'::text, 3)
) as v(name, logo_url, link, description, order_index)
where not exists (
  select 1 from public.collaborations c where c.name = v.name
);
