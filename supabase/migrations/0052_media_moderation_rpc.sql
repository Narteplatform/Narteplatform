-- =============================================================================
-- N'arte — Approvazione dei media: append atomico
-- =============================================================================
-- ADDITIVA: crea due funzioni e non tocca nessuna riga esistente.
--
-- PERCHÉ UNA FUNZIONE E NON UN UPDATE DAL TYPESCRIPT.
-- Approvare vuol dire aggiungere UN elemento a un array. Farlo dal server
-- significherebbe leggere l'array, appenderlo in memoria e riscriverlo intero:
-- una lettura andata storta — o due approvazioni contemporanee — riscriverebbe
-- una gallery amputata, ed è esattamente così che su questo progetto una
-- gallery è già stata svuotata una volta.
-- Qui l'array non viene MAI riscritto: l'operatore `||` appende dentro la
-- stessa istruzione, sotto il lock della riga. Non c'è nessun percorso in cui
-- queste funzioni possano produrre una colonna vuota.
--
-- ⚠️ DIPENDENZA: richiede 0051_media_moderation.sql.
-- =============================================================================

create or replace function public.approve_artist_media_submission(
  p_submission_id uuid,
  p_reviewer      uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.artist_media_submissions%rowtype;
begin
  select * into s
    from public.artist_media_submissions
   where id = p_submission_id
     and status = 'pending'
   for update;

  -- Già evasa (o inesistente): rientro innocuo, così un doppio click o un
  -- retry non producono un secondo append.
  if not found then
    return;
  end if;

  if s.target = 'gallery' then
    update public.artists
       set gallery = coalesce(gallery, '{}'::text[]) || s.url
     where id = s.artist_id
       and not (s.url = any (coalesce(gallery, '{}'::text[])));

  elsif s.target = 'audio_files' then
    update public.artists
       set audio_files = coalesce(audio_files, '[]'::jsonb)
                       || jsonb_build_array(
                            jsonb_build_object(
                              'url',   s.url,
                              'title', coalesce(s.title, '')
                            )
                          )
     where id = s.artist_id
       and not (
         coalesce(audio_files, '[]'::jsonb) @> jsonb_build_array(
           jsonb_build_object('url', s.url, 'title', coalesce(s.title, ''))
         )
       );

  elsif s.target = 'cover_image' then
    -- Scalare, non collezione: qui si sostituisce, ed è corretto — è "la foto
    -- del profilo". La precedente resta comunque sullo storage e in
    -- media_assets, quindi niente va perduto davvero.
    update public.artists
       set cover_image = s.url
     where id = s.artist_id;
  end if;

  update public.artist_media_submissions
     set status      = 'approved',
         reviewed_by = p_reviewer,
         reviewed_at = now()
   where id = p_submission_id;
end $$;

create or replace function public.reject_artist_media_submission(
  p_submission_id uuid,
  p_reviewer      uuid,
  p_note          text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.artist_media_submissions
     set status      = 'rejected',
         reviewed_by = p_reviewer,
         reviewed_at = now(),
         review_note = nullif(btrim(p_note), '')
   where id = p_submission_id
     and status = 'pending';
end $$;

-- Chi può approvare lo decide la server action (requireAdminPageAccess). Qui si
-- chiude la porta a chiunque altro: `security definer` senza questa revoca
-- sarebbe eseguibile da qualsiasi utente autenticato.
revoke all on function public.approve_artist_media_submission(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reject_artist_media_submission(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.approve_artist_media_submission(uuid, uuid)
  to service_role;
grant execute on function public.reject_artist_media_submission(uuid, uuid, text)
  to service_role;
