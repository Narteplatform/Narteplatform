-- =========================================
-- N'arte — 0035 organizers.is_private
-- Distingue l'organizzatore privato dalla struttura.
-- false = struttura (default), true = privato.
-- Idempotente.
-- =========================================

alter table public.organizers
  add column if not exists is_private boolean not null default false;

comment on column public.organizers.is_private is
  'true = organizzatore privato, false = struttura. Impostato dal profilo organizzatore.';
