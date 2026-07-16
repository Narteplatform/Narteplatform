# N'arte — Project Instructions

Piattaforma personale per la gestione di eventi musicali e booking di artisti emergenti. Sito pubblico in italiano + 3 aree autenticate (superadmin / artista / utente).

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) su **Vercel** (Fluid Compute)
- **Supabase**: Postgres + Auth + Storage (RLS attivo su tutto)
- **Resend** + React Email per le email transazionali
- **Tailwind CSS v4** + componenti shadcn-style + **Framer Motion** per le animazioni
- **React Hook Form** + **Zod** per i form
- Lingua: solo italiano

## Convenzioni di codice

- Path alias: `@/*` → root del progetto
- Componenti server di default; usare `"use client"` solo dove serve interattività
- Server Actions in `app/**/_actions.ts`, Route Handlers solo per webhook / endpoint pubblici
- Tutti i form passano da Zod (vedere `lib/validators/`)
- Le query DB lato server usano `@supabase/ssr` con il client di `lib/supabase/server.ts`
- Nessuna chiave service-role nel browser. Solo nei file server o route handlers
- Niente `any`. Niente `console.log` in produzione (usare `logger` se necessario)

## Design system

Vedere `docs/DESIGN_SYSTEM.md` per i dettagli completi.

- Tipografia display: `--font-display` (Space Grotesk 700) in Sentence case, tracking stretto
- Tipografia body: `--font-sans` (Open Sans 400)
- Colori: bianco `#FFFFFF`, nero `#0B0B0B`, accento arancio `#FF5722`, grigio `#F4F4F4`
- Animazioni di reveal: opacity 0→1 + y 24→0, durata 0.6s, easing `[0.22, 1, 0.36, 1]`
- Sempre rispettare `prefers-reduced-motion`

## Ruoli

- `superadmin`: accesso totale (CRUD eventi, approvazione artisti, lead)
- `artist`: dashboard personale (profilo + calendario disponibilità)
- `user`: lista artisti + richiesta booking

Promozione automatica a superadmin: trigger Postgres che usa `SUPERADMIN_EMAIL` env.

## Subagent dedicati

In `.claude/agents/`:
- **frontend** — UI/UX, design system, animazioni
- **backend** — Supabase, Server Actions, email Resend
- **qa** — test E2E, Lighthouse, accessibilità

## Comandi

```bash
npm install      # installa le dipendenze
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
npm run lint
```

## Setup iniziale

1. `cp .env.local.example .env.local` e compilare le chiavi (incluse `SEED_SUPERADMIN_PASSWORD` e `SEED_ARTIST_PASSWORD`)
2. Creare progetto Supabase (consigliato via Vercel Marketplace)
3. Eseguire `supabase/migrations/0001_init.sql` sul DB
4. Sul DB Supabase, abilitare la promozione automatica al superadmin via GUC (una sola volta):
   ```sql
   alter database postgres set app.superadmin_email = 'boostcreativeai@gmail.com';
   ```
5. Eseguire `supabase/migrations/0002_seed_narte.sql` per popolare contenuti reali
   (eventi storici N'arte, 8 artisti italiani di prova, 3 collaborazioni)
6. `npm run db:seed-accounts` per creare/promuovere gli account fissi:
   - `boostcreativeai@gmail.com` → superadmin (`/admin`)
   - `luigimarzaticodigital@gmail.com` → artist (`/dashboard`, con record collegato in `artists`)
7. Configurare Resend con dominio verificato
