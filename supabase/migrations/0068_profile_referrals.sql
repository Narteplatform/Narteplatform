-- 0068 — Segnalazioni del profilo alle strutture (piano Max)
--
-- CONTESTO
-- N'arte è una piattaforma promozionale: non partecipa alle trattative né ai
-- contratti. Col piano Max il Team SEGNALA il profilo dell'artista ad almeno
-- due strutture al mese (obbligo di mezzi, art. 9 delle condizioni di
-- abbonamento). La promessa ha tre parti che richiedono un registro:
--   * quantità: contare quante segnalazioni sono partite in ogni mese;
--   * trasparenza: l'artista vede a chi è stato segnalato e quando;
--   * rimedio: se per due mesi consecutivi restano sotto le due, l'artista può
--     chiedere una proroga di un mese o la cessazione con rimborso.
-- Oggi nulla è tracciato e nessuna email parte.
--
-- `profile_referrals` è il registro: una riga per ogni segnalazione, scritta
-- dal server nel momento dell'invio, con l'esito dell'email. `referral_optouts`
-- raccoglie chi non vuole più riceverne: si conserva solo l'hash sha256
-- dell'indirizzo (minuscolo), non l'indirizzo.
--
-- Additiva: nessuna tabella esistente viene toccata.

create table if not exists public.profile_referrals (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  artist_id       uuid not null references public.artists(id) on delete cascade,
  -- Chi del Team ha inviato. `set null`: se l'account viene cancellato la
  -- segnalazione resta nel registro.
  sent_by         uuid references auth.users(id) on delete set null,

  recipient_name  text not null,
  recipient_email text not null,
  -- Presenti solo se il destinatario è stato scelto fra i registrati.
  organizer_id    uuid references public.organizers(id) on delete set null,
  venue_id        uuid references public.venues(id) on delete set null,

  note            text check (note is null or char_length(note) <= 500),
  email_status    text not null default 'non_inviata'
                  check (email_status in ('inviata', 'non_inviata')),

  -- Mese di competenza, fuso Europe/Rome, formato 'YYYY-MM'.
  period_month    text not null check (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

create index if not exists profile_referrals_artist_idx
  on public.profile_referrals (artist_id);
create index if not exists profile_referrals_period_idx
  on public.profile_referrals (period_month);

alter table public.profile_referrals enable row level security;

-- Lettura: il Team e il proprietario dell'artista. Scrittura: solo il server
-- con la chiave di servizio.
drop policy if exists "profile_referrals_select_superadmin" on public.profile_referrals;
create policy "profile_referrals_select_superadmin"
  on public.profile_referrals for select
  using (public.is_superadmin(auth.uid()));

drop policy if exists "profile_referrals_select_owner" on public.profile_referrals;
create policy "profile_referrals_select_owner"
  on public.profile_referrals for select
  using (
    exists (
      select 1 from public.artists a
      where a.id = profile_referrals.artist_id
        and a.user_id = auth.uid()
    )
  );

-- Chi ha disattivato le segnalazioni. Nessuna policy: né anon né authenticated
-- la leggono o la scrivono, solo il server con la chiave di servizio.
create table if not exists public.referral_optouts (
  email_hash text primary key,
  created_at timestamptz not null default now()
);

alter table public.referral_optouts enable row level security;

-- La RLS è per riga: senza revoca, PostgREST esporrebbe comunque le tabelle
-- ai ruoli anon e authenticated (vedi 0046, 0056).
revoke all on public.profile_referrals from anon, authenticated;
grant select on public.profile_referrals to authenticated;

revoke all on public.referral_optouts from anon, authenticated;

notify pgrst, 'reload schema';
