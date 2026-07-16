-- =========================================
-- N'arte — Limiti del bucket artist-videos
-- =========================================
-- Allinea il bucket ai limiti applicativi di lib/upload/video-limits.ts:
-- 50MB per file e soli MIME riproducibili in <video>.
-- Idempotente.
--
-- PERCHÉ 50MB E NON 500MB
-- Il file_size_limit di un bucket non può superare il limite globale del
-- progetto Supabase. Sul piano FREE quel limite è 50MB ed è FISSO: non è
-- alzabile né da qui né dal dashboard. Su questo progetto (Free) 500MB non
-- sono raggiungibili.
--
-- PER PASSARE A 500MB, nell'ordine:
--   1. portare il progetto Supabase al piano Pro;
--   2. Dashboard → Storage → Settings → "Upload file size limit" → 500 MB → Save
--      (NON automatizzabile via SQL: se si salta questo passo, l'update qui
--       sotto fallisce con "The global file size limit is set to 50 MB...");
--   3. MAX_VIDEO_BYTES = 500 * 1024 * 1024 in lib/upload/video-limits.ts;
--   4. rieseguire questo file con 524288000 al posto di 52428800.
--
-- NOTA SU allowed_mime_types
-- È l'ultima difesa lato server sul formato: il MIME dichiarato al sign
-- endpoint è quello che il client afferma, quello reale arriva solo col body.
-- video/quicktime è escluso di proposito — i .mov da iPhone sono quasi sempre
-- HEVC/H.265, che Chrome, Firefox e Android non riproducono, e Supabase
-- Storage non transcodifica.

update storage.buckets
set
  file_size_limit    = 52428800, -- 50MB, allineato a MAX_VIDEO_BYTES
  allowed_mime_types = array['video/mp4', 'video/webm']
where id = 'artist-videos';

-- Nessuna policy su storage.objects per questo bucket, ed è voluto:
--   INSERT → signed upload URL generato con service role (bypassa RLS), con il
--            gate di ruolo in app/api/upload/video/route.ts;
--   SELECT → il bucket è public: la lettura passa da /object/public/ (no RLS);
--   DELETE → deleteArtistVideo() in app/(artist)/dashboard/_actions.ts, service role.
-- Una policy INSERT aperta a `auth.uid() is not null` darebbe a ogni account
-- registrato (organizzatori, utenti) una scrittura sul bucket.
