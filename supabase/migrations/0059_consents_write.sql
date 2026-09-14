-- 0059 — Scrittura dei consensi: funzioni, gate di accettazione, moduli pubblici
--
-- CONTESTO
-- La 0049 ha creato il registro `user_consents` e la trigger che lo riempie al
-- momento della registrazione. Restano scoperti tre casi, e sono la maggioranza:
--
--   1. Gli account creati da un amministratore — TUTTI gli artisti approvati da
--      candidatura, i consulenti, i superadmin invitati. Non passano da
--      `signUp`, quindi la trigger non trova alcun metadato e non scrive nulla:
--      oggi nessun artista della piattaforma ha un consenso registrato.
--   2. Gli utenti già iscritti prima che i documenti esistessero. Nessuno di
--      loro ha mai accettato niente.
--   3. I moduli pubblici — contatti, candidatura, format, richiesta evento,
--      richiesta booking, consulenza — dove chi scrive non ha un account e
--      quindi non ha un `user_id` a cui agganciare una riga.
--
-- I primi due si risolvono con lo stesso strumento: una schermata di
-- accettazione che compare al primo accesso e registra il consenso di chi è già
-- dentro. Il terzo no, e si risolve diversamente — vedi la sezione 3.
--
-- Interamente additiva: nessuna colonna viene rimossa, nessun dato riscritto.

-- ===========================================================================
-- 1. Scrivere un consenso dalla sessione dell'utente
-- ===========================================================================
--
-- PERCHÉ UNA FUNZIONE E NON UNA POLICY DI INSERT
-- La 0049 non concede alcun INSERT su `user_consents`, e fa bene: un consenso
-- che l'interessato potesse scrivere a piacere non dimostrerebbe nulla. Ma il
-- consenso deve pur arrivare da un gesto suo. La via d'uscita è una funzione
-- `security definer` che scrive SOLO per `auth.uid()`: l'utente non sceglie per
-- chi si sta registrando il consenso, lo decide la sessione.
--
-- `set search_path = public` non è un vezzo: senza, una funzione con i
-- privilegi del proprietario può essere dirottata su tabelle omonime create in
-- uno schema che precede `public` nel path del chiamante.

create or replace function public.record_consent(
  p_kind     text,
  p_version  text,
  p_accepted boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'record_consent richiede una sessione autenticata';
  end if;

  -- Il vincolo di `kind` sta già sulla tabella: qui si fallisce prima e con un
  -- messaggio leggibile, invece di far risalire un errore di check constraint.
  if p_kind not in ('privacy', 'termini', 'marketing') then
    raise exception 'consenso di tipo sconosciuto: %', p_kind;
  end if;

  if coalesce(btrim(p_version), '') = '' then
    raise exception 'record_consent richiede la versione del documento accettato';
  end if;

  insert into public.user_consents (user_id, kind, version, accepted)
  values (v_user, p_kind, p_version, p_accepted);
end;
$$;

comment on function public.record_consent(text, text, boolean) is
  'Registra un consenso per l''utente in sessione. `p_accepted = false` registra il ritiro di un consenso dato prima (tipicamente il marketing).';

revoke all on function public.record_consent(text, text, boolean)
  from public, anon;
grant execute on function public.record_consent(text, text, boolean)
  to authenticated;

-- ===========================================================================
-- 2. Il gate di accettazione
-- ===========================================================================
--
-- PERCHÉ UNA COLONNA SU `profiles` SE ESISTE GIÀ IL REGISTRO
-- Sono due cose diverse e servono entrambe. `user_consents` è lo storico: ogni
-- accettazione, datata, per sempre. La colonna è lo stato corrente, e serve a
-- una domanda sola — "questa persona ha già accettato la versione in vigore?"
-- — che il middleware pone a OGNI navigazione nelle aree riservate.
--
-- Il middleware interroga già `profiles` con il service role per leggere il
-- ruolo. Aggiungere qui la versione accettata significa leggerla nella STESSA
-- query, a costo zero. Cercarla in `user_consents` vorrebbe dire una seconda
-- query, con ordinamento, a ogni caricamento di pagina di ogni utente: un
-- prezzo che si paga per sempre per un'informazione che cambia una volta
-- all'anno.
--
-- Lo storico resta la fonte di prova; la colonna è solo una scorciatoia di
-- lettura, e si ricostruisce dallo storico in qualunque momento.

alter table public.profiles
  add column if not exists legal_version_accepted text;

comment on column public.profiles.legal_version_accepted is
  'Ultima LEGAL_VERSION accettata. Se diversa da quella in vigore, il middleware devia su /accetta-condizioni. La prova resta in user_consents: questa colonna è una cache di lettura.';

-- Accettazione completa dei documenti, in un colpo solo e in transazione.
--
-- Perché non tre chiamate a `record_consent` dal codice applicativo: se la
-- seconda fallisse, resterebbe un utente con la privacy accettata e i termini
-- no, e — peggio — la colonna su `profiles` aggiornata o non aggiornata a
-- seconda di dove si è rotto. Qui o si scrive tutto o non si scrive niente.

create or replace function public.accept_legal_documents(
  p_version   text,
  p_marketing boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'accept_legal_documents richiede una sessione autenticata';
  end if;

  if coalesce(btrim(p_version), '') = '' then
    raise exception 'accept_legal_documents richiede la versione dei documenti';
  end if;

  insert into public.user_consents (user_id, kind, version, accepted)
  values (v_user, 'privacy', p_version, true),
         (v_user, 'termini', p_version, true);

  -- `null` significa "l'utente non si è espresso sul marketing in questa
  -- schermata": non è un rifiuto e non va registrato come tale. Solo un true o
  -- un false esplicito producono una riga.
  if p_marketing is not null then
    insert into public.user_consents (user_id, kind, version, accepted)
    values (v_user, 'marketing', p_version, p_marketing);
  end if;

  update public.profiles
     set legal_version_accepted = p_version
   where id = v_user;
end;
$$;

comment on function public.accept_legal_documents(text, boolean) is
  'Registra privacy + termini (e facoltativamente il marketing) e aggiorna la versione accettata su profiles. Usata dal gate /accetta-condizioni.';

revoke all on function public.accept_legal_documents(text, boolean)
  from public, anon;
grant execute on function public.accept_legal_documents(text, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Allineare la registrazione al gate.
--
-- Senza questo pezzo il risultato sarebbe assurdo: uno si registra spuntando la
-- casella, la trigger della 0049 scrive diligentemente le sue righe di
-- consenso, e alla prima pagina riservata il middleware legge una colonna
-- ancora vuota e lo manda ad accettare quello che ha appena accettato.
--
-- La trigger viene quindi ridefinita qui — non nella 0049 — perché solo a
-- questo punto la colonna esiste: la 0049 deve restare applicabile da sola.
--
-- ORDINE DELLE TRIGGER, dipendenza fragile e non dichiarata: entrambe sono
-- `after insert on auth.users` e Postgres le esegue in ordine alfabetico di
-- nome. `on_auth_user_created` (0001, crea il profilo) precede
-- `on_auth_user_created_consents` perché ne è un prefisso, quindi l'update qui
-- sotto trova la riga. Se un domani qualcuno rinominasse la prima, questo
-- update non troverebbe nulla e fallirebbe in silenzio — e l'unico effetto
-- visibile sarebbe un giro di troppo nella schermata di accettazione. È il
-- motivo per cui quella schermata deve saper riconoscere chi ha già accettato
-- e rimettersi in pari da sola, invece di limitarsi a riproporre il modulo.
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

    -- La cache che il middleware legge a ogni navigazione riservata.
    update public.profiles
       set legal_version_accepted = v_version
     where id = new.id;
  end if;

  -- Il marketing è separato e facoltativo: si registra solo se dato.
  if coalesce((new.raw_user_meta_data ->> 'accepted_marketing')::boolean, false) then
    insert into public.user_consents (user_id, kind, version)
    values (new.id, 'marketing', v_version);
  end if;

  return new;
end;
$$;

-- ===========================================================================
-- 3. Prova del consenso sui moduli pubblici
-- ===========================================================================
--
-- Chi compila il modulo contatti o si candida come artista non ha un account:
-- non c'è un `user_id` a cui legare una riga di `user_consents`.
--
-- PERCHÉ DUE COLONNE SULLE TABELLE ESISTENTI E NON UNA TABELLA A PARTE
-- La prova appartiene all'invio che giustifica. Sulla stessa riga vive e muore
-- con il dato che autorizza: quando la candidatura non approvata verrà
-- cancellata dopo dodici mesi, con lei se ne andrà la sua prova di consenso,
-- senza che nessuno debba ricordarsene. Una tabella separata avrebbe una
-- propria conservazione e prima o poi conterrebbe prove orfane — consensi
-- riferiti a dati che non esistono più, che è la forma peggiore di dato
-- personale: inutile da tenere e imbarazzante da spiegare.
--
-- Nessun default: le righe già presenti restano a `null`, che è la verità
-- (quel consenso non è stato raccolto). Riempirle con un valore inventato
-- sarebbe fabbricare una prova.

alter table public.contact_messages
  add column if not exists consent_version text,
  add column if not exists consent_at      timestamptz;

alter table public.leads
  add column if not exists consent_version text,
  add column if not exists consent_at      timestamptz;

alter table public.artist_applications
  add column if not exists consent_version text,
  add column if not exists consent_at      timestamptz;

alter table public.consultations
  add column if not exists consent_version text,
  add column if not exists consent_at      timestamptz;

comment on column public.contact_messages.consent_version is
  'LEGAL_VERSION mostrata accanto alla casella al momento dell''invio. null = riga anteriore alla raccolta del consenso.';
comment on column public.leads.consent_version is
  'LEGAL_VERSION mostrata accanto alla casella al momento dell''invio. null = riga anteriore alla raccolta del consenso.';
comment on column public.artist_applications.consent_version is
  'LEGAL_VERSION mostrata accanto alla casella al momento dell''invio. null = riga anteriore alla raccolta del consenso.';
comment on column public.consultations.consent_version is
  'LEGAL_VERSION mostrata accanto alla casella al momento dell''invio. null = riga anteriore alla raccolta del consenso.';

-- ---------------------------------------------------------------------------
-- Ricarica della cache dello schema di PostgREST.
--
-- Senza, le due funzioni nuove possono restare invisibili all'API finché
-- PostgREST non si riavvia: la prima chiamata a `record_consent` risponderebbe
-- "function not found" e sembrerebbe un errore del codice applicativo.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
