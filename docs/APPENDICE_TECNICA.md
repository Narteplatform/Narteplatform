# N'arte — Appendice tecnica

> Allegato al documento principale [`PIATTAFORMA_NARTE.md`](./PIATTAFORMA_NARTE.md).
> Destinatari: team di sviluppo, eventuali revisori tecnici lato cliente.

---

## 1. Stack tecnologico

| Livello | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router, Server Actions, Turbopack) |
| Hosting | **Vercel** (Fluid Compute, Node.js 24 LTS) |
| Database | **Supabase Postgres** (RLS attivo su tutte le tabelle) |
| Autenticazione | **Supabase Auth** (email/password) |
| Storage | **Supabase Storage** (bucket dedicati per audio, foto, allegati chat) |
| Email transazionali | **Resend** + **React Email** |
| Email automation | **Brevo** (API + automation flows) |
| Pagamenti | **Stripe Checkout** + Webhook + Customer Portal |
| UI | **Tailwind CSS v4** + componenti shadcn-style |
| Animazioni | **Framer Motion** (rispetto di `prefers-reduced-motion`) |
| Form / validazione | **React Hook Form** + **Zod** |
| Lingua | Italiano (unica) |

---

## 2. Architettura applicativa

- **Server Components** di default; `"use client"` solo dove serve interattività.
- **Server Actions** in `app/**/_actions.ts` per le mutazioni (form, CRUD).
- **Route Handlers** (`app/api/**`) solo per webhook esterni (Stripe, Brevo) e endpoint pubblici.
- **Client Supabase**: `@supabase/ssr`, configurato in `lib/supabase/server.ts` (server) e `lib/supabase/client.ts` (browser).
- **Chiave service-role** mai esposta al browser: usata solo in route handler / server action protette.

---

## 3. Modello dati (tabelle principali)

| Tabella | Scopo |
|---|---|
| `profiles` | Dati utente + ruolo (`superadmin`, `artist`, `user`, `organizer`) |
| `artists` | Profilo artista (bio, generi, foto, audio, video, social, fascia prezzo, status) |
| `artist_availability` | Date disponibili/occupate |
| `artist_default_slots` / `artist_date_slots` | Fasce orarie standard e per data |
| `events` | Eventi pubblici N'arte |
| `leads` | Richieste booking semplici (utente / visitatore) |
| `artist_applications` | Candidature artisti in attesa di approvazione |
| `contact_messages` | Messaggi dal modulo contatti |
| `organizers` | Profili organizzatori |
| `venues` | Strutture/luoghi degli organizzatori |
| `booking_requests` | Richieste di booking strutturate (organizer → artist) |
| `booking_messages` | Chat e offerte tracciate sulle richieste di booking |
| `consultant_slots` | Slot di consulenza professionale |
| `consultations` | Prenotazioni consulenza degli artisti |

### Da aggiungere per chiudere lo scope

| Tabella nuova | Scopo |
|---|---|
| `subscriptions` | Abbonamenti artisti (Stripe customer id, piano, stato, periodo) |
| `reviews` | Recensioni post-evento (organizer → artist) |

---

## 4. Sicurezza

- **RLS** (Row Level Security) attivo su tutte le tabelle: ogni utente vede e modifica solo i dati di sua competenza.
- **Validazione Zod** su ogni form (server-side); nessun input "fidato" senza schema.
- **Sessione Supabase** lato server con cookie httpOnly.
- **Service-role key** confinata al server (Server Actions / Route Handlers protetti).
- **Webhook signature** verificata per Stripe e Brevo.
- **Trigger Postgres** per promozione automatica del superadmin (basata su env `SUPERADMIN_EMAIL`).
- Nessun `console.log` in produzione; logging strutturato server-side.

---

## 5. Email

Doppio binario:

- **Resend** (transazionali immediate, trigger di sistema): conferme tecniche, notifiche istantanee, messaggi 1:1.
- **Brevo** (marketing + automation): liste, segmentazione, drip campaign, newsletter, recupero lead.

I template React Email vivono in `lib/emails/`. Brevo usa template gestiti nella sua dashboard, richiamati via API.

---

## 6. Storage

| Bucket | Contenuto | Accesso |
|---|---|---|
| `artist-audio` | Tracce audio MP3/WAV degli artisti | Lettura pubblica, scrittura solo proprietario |
| `chat-attachments` | Allegati nelle chat di booking | Lettura solo parti coinvolte |
| `venue-images` | Foto delle strutture organizzatori | Lettura pubblica, scrittura proprietario |
| Immagini eventi / cover artisti | Cover + gallery | Lettura pubblica |

---

## 7. Hosting e ambienti

- **Production**: deploy automatico Vercel dal branch `main`.
- **Preview**: deploy automatico per ogni PR.
- **Supabase**: progetto managed, backup automatici.
- **Variabili d'ambiente**: gestite via `vercel env` (production / preview / development).

### Variabili principali

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPERADMIN_EMAIL=
RESEND_API_KEY=
ADMIN_NOTIFICATION_EMAIL=
BREVO_API_KEY=                  # da aggiungere
STRIPE_SECRET_KEY=              # da aggiungere
STRIPE_WEBHOOK_SECRET=          # da aggiungere
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # da aggiungere
```

---

## 8. Roadmap tecnica per chiusura scope

1. **Stripe**
   - Migrazione DB: tabella `subscriptions` + colonna `tier` su `artists`.
   - Route handler: `app/api/stripe/webhook/route.ts` (verifica firma, aggiorna `subscriptions` + `tier`).
   - Server Action: `createCheckoutSession`, `createBillingPortalSession`.
   - UI: sezione "Abbonamento" nella dashboard artista.
   - Middleware di feature-gate: limiti per tier (foto, audio, candidature, booking).

2. **Brevo**
   - Wrapper `lib/brevo/client.ts` + funzioni `addContactToList`, `triggerEvent`.
   - Hook nelle Server Actions chiave (signup, application approved, booking offer, booking confirmed).
   - Automation flow nella dashboard Brevo: drip onboarding, newsletter, recupero lead, promo geo.

3. **Recensioni**
   - Migrazione DB: tabella `reviews` (booking_request_id, rating, body, response).
   - Cron job (Vercel Cron o trigger): invia email richiesta recensione X giorni dopo `event_date`.
   - UI pubblica nel profilo artista + UI risposta nella dashboard artista.

4. **Test E2E** (Playwright) sui flussi critici: candidatura, booking, abbonamento, recensione.

---

## 9. Documentazione di riferimento già esistente

- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`AUTH_AND_ROLES.md`](./AUTH_AND_ROLES.md)
- [`DATABASE.md`](./DATABASE.md)
- [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- [`EMAILS.md`](./EMAILS.md)
