-- 0049 — Registro dei consensi
--
-- CONTESTO
-- Prima di questa migration N'arte non raccoglieva né conservava alcun
-- consenso. I moduli pubblici — registrazione, candidatura artista, contatti —
-- non avevano nessuna casella di accettazione, e la tabella `profiles` ha solo
-- id, ruolo, nome e avatar: nessun posto dove annotare che qualcuno avesse
-- accettato qualcosa.
--
-- PERCHÉ UNA TABELLA E NON DUE COLONNE SU `profiles`
-- Il consenso non è uno stato, è un evento datato. Quello che serve dimostrare
-- non è "questa persona ha accettato", ma "questa persona ha accettato QUESTA
-- versione del documento in QUESTO momento". Con una colonna booleana, il
-- giorno in cui i termini cambiano si perde la traccia di cosa fosse stato
-- accettato prima. Con una riga per evento, lo storico resta.
--
-- COSA NON C'È DENTRO, DI PROPOSITO
-- Nessun indirizzo IP, nessun user agent. Sono i due campi che di solito si
-- aggiungono "per prova", e sono anche dati personali ulteriori da conservare,
-- proteggere e cancellare. La coppia utente + istante + versione basta a
-- dimostrare il consenso senza raccogliere altro.
--
-- Additiva e ripetibile: non tocca né legge alcuna tabella esistente.

create table if not exists public.user_consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('privacy', 'termini', 'marketing')),
  version     text not null,
  accepted    boolean not null default true,
  accepted_at timestamptz not null default now()
);

comment on table public.user_consents is
  'Storico dei consensi. Una riga per evento: il consenso è datato e legato a una versione del documento, non è uno stato sovrascrivibile.';
comment on column public.user_consents.version is
  'Valore di LEGAL_VERSION in lib/legal/content.ts al momento dell''accettazione.';
comment on column public.user_consents.accepted is
  'false registra il RITIRO di un consenso dato in precedenza — rilevante per il marketing, che si può revocare.';

create index if not exists user_consents_user_idx
  on public.user_consents (user_id, kind, accepted_at desc);

alter table public.user_consents enable row level security;

-- Ognuno vede i propri consensi: serve a mostrarli nell'area personale e a
-- rispondere a una richiesta di accesso ai dati.
drop policy if exists "consents: leggi i propri" on public.user_consents;
create policy "consents: leggi i propri"
  on public.user_consents for select
  using (auth.uid() = user_id);

-- I superadmin li leggono tutti: senza, non si potrebbe dimostrare nulla in
-- caso di contestazione.
drop policy if exists "consents: superadmin legge tutto" on public.user_consents;
create policy "consents: superadmin legge tutto"
  on public.user_consents for select
  using (public.is_superadmin(auth.uid()));

-- Nessuna policy di INSERT, UPDATE o DELETE: si scrive solo da server con
-- service role. Un consenso che l'utente potesse scrivere da sé non
-- dimostrerebbe niente, e uno che potesse cancellare varrebbe ancora meno.

-- ---------------------------------------------------------------------------
-- Consenso al momento della registrazione.
--
-- La registrazione avviene lato client con `supabase.auth.signUp`, che accetta
-- metadati liberi in `options.data`. La trigger esistente `handle_new_user` li
-- legge già per il ruolo; qui si aggiunge la registrazione del consenso, così
-- non serve una seconda chiamata dal client — che potrebbe fallire, lasciando
-- un account creato senza traccia dell'accettazione.
-- ---------------------------------------------------------------------------
create or replace function public.record_signup_consents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version text;
begin
  v_version := coalesce(new.raw_user_meta_data ->> 'legal_version', 'sconosciuta');

  -- Privacy e termini si accettano insieme, con la stessa casella.
  if coalesce((new.raw_user_meta_data ->> 'accepted_terms')::boolean, false) then
    insert into public.user_consents (user_id, kind, version)
    values (new.id, 'privacy', v_version), (new.id, 'termini', v_version);
  end if;

  -- Il marketing è separato e facoltativo: si registra solo se dato.
  if coalesce((new.raw_user_meta_data ->> 'accepted_marketing')::boolean, false) then
    insert into public.user_consents (user_id, kind, version)
    values (new.id, 'marketing', v_version);
  end if;

  return new;
end;
$$;

-- Trigger separata da `handle_new_user` invece che fusa dentro: quella governa
-- il ruolo, ed è già stata ridefinita tre volte (0008, 0009, 0019). Tenerle
-- distinte evita che la prossima riscrittura del ruolo si porti via la
-- registrazione dei consensi senza che nessuno se ne accorga.
drop trigger if exists on_auth_user_created_consents on auth.users;
create trigger on_auth_user_created_consents
  after insert on auth.users
  for each row execute function public.record_signup_consents();
