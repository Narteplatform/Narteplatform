-- =========================================
-- N'arte — Prezzo definitivo booking confermate
-- =========================================
-- Aggiunge campi prezzo finale al booking. Workflow:
-- 1. Una parte propone -> popola final_price + final_price_proposed_by/at
-- 2. L'altra parte conferma -> popola final_price_confirmed_by/at
-- 3. Modifica successiva resetta confirmed_* e richiede nuova conferma.
-- Lato app: gated a status='confermata'.

alter table public.booking_requests
  add column if not exists final_price numeric(10,2),
  add column if not exists final_price_proposed_by uuid references public.profiles(id),
  add column if not exists final_price_proposed_at timestamptz,
  add column if not exists final_price_confirmed_by uuid references public.profiles(id),
  add column if not exists final_price_confirmed_at timestamptz;

create index if not exists booking_final_price_confirmed_idx
  on public.booking_requests(status)
  where final_price_confirmed_at is not null;
