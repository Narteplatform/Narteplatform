# N'arte

Piattaforma personale per la gestione di eventi musicali e booking di artisti emergenti.

Sito pubblico (italiano) + 3 aree autenticate: superadmin, artista, utente.

## Stack

- **Next.js 16** App Router su Vercel (Fluid Compute)
- **Supabase**: Postgres con RLS + Auth + Storage
- **Resend** + React Email
- **Tailwind CSS v4** + componenti custom + **Framer Motion**
- **React Hook Form** + **Zod**

## Setup

```bash
# 1. Installa dipendenze
npm install

# 2. Copia env
cp .env.local.example .env.local
# Compila NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# RESEND_API_KEY, RESEND_FROM_EMAIL, SUPERADMIN_EMAIL, ADMIN_NOTIFICATION_EMAIL.

# 3. Crea progetto Supabase (consigliato via Vercel Marketplace)
# Esegui supabase/migrations/0001_init.sql nel SQL editor.
# Imposta la GUC superadmin_email:
#   alter database postgres set app.superadmin_email = 'tua@email.com';

# 4. Dev server
npm run dev
# http://localhost:3000

# 5. Build
npm run build
```

## Struttura

```
app/
├── (public)/                     home, eventi, chi-siamo, collaborazioni, contatti, candidatura
├── (auth)/                       login, register, logout
├── (user)/artisti/               lista artisti + profilo (loggato)
├── (artist)/dashboard/           area artista
└── (admin)/admin/                area superadmin
components/
├── animations/                   Reveal, StaggerList, Marquee
├── marketing/                    Hero, EventCard, ecc.
├── forms/                        ContactForm, ArtistRequestForm, EventForm, ecc.
├── admin/                        ApplicationActions, LeadStatusSelect, ecc.
├── layout/                       Header, Footer
└── ui/                           Button, Input
lib/
├── supabase/                     client + server + types
├── auth/guards.ts                requireUser, requireRole
├── emails/                       send + templates
└── validators/schemas.ts         schemi Zod
supabase/migrations/0001_init.sql
.claude/agents/                   frontend, backend, qa
docs/                             ARCHITECTURE, DESIGN_SYSTEM, DATABASE, AUTH_AND_ROLES, EMAILS, DEPLOYMENT
```

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev server con Turbopack |
| `npm run build` | Production build |
| `npm run start` | Esegue il build |
| `npm run lint` | Lint |
| `npm run typecheck` | Type-check `tsc --noEmit` |

## Documentazione

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [DATABASE.md](./DATABASE.md)
- [AUTH_AND_ROLES.md](./AUTH_AND_ROLES.md)
- [EMAILS.md](./EMAILS.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
