-- =========================================
-- N'arte — Log invii email transazionali
-- =========================================
-- Tabella email_log per supervisione admin (Resend).
-- Idempotente.

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_addresses text[] not null,
  subject text not null,
  template text,
  status text not null check (status in ('sent','failed','skipped')),
  provider_id text,
  error text,
  meta jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists email_log_sent_at_idx on public.email_log(sent_at desc);
create index if not exists email_log_status_idx on public.email_log(status);
create index if not exists email_log_template_idx on public.email_log(template);

alter table public.email_log enable row level security;

drop policy if exists "email_log superadmin all" on public.email_log;
create policy "email_log superadmin all"
  on public.email_log for all
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));
