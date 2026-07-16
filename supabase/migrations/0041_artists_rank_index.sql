-- =========================================
-- N'arte — Indice per il ranking per piano
-- =========================================
-- Regge l'ordinamento del roster pubblico (app/(user)/artisti/page.tsx) e
-- della ricerca (app/api/search/route.ts), entrambi:
--     where status = 'approved' order by tier desc, stage_name asc
--
-- Nessuna colonna di peso: artist_tier_enum è dichiarato ('free','pro','max')
-- e Postgres ordina gli enum per ordine di dichiarazione, quindi `tier desc`
-- è già max → pro → free.
--
-- Idempotente.

create index if not exists artists_rank_idx
  on public.artists (tier desc, stage_name asc)
  where status = 'approved';

comment on index public.artists_rank_idx is
  'Ranking per piano del roster pubblico. Parziale su status=approved: gli artisti pending/rejected non compaiono mai in lista.';
