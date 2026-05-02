# Database

Schema completo in `supabase/migrations/0001_init.sql`. Ogni tabella ha RLS attivo.

## Tabelle

### `profiles`
Estende `auth.users` con ruolo e dati pubblici.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | uuid PK | FK `auth.users.id` |
| `role` | enum | `superadmin` / `artist` / `user` (default `user`) |
| `full_name` | text | |
| `avatar_url` | text | |
| `created_at` | timestamptz | |

**RLS**: lettura self + lettura per superadmin; update solo self. Trigger `on_auth_user_created` crea il profilo automaticamente.

### `artists`
Roster degli artisti.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | uuid PK | |
| `user_id` | uuid | FK `auth.users` (nullable per artisti senza account) |
| `stage_name` | text | |
| `slug` | text unique | |
| `bio`, `city`, `cover_image` | text | |
| `genre` | text[] | |
| `gallery` | text[] | |
| `social_links` | jsonb | `{instagram, spotify, website}` |
| `base_fee` | numeric | |
| `status` | enum | `pending` / `approved` / `rejected` |

**RLS**: lettura pubblica solo se `status = approved`; update self per il proprio profilo; superadmin può tutto.

### `artist_availability`
Date occupate dell'artista. Le date assenti = disponibili.

| Campo | Tipo | Note |
|-------|------|------|
| `artist_id` | uuid FK | |
| `date` | date | unique con `artist_id` |
| `status` | enum | `available` / `busy` |

**RLS**: lettura pubblica; write solo proprietario o superadmin.

### `events`

| Campo | Tipo | Note |
|-------|------|------|
| `id` | uuid PK | |
| `title`, `slug`, `city`, `venue`, `cover_image`, `description` | text | |
| `category` | enum | 10 categorie (music, clubs, festivals, ...) |
| `date` | timestamptz | |
| `price` | numeric | nullable (gratis) |
| `featured` | bool | |
| `created_by` | uuid | |

**RLS**: lettura pubblica; write solo superadmin.

### `leads`
Richieste di booking di un utente verso un artista.

| Campo | Tipo | Note |
|-------|------|------|
| `artist_id` | uuid FK | |
| `requester_user_id` | uuid FK | |
| `event_date` | date | |
| `event_location`, `message`, `contact_email`, `contact_phone` | text | |
| `budget` | numeric | |
| `status` | enum | `new` / `contacted` / `closed` |

**RLS**: insert per chiunque sia autenticato; lettura per il richiedente, l'artista (via `artists.user_id`) e il superadmin.

### `artist_applications`
Candidature pubbliche dal bottone "Sei un artista?".

| Campo | Tipo | Note |
|-------|------|------|
| `name`, `email`, `stage_name`, `bio` | text | |
| `genre` | text[] | |
| `links` | jsonb | |
| `status` | enum | `pending` / `approved` / `rejected` |

**RLS**: insert pubblico (anonimo); lettura/update solo superadmin.

### `contact_messages`
Messaggi dal form Contatti.

**RLS**: insert pubblico; lettura solo superadmin.

### `collaborations`
Partner / collaborazioni mostrati nella pagina dedicata.

**RLS**: lettura pubblica; write solo superadmin.

## Storage buckets

| Bucket | Public | Uso |
|--------|--------|-----|
| `event-covers` | yes | Cover degli eventi |
| `artist-images` | yes | Avatar e gallery artisti |
| `collaboration-logos` | yes | Loghi partner |

## Setup post-migration

```sql
-- Imposta l'email superadmin (sostituisci il valore)
alter database postgres set app.superadmin_email = 'tua@email.com';
```

Al primo signup con quell'email, il trigger promuove automaticamente il profilo a `superadmin`.

## Rigenerazione tipi TypeScript

```bash
# Una volta installato supabase CLI
supabase gen types typescript --project-id YOUR_REF > lib/supabase/types.ts
```
