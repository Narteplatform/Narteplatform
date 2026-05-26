-- =========================================
-- N'arte — Feedback organizzatori -> artisti
-- =========================================
-- Solo organizzatori possono lasciare feedback a artisti DOPO
-- evento confermato e con event_date < oggi.
-- Un feedback per booking. Superadmin può nascondere/eliminare.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests(id) on delete cascade,
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_request_id)
);

create index if not exists feedback_artist_idx on public.feedback(artist_id);
create index if not exists feedback_organizer_idx on public.feedback(organizer_id);
create index if not exists feedback_created_idx on public.feedback(created_at desc);
create index if not exists feedback_rating_idx on public.feedback(rating);

alter table public.feedback enable row level security;

drop policy if exists "feedback organizer write own" on public.feedback;
create policy "feedback organizer write own"
  on public.feedback for insert
  with check (
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.user_id = auth.uid()
    )
    and exists (
      select 1 from public.booking_requests b
      where b.id = booking_request_id
        and b.organizer_id = organizer_id
        and b.artist_id = artist_id
        and b.status = 'confermata'
        and b.event_date < current_date
    )
  );

drop policy if exists "feedback read involved" on public.feedback;
create policy "feedback read involved"
  on public.feedback for select
  using (
    (
      not hidden
      and (
        exists (select 1 from public.artists a where a.id = artist_id and a.user_id = auth.uid())
        or exists (select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid())
      )
    )
    or public.is_superadmin(auth.uid())
  );

drop policy if exists "feedback superadmin all" on public.feedback;
create policy "feedback superadmin all"
  on public.feedback for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));
