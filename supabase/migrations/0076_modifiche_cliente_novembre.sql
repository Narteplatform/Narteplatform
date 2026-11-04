-- 0076 — Modifiche cliente di novembre 2026
--
-- CONTESTO
-- Il cliente ha chiesto:
--   1. notifiche vere (campanella corallo + sezione Notifiche) per artisti,
--      organizzatori e superadmin, in tempo reale, con i messaggi di chat
--      raggruppati per conversazione come su Instagram;
--   2. che ogni profilo di un account Max sia autonomo, anche nel link al
--      calendario Google (iCal);
--   3. di vedere nel feedback anche QUALE profilo artista lo ha inviato;
--   4. di poter scrivere al team dalla pagina Consulente quando non ci sono slot;
--   5. di gestire da /admin/contenuti le tappe di «Chi siamo», con le foto.
--
-- Cosa fa:
--   - notifications: colonna ref_key (raggruppamento: una notifica non letta
--     per conversazione), indice per profilo, pubblicazione realtime. La RLS
--     della 0073 (user_id = auth.uid()) limita il realtime alle proprie righe.
--   - platform_feedback.artist_id: il profilo attivo al momento dell'invio.
--   - artist_calendar_feeds: un link iCal per profilo. NON si tocca
--     calendar_feeds: i link gia' collegati a Google continuano a funzionare.
--   - site_milestones: le tappe di Chi siamo, inizializzate con le 6 attuali
--     (solo se la tabella e' vuota).
--   - team_messages: i messaggi «scrivi al team» dalla pagina Consulente.
--
-- Additiva e idempotente: rieseguirla non cambia nulla. Non modifica ne'
-- cancella righe esistenti di nessuna tabella. Indipendente dalle altre.
-- Il codice e' gia' online e tollera ogni parte mancante.

-- =========================================
-- 1. Notifiche: raggruppamento, indice per profilo, realtime
-- =========================================
alter table public.notifications add column if not exists ref_key text;

-- Al massimo UNA notifica non letta per chiave (es. 'chat:<conversation_id>'):
-- i messaggi successivi aggiornano quella invece di aggiungerne altre.
create unique index if not exists notifications_user_ref_unread_uidx
  on public.notifications (user_id, ref_key)
  where read_at is null and ref_key is not null;

create index if not exists notifications_user_artist_idx
  on public.notifications (user_id, artist_id, created_at desc);

-- Lista completa (lette comprese) della pagina Notifiche.
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- =========================================
-- 2. Feedback: profilo artista che lo ha inviato
-- =========================================
alter table public.platform_feedback
  add column if not exists artist_id uuid references public.artists(id) on delete set null;

-- =========================================
-- 3. Calendario iCal per profilo
-- =========================================
create table if not exists public.artist_calendar_feeds (
  artist_id  uuid primary key references public.artists(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- 32 byte casuali in base64url: e' la «password» del link.
  token      text not null unique check (char_length(token) >= 32),
  created_at timestamptz not null default now()
);

alter table public.artist_calendar_feeds enable row level security;
-- Nessuna policy e nessun privilegio: legge e scrive solo la service role.
revoke all on table public.artist_calendar_feeds from anon, authenticated;

-- =========================================
-- 4. Tappe di «Chi siamo»
-- =========================================
create table if not exists public.site_milestones (
  id          uuid primary key default gen_random_uuid(),
  year_label  text not null default '' check (char_length(year_label) <= 20),
  date_label  text not null default '' check (char_length(date_label) <= 60),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1200),
  photo_url   text check (photo_url is null or char_length(photo_url) <= 1000),
  photo_alt   text not null default '' check (char_length(photo_alt) <= 200),
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

create index if not exists site_milestones_order_idx on public.site_milestones (order_index);

alter table public.site_milestones enable row level security;
-- Si legge e si scrive solo dal server (service role): la pagina pubblica
-- passa da una lettura in cache lato server, come site_settings.
revoke all on table public.site_milestones from anon, authenticated;

-- Le 6 tappe attuali (lib/content/milestones.ts), solo se la tabella e' vuota.
insert into public.site_milestones (year_label, date_label, title, description, photo_url, photo_alt, order_index)
select * from (values
  ('2018', '2018', 'Nasce N’arte',
   'Eduardo Castronuovo organizza la prima serata a Napoli con un gruppo di musicisti che nessuno aveva ancora fatto salire su un palco. La città era piena di talento e mancava chi lo facesse suonare. Da lì in poi, una data dopo l’altra.',
   '/milestones/2018-marechiaro.jpg', 'Il mare di Marechiaro, a Napoli, al tramonto', 10),
  ('', '', 'L’evento N’arte!',
   'Le serate firmate N’arte, dal format alla scelta degli artisti. Sono l’occasione in cui la community si ritrova e il pubblico scopre gli artisti del roster dal vivo.',
   '/milestones/2025-sunday-narte-brusco.jpg', 'Un artista N’arte sul palco durante una serata N’arte', 20),
  ('', '', 'Festival',
   'Dai locali ai festival, con line-up curate da N’arte per eventi più grandi, come i Capri Music Awards nella Piazzetta di Capri e Oktoberland all’Edenlandia.',
   '/milestones/2025-capri-music-awards.jpg', 'Il palco di un festival con artisti del roster N’arte', 30),
  ('', '', 'Aperture concerti',
   'Gli artisti del roster aprono i concerti di altri artisti. Per un emergente vuol dire suonare su un palco importante, davanti a un pubblico che altrimenti non incontrerebbe.',
   '/milestones/2024-capodanno-plebiscito.jpg', 'Il pubblico davanti al palco di un concerto', 40),
  ('', '', 'Partner artistico',
   'Locali e realtà che affidano a N’arte la loro programmazione musicale. Come la rassegna Sunday N’arte al Brusco: ogni domenica un artista diverso, e per chi suona una data fissa in calendario.',
   '/milestones/2025-oktoberland-edenlandia.jpg', 'Musica dal vivo in un locale partner di N’arte', 50),
  ('2026', '2026', 'N’arte diventa una piattaforma',
   'Otto anni di agenda, telefonate e passaparola diventano uno strumento: profili con video e disponibilità, richieste dirette dagli organizzatori, calendario condiviso. Quello che facevamo a mano per cento artisti, adesso lo può fare chiunque.',
   '/milestones/2026-piattaforma-narte.jpg', 'La piattaforma N’arte su desktop e mobile', 60)
) as v(year_label, date_label, title, description, photo_url, photo_alt, order_index)
where not exists (select 1 from public.site_milestones);

-- =========================================
-- 5. Messaggi al team (pagina Consulente)
-- =========================================
create table if not exists public.team_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  artist_id   uuid references public.artists(id) on delete set null,
  role        text not null check (role in ('artist', 'organizer')),
  subject     text not null check (char_length(subject) between 3 and 140),
  body        text not null check (char_length(body) between 10 and 4000),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references auth.users(id) on delete set null
);

create index if not exists team_messages_created_idx on public.team_messages (created_at desc);
create index if not exists team_messages_open_idx on public.team_messages (created_at desc) where handled_at is null;

alter table public.team_messages enable row level security;
-- Nessuna policy e nessun privilegio: scrive e legge solo la service role.
revoke all on table public.team_messages from anon, authenticated;
