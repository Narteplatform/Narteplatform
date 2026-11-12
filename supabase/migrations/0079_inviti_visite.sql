-- 0079 — «Invita un artista»: quante persone entrano da ciascun link
--
-- CONTESTO
-- Il pannello /admin/inviti mostra, per ogni artista, il percorso completo del
-- suo link: quanti lo hanno aperto, quanti hanno cliccato «Invia la
-- candidatura», quanti si sono candidati, quanti sono entrati, quanti hanno
-- pagato e quanti mesi di Pro ha guadagnato. Candidature, ingressi, pagamenti
-- e premi sono già in artist_invites / invite_rewards (0078). Mancano le
-- aperture del link: questa migration le registra.
--
-- PRIVACY — stesso schema delle statistiche del profilo (0046):
--   - nessun IP, nessun user_id, nessun cookie in tabella: solo un hash
--     sha256(segreto || giorno || IP || "invito:" || codice), calcolato dal
--     server con VISIT_HASH_SALT, che cambia ogni giorno;
--   - una riga per (link, giorno, visitatore, tipo): si contano visitatori
--     unici al giorno, non pagine viste;
--   - esclusi chi possiede il link e i superadmin (lo fa la RPC, non il client).
--
-- Due tipi di evento:
--   visita → la pagina /invito/{codice} aperta in un browser vero (beacon
--            dopo 2 secondi di permanenza: i bot e le anteprime di WhatsApp
--            non eseguono JavaScript);
--   clic   → il pulsante «Invia la candidatura» (/invito/{codice}/vai).
--
-- Additiva e idempotente: rieseguirla non cambia nulla. Non modifica né
-- cancella righe esistenti. Richiede la 0078 (invite_codes).
-- Tabella scritta SOLO dalla RPC con la service role: RLS attiva e nessun
-- privilegio ad anon/authenticated.

-- =========================================
-- 1. Aperture del link
-- =========================================
create table if not exists public.invite_link_visits (
  code_user_id   uuid not null references public.invite_codes(user_id) on delete cascade,
  visited_on     date not null,
  visitor_hash   text not null check (char_length(visitor_hash) = 64),
  kind           text not null check (kind in ('visita', 'clic')),
  first_seen_at  timestamptz not null default now(),
  primary key (code_user_id, visited_on, visitor_hash, kind)
);

create index if not exists invite_link_visits_giorno_idx
  on public.invite_link_visits (visited_on);

comment on table public.invite_link_visits is
  'Aperture del link «Invita un artista»: una riga per (link, giorno Europe/Rome, visitatore pseudonimo, tipo). Nessun IP, nessun user_id. Scritta SOLO da inviti_registra_visita().';

alter table public.invite_link_visits enable row level security;
revoke all on table public.invite_link_visits from anon, authenticated;

-- =========================================
-- 2. Registrare un'apertura
-- =========================================
-- Restituisce true se ha contato un visitatore nuovo per la giornata.
create or replace function public.inviti_registra_visita(
  p_code            text,
  p_visitor_hash    text,
  p_kind            text,
  p_viewer_user_id  uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid;
  v_inserted integer;
begin
  if p_code is null or p_visitor_hash is null or char_length(p_visitor_hash) <> 64 then
    return false;
  end if;
  if p_kind not in ('visita', 'clic') then
    return false;
  end if;

  select c.user_id
    into v_owner
    from public.invite_codes c
   where c.code = p_code
     and c.disabled_at is null;
  if not found then
    return false;
  end if;

  if p_viewer_user_id is not null then
    -- Chi apre il proprio link per provarlo non è un invitato.
    if v_owner = p_viewer_user_id then
      return false;
    end if;
    -- Il team che controlla un link non è un invitato.
    if public.is_superadmin(p_viewer_user_id) then
      return false;
    end if;
  end if;

  insert into public.invite_link_visits (code_user_id, visited_on, visitor_hash, kind)
  values (v_owner, (now() at time zone 'Europe/Rome')::date, p_visitor_hash, p_kind)
  on conflict (code_user_id, visited_on, visitor_hash, kind) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

revoke all on function public.inviti_registra_visita(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.inviti_registra_visita(text, text, text, uuid) to service_role;

-- =========================================
-- 3. Conteggi per il pannello
-- =========================================
-- Una riga per link con almeno un'apertura. I link senza aperture non
-- compaiono: il pannello li considera a zero.
create or replace function public.inviti_conteggi_visite()
returns table (
  user_id       uuid,
  visite        bigint,
  clic          bigint,
  visite_30gg   bigint,
  clic_30gg     bigint,
  ultima_visita date
)
language sql
stable
security definer
set search_path = public
as $$
  select v.code_user_id,
         count(*) filter (where v.kind = 'visita'),
         count(*) filter (where v.kind = 'clic'),
         count(*) filter (where v.kind = 'visita'
                            and v.visited_on > (now() at time zone 'Europe/Rome')::date - 30),
         count(*) filter (where v.kind = 'clic'
                            and v.visited_on > (now() at time zone 'Europe/Rome')::date - 30),
         max(v.visited_on)
    from public.invite_link_visits v
   group by v.code_user_id;
$$;

revoke all on function public.inviti_conteggi_visite() from public, anon, authenticated;
grant execute on function public.inviti_conteggi_visite() to service_role;
