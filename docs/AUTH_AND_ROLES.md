# Auth & Ruoli

## Provider

Supabase Auth (email + password). Magic link via `auth.admin.inviteUserByEmail` per gli artisti approvati.

## Ruoli

| Ruolo | Accesso |
|-------|---------|
| `user` (default) | Sito pubblico + `/artisti`, `/artisti/[slug]`. Può creare lead. |
| `artist` | Tutto quanto sopra + `/dashboard` (profilo + calendario + leads ricevuti). |
| `superadmin` | Tutto + `/admin/*`. |

## Matrice permessi

| Risorsa | Anon | User | Artist | Superadmin |
|---------|------|------|--------|------------|
| Eventi (lettura) | ✅ | ✅ | ✅ | ✅ |
| Eventi (CRUD) | ❌ | ❌ | ❌ | ✅ |
| Artisti approvati (lettura) | Solo nome+slug pubblico tramite filtri | ✅ | ✅ | ✅ |
| Lista `/artisti` | ❌ (redirect login) | ✅ | ✅ | ✅ |
| Profilo artista (write) | ❌ | ❌ | Solo proprio | ✅ |
| Calendario disponibilità (write) | ❌ | ❌ | Solo proprio | ✅ |
| Creare lead | ❌ | ✅ | ✅ | ✅ |
| Leggere lead | ❌ | Solo i propri | I propri ricevuti | ✅ |
| Candidatura artista (insert) | ✅ | ✅ | ✅ | ✅ |
| Approvare candidatura | ❌ | ❌ | ❌ | ✅ |
| Form contatti | ✅ | ✅ | ✅ | ✅ |
| Lettura messaggi contatti | ❌ | ❌ | ❌ | ✅ |

## Layer di sicurezza (in ordine di esecuzione)

1. **`middleware.ts`**: redirect `/login` se non autenticato; redirect `/` se ruolo errato per `/admin` o `/dashboard`.
2. **`lib/auth/guards.ts`** in cima alle pagine server (`requireUser`, `requireRole`).
3. **Server Actions**: ogni action verifica nuovamente auth + ruolo prima di toccare il DB.
4. **RLS Postgres**: ultima linea di difesa. Anche se i layer precedenti fallissero, il DB rifiuta.

## Promozione superadmin

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

POST a `/logout` (route handler) → `supabase.auth.signOut()` → redirect a `/`.

## Invitare un artista manualmente

1. Admin va in `/admin/artisti/new`
2. Inserisce email + dati base
3. La Server Action `createArtistManual` chiama `auth.admin.inviteUserByEmail` con `redirectTo = /login`
4. L'artista riceve un magic link, atterra su `/login`, definisce password e accede a `/dashboard`
