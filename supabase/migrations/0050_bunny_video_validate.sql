-- =========================================
-- N'arte — Validazione dei vincoli di 0050 (passo separato)
-- =========================================
-- Da eseguire DOPO 0050_bunny_video.sql, e dopo aver letto l'esito di questi
-- tre controlli. Ognuno deve restituire 0.
--
--   select count(*) from public.artist_videos where provider not in ('supabase','bunny');
--   select count(*) from public.artist_videos where playback_state not in ('processing','ready','failed');
--   select count(*) from public.artist_videos
--     where not ((provider='supabase' and url is not null and storage_path is not null)
--             or (provider='bunny' and bunny_guid is not null));
--
-- Se uno non è 0, NON eseguire questo file: la riga va guardata prima.

alter table public.artist_videos validate constraint artist_videos_provider_chk;
alter table public.artist_videos validate constraint artist_videos_playback_chk;
alter table public.artist_videos validate constraint artist_videos_upload_chk;
alter table public.artist_videos validate constraint artist_videos_handle_chk;
