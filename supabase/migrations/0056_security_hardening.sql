-- =============================================================================
-- N'arte — Chiusura dei privilegi di scrittura via PostgREST
-- =============================================================================
-- ⛔ FIX DI SICUREZZA. Da applicare appena possibile.
--
-- IL BUCO, IN UNA RIGA: RLS è row-level, non column-level. Una policy decide
-- QUALE RIGA puoi toccare, non QUALI COLONNE — e Supabase concede di default a
-- `authenticated` i privilegi di scrittura su tutto lo schema `public`.
--
-- È esattamente il problema che 0038_artists_column_hardening.sql ha già
-- diagnosticato e chiuso per `artists`. La stessa medicina non era mai stata
-- data alle altre tabelle, compresa quella che decide chi è amministratore.
--
-- Verificato sul database di produzione con un UPDATE su un id inesistente
-- (zero righe toccate): `artists` risponde "permission denied", `profiles` e
-- `booking_requests` lasciano passare il privilegio e si affidano alla sola RLS.
--
-- ┌─ profiles ─────────────────────────────────────────────────────────────┐
-- │ 0001_init.sql:49  create policy "profiles update self"                 │
-- │                     on public.profiles for update                      │
-- │                     using (auth.uid() = id);                           │
-- │                                                                        │
-- │ La riga è la propria, quindi la policy dice sì. Ma fra le colonne c'è  │
-- │ `role`. Chiunque si registri (la registrazione è aperta) può prendere  │
-- │ la anon key — che è pubblica, sta nel bundle del browser — e fare:     │
-- │                                                                        │
-- │   PATCH /rest/v1/profiles?id=eq.<proprio_id>  {"role":"superadmin"}    │
-- │                                                                        │
-- │ Da quell'istante middleware.ts, requireRole(), is_superadmin() e ogni  │
-- │ policy RLS lo riconoscono come amministratore: /admin, tutte le chat,  │
-- │ tutti i lead, cancellazione artisti, override dei piani.               │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- ┌─ booking_requests ─────────────────────────────────────────────────────┐
-- │ 0009:155  policy "booking_requests update involved" — senza with check │
-- │ Un organizzatore porta da sé una richiesta a 'confermata'. Il trigger  │
-- │ trg_sync_booking_availability propaga su artist_availability: la data  │
-- │ risulta occupata sul calendario pubblico senza che l'artista abbia mai │
-- │ accettato. Stesso discorso per final_price.                            │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- ⚠️ FALLISCE CHIUSO, ed è voluto. Verificato call-site per call-site: OGNI
-- scrittura su queste tabelle passa già da createAdminClient() (service role),
-- che ignora i grant. Nessuna scrittura parte dal browser — controllato su
-- tutti i file con "use client". Se un domani servisse una scrittura
-- client-side, il modo giusto è una RPC security definer, non riaprire qui.
--
-- Idempotente.
-- =============================================================================

-- =========================================
-- 1. profiles — la tabella che decide chi comanda
-- =========================================
-- Scrittura solo da service role:
--   app/(admin)/admin/artisti/_actions.ts     (role -> 'artist')
--   app/(admin)/admin/consulenza/_actions.ts  (role -> 'consultant')
--   app/(artist)/dashboard/_actions.ts        (avatar_url)
-- La lettura resta com'è: le policy di select non vengono toccate.
revoke insert, update, delete on public.profiles from anon, authenticated;

-- Secondo strato: il trigger. Il service role bypassa la RLS e i grant, ma NON
-- i trigger — quindi questo protegge anche da un errore interno, per esempio
-- una Server Action che un domani scrivesse `role` con un valore arrivato dal
-- client. `is_superadmin()` non si può usare qui: dentro un trigger scatenato
-- dal service role `auth.uid()` è null, e la funzione direbbe sempre no.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Il cambio di ruolo è ammesso solo fuori dalla sessione di un utente, cioè
  -- dal service role (dove auth.uid() è null) o da un job interno. Una sessione
  -- utente che tenti di cambiarsi il ruolo viene fermata qui.
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Il ruolo non è modificabile da questa sessione'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role_trg on public.profiles;
create trigger profiles_guard_role_trg
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- =========================================
-- 2. booking_requests — l'handshake a due
-- =========================================
-- Scrittura solo da service role:
--   app/(organizer)/organizzatore/_actions.ts  (accetta, conferma, annulla, rifiuta)
--   app/api/booking-request/route.ts           (crea)
--   lib/booking/_actions.ts                    (prezzo finale)
--   più la RPC accept_offer_v2, che è security definer.
revoke insert, update, delete on public.booking_requests from anon, authenticated;

-- =========================================
-- 3. Le altre tabelle scritte solo dal server
-- =========================================
-- Stesso ragionamento, stessa verifica: tutte le insert dei moduli pubblici
-- passano dalle Server Actions con service role, che applicano honeypot e
-- limitatore di frequenza (lib/security/honeypot.ts + rate-limit.ts).
-- Lasciare l'insert aperta a PostgREST significa offrire una porta di servizio
-- che salta entrambi: si può riempire `leads` senza passare da nessun freno.
revoke insert, update, delete on public.leads               from anon, authenticated;
revoke insert, update, delete on public.contact_messages    from anon, authenticated;
revoke insert, update, delete on public.artist_applications from anon, authenticated;
revoke insert, update, delete on public.consultations       from anon, authenticated;
revoke insert, update, delete on public.feedback            from anon, authenticated;
revoke insert, update, delete on public.conversations       from anon, authenticated;
revoke insert, update, delete on public.messages            from anon, authenticated;
revoke insert, update, delete on public.artist_availability from anon, authenticated;
revoke insert, update, delete on public.artist_default_slots from anon, authenticated;
revoke insert, update, delete on public.artist_date_slots   from anon, authenticated;
revoke insert, update, delete on public.artist_videos       from anon, authenticated;
revoke insert, update, delete on public.organizers          from anon, authenticated;
revoke insert, update, delete on public.venues              from anon, authenticated;
revoke insert, update, delete on public.events              from anon, authenticated;
revoke insert, update, delete on public.formats             from anon, authenticated;
revoke insert, update, delete on public.blog_posts          from anon, authenticated;
revoke insert, update, delete on public.genres              from anon, authenticated;

-- =========================================
-- VERIFICA — da eseguire subito dopo
-- =========================================
-- Deve restituire ZERO righe. Ogni riga che compare è una tabella su cui un
-- utente autenticato può ancora scrivere passando da PostgREST.
--
--   select table_name, grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public'
--      and grantee in ('anon','authenticated')
--      and privilege_type in ('INSERT','UPDATE','DELETE')
--    order by table_name, grantee;
--
-- Controprova applicativa, da fare dopo il deploy: registrare un utente di
-- prova, accedere, e verificare che il sito funzioni normalmente (profilo,
-- richiesta di booking, chat). Nessuna di queste operazioni passa dai grant
-- appena revocati.
