# Auth & Ruoli

> Allineato al codice il 13/11/2026. La versione precedente descriveva solo
> email + password, tre ruoli e il logout verso `/`: non era più vero.

## Provider

Supabase Auth con:

- **email + password** (`/login`, `/register`, recupero da `/recupero-password` → `/reset-password`);
- **Google OAuth** (`components/forms/OAuthButtons.tsx`, oggi l'unico provider esterno):
  ritorno su `/auth/callback`, che scambia il codice, gestisce la richiesta di accesso
  come organizzatore (`?ruolo=organizer`, con eventuale attesa di approvazione su
  `/in-attesa-di-approvazione`) e passa da `/post-login` per l'instradamento per ruolo;
- **invito via email** (`auth.admin.inviteUserByEmail`) per gli account creati dal team
  (artisti approvati, consulenti, superadmin delegati).

Gli account creati dal team non accettano i documenti legali alla registrazione: li
intercetta il **gate legale** del middleware (`/accetta-condizioni`, cookie di versione).

## Ruoli

Cinque (`profiles.role`):

| Ruolo | Area | Accesso |
|-------|------|---------|
| `user` (default) | — | Sito pubblico, catalogo `/artisti`, richiesta booking, preferiti. |
| `artist` | `/dashboard` | Profilo (anche multiplo), calendario e slot, richieste, chat, consulenze, statistiche, abbonamento. |
| `organizer` | `/organizzatore` | Strutture, richieste, trattativa in chat, calendario date confermate, recensioni. Può richiedere approvazione (migration 0071). |
| `consultant` | `/admin/consulenza` | Solo consulenze e `/admin/profilo`: il middleware rimanda ogni altro `/admin/*` a `/admin/consulenza`. |
| `superadmin` | `/admin` | Tutto. Il **root** (`SUPERADMIN_EMAIL`) vede anche `/admin/impostazioni`; gli altri superadmin solo le sezioni delegate in `admin_page_permissions`. |

## Matrice permessi

Matrice storica sulle risorse di base (organizzatore e consulente non compaiono: le loro
aree sono descritte sopra e protette da middleware, guard e RLS).

| Risorsa | Anon | User | Artist | Superadmin |
|---------|------|------|--------|------------|
| Eventi (lettura) | ✅ | ✅ | ✅ | ✅ |
| Eventi (CRUD) | ❌ | ❌ | ❌ | ✅ |
| Artisti approvati (lettura) | Solo nome+slug pubblico tramite filtri | ✅ | ✅ | ✅ |
| Lista `/artisti` (vetrina pubblica; il form di booking nel dettaglio richiede login) | ✅ | ✅ | ✅ | ✅ |
| Profilo artista (write) | ❌ | ❌ | Solo proprio | ✅ |
| Calendario disponibilità (write) | ❌ | ❌ | Solo proprio | ✅ |
| Creare lead | ❌ | ✅ | ✅ | ✅ |
| Leggere lead | ❌ | Solo i propri | I propri ricevuti | ✅ |
| Candidatura artista (insert) | ✅ | ✅ | ✅ | ✅ |
| Approvare candidatura | ❌ | ❌ | ❌ | ✅ |
| Form contatti | ✅ | ✅ | ✅ | ✅ |
| Lettura messaggi contatti | ❌ | ❌ | ❌ | ✅ |

## Layer di sicurezza (in ordine di esecuzione)

1. **`middleware.ts`**: redirect `/login` se non autenticato su `/admin`, `/dashboard`, `/organizzatore`, `/__health`; redirect `/` se il ruolo non è ammesso nell'area (consulente → `/admin/consulenza`); gate legale; permessi per pagina dei superadmin non root.
2. **`lib/auth/guards.ts`** in cima alle pagine server (`requireUser`, `requireRole`, `requireOrganizer`).
3. **Server Actions**: ogni action verifica nuovamente auth + ruolo prima di toccare il DB.
4. **RLS Postgres**: ultima linea di difesa. Anche se i layer precedenti fallissero, il DB rifiuta.

## Promozione superadmin

⚠️ Su questo progetto il GUC qui sotto non è impostato: usare `npm run db:promote-admin` (vedi AGENTS.md).

Trigger `handle_new_user` in `supabase/migrations/0001_init.sql`:

```sql
if _superadmin is not null and lower(new.email) = lower(_superadmin) then
  _role := 'superadmin';
end if;
```

`_superadmin` viene letto da `current_setting('app.superadmin_email', true)`. Per impostarlo:

```sql
alter database postgres set app.superadmin_email = 'tua@email.com';
```

## Logout

POST a `/logout` (`app/(auth)/logout/route.ts`) → `supabase.auth.signOut()` → cancellazione dei
cookie legati alla persona (versione legale accettata, «benvenuto» già visto, profilo artista attivo:
altrimenti su un computer condiviso il successivo utente li erediterebbe) → redirect 303 a **`/login`**.

## Invitare un artista manualmente

1. Admin va in `/admin/artisti/new`
2. Inserisce email + dati base
3. La Server Action `createArtistManual` chiama `auth.admin.inviteUserByEmail` con `redirectTo = /login`
4. L'artista riceve un magic link, atterra su `/login`, definisce password e accede a `/dashboard`
