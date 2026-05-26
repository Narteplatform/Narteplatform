-- =========================================
-- N'arte — Platform Feedback (artisti/organizzatori -> N'arte)
-- =========================================
-- Feedback testuale inviato dagli utenti della piattaforma
-- (artisti, organizzatori) AL team N'arte tramite la sezione
-- "Feedback" del rispettivo dashboard. Diverso dalle reviews
-- post-evento (tabella `feedback`), che sono organizzatore->artista.

create table if not exists public.platform_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.role_enum not null,
  category text not null default 'generale'
    check (category in ('generale', 'bug', 'suggerimento', 'altro')),
  subject text,
  body text not null check (char_length(body) between 10 and 4000),
  rating integer check (rating between 1 and 5),
  status text not null default 'new'
    check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists platform_feedback_user_idx on public.platform_feedback(user_id);
create index if not exists platform_feedback_created_idx on public.platform_feedback(created_at desc);
create index if not exists platform_feedback_status_idx on public.platform_feedback(status);
create index if not exists platform_feedback_role_idx on public.platform_feedback(role);

alter table public.platform_feedback enable row level security;

drop policy if exists "platform_feedback insert own" on public.platform_feedback;
create policy "platform_feedback insert own"
  on public.platform_feedback for insert
  with check (
    user_id = auth.uid()
    and role in ('artist', 'organizer')
  );

drop policy if exists "platform_feedback read own" on public.platform_feedback;
create policy "platform_feedback read own"
  on public.platform_feedback for select
  using (user_id = auth.uid() or public.is_superadmin(auth.uid()));

drop policy if exists "platform_feedback superadmin all" on public.platform_feedback;
create policy "platform_feedback superadmin all"
  on public.platform_feedback for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));
