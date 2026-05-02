# Architettura

## Diagramma a blocchi

```
            ┌────────────────────────┐
            │      Browser           │
            └──────────┬─────────────┘
                       │  HTTPS
            ┌──────────▼─────────────┐
            │  Next.js (Vercel)      │
            │  - App Router          │
            │  - Server Actions      │
            │  - Route Handlers      │
            │  - Middleware (RBAC)   │
            └────┬───────────────┬───┘
                 │               │
        ┌────────▼─────┐   ┌─────▼────────┐
        │   Supabase   │   │    Resend    │
        │  Postgres    │   │  Email API   │
        │  Auth (RLS)  │   └──────────────┘
        │  Storage     │
        └──────────────┘
```

## Principi architetturali

1. **Server-first**: tutta la lettura del DB avviene nei Server Components con il client di `lib/supabase/server.ts`. I componenti client esistono solo dove c'è interattività (form, calendario, animazioni).
2. **Validazione condivisa**: gli schemi Zod in `lib/validators/schemas.ts` sono importati sia dai form client (resolver `react-hook-form`) sia dalle Server Actions (re-validazione).
3. **RBAC stratificato**:
   - `middleware.ts` blocca le route protette se l'utente non è loggato e ne valuta il ruolo per i prefissi `/admin` e `/dashboard`
   - `lib/auth/guards.ts` (`requireUser`, `requireRole`) viene chiamato anche dentro le pagine come secondo livello di sicurezza
   - Le Server Actions verificano nuovamente i permessi
   - Le RLS sul DB sono il backup definitivo
4. **Nessuna chiave service-role nel client**. Solo `lib/supabase/server.ts → createAdminClient()` la usa, e questa funzione è importata esclusivamente in file `_actions.ts` o route handlers.

## Flussi principali

### Lead di booking
1. Utente loggato (`role = user`) apre `/artisti/[slug]`
2. Compila `<ArtistRequestForm />` (validazione Zod client)
3. Submit → Server Action `submitLead` (`app/(user)/artisti/[slug]/_actions.ts`)
4. Action: re-valida con Zod → verifica auth → cerca artista → inserisce `leads` con admin client → in parallelo invia 2 email via Resend (artista + admin)
5. Lead visibile in `/admin/leads` (admin) e `/dashboard/leads` (artista)

### Candidatura artista
1. Form pubblico `/candidatura-artista` → Server Action `submitArtistApplication`
2. Insert in `artist_applications` (status `pending`) + email applicante + email admin
3. Admin in `/admin/artisti` → bottone "Approva" → Server Action `approveApplication`:
   - `auth.admin.inviteUserByEmail` (Supabase invia magic link)
   - `profiles.role = artist`
   - Insert riga `artists` con `status = approved`
4. L'artista riceve magic link, accede a `/dashboard`, completa profilo e segna disponibilità

### Promozione superadmin
- Trigger Postgres `handle_new_user`: alla creazione di un nuovo `auth.users`, se `email` coincide con la GUC `app.superadmin_email`, il profilo viene creato con `role = 'superadmin'`.
- Setup: `alter database postgres set app.superadmin_email = 'tua@email.com';`

## Strategia di rendering

| Pagina | Tipo | Dati |
|--------|------|------|
| `/` | Server Component | Eventi top-level per categoria |
| `/eventi` | Server Component | Lista eventi (filtro per categoria) |
| `/eventi/[slug]` | Server Component | Singolo evento |
| `/artisti` | Server Component | Lista artisti approvati |
| `/artisti/[slug]` | Server Component (con form client) | Profilo + calendario read-only + form |
| `/admin/*` | Server Component (con widget client) | Tabelle CRUD |
| `/dashboard/*` | Server Component (con form/calendario client) | Profilo artista + calendario |

`revalidatePath` viene chiamato dopo ogni Server Action di scrittura per invalidare le pagine pubbliche correlate.
