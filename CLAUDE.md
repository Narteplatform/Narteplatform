# N'arte — Project Instructions

Piattaforma italiana che mette in contatto artisti emergenti, organizzatori di eventi musicali e pubblico. Sito pubblico in italiano + aree autenticate per **cinque ruoli**.

> **N'arte non intermedia i pagamenti degli ingaggi.** Mette in contatto e si ferma lì: il compenso lo concordano e lo regolano direttamente artista e organizzatore. L'unica somma incassata è l'abbonamento dell'artista, via Stripe. È il presupposto su cui sono scritti i termini d'uso: se cambia, cambiano anche quelli.

## ⛔ Regola numero uno: mai distruggere dati di propria iniziativa

**Il DB Supabase di questo progetto è quello di PRODUZIONE.** Non esistono ambienti di staging: ogni scrittura tocca i dati reali di Luigi e degli artisti.

1. **La verifica è SOLA LETTURA.** Non si scrive mai sul DB, sullo Storage o su file dell'utente per "controllare se funziona". Se un test richiede una scrittura, si chiede prima, spiegando cosa verrà scritto e su quale record.
2. **Mai cancellare o svuotare senza richiesta esplicita.** DELETE, TRUNCATE, `update` che azzera colonne, rimozione di file da Storage, `rm` di file non creati in questa sessione: si chiede sempre prima. Vale anche quando sembra ovvio o reversibile.
3. **Attenzione alla distruzione per omissione.** Su questo schema, scrivere `[]`, `null` o un oggetto vuoto CANCELLA il contenuto: `gallery`, `videos`, `audio_files`, `personnel`, `influences`, `languages`, `social_links`. Un payload incompleto non "lascia le cose come stanno", le svuota.
4. **Mai derivare una scrittura da una lettura di cui non si è controllato l'errore.** `const { data, error } = await ...` — se `error` non viene gestito, `data` è `null` e ogni `?? []` o `?? {}` a valle diventa una cancellazione mascherata da no-op. Controllare `error` e fermarsi, non proseguire con un default.
5. **Un confronto prima/dopo che non trova differenze non è una prova.** Se lo snapshot di partenza è vuoto (query fallita, colonna inesistente), il diff risulta vuoto qualunque cosa sia successo. Verificare sempre che lo snapshot contenga davvero dati prima di trarne conclusioni.

*Precedente reale: uno script di verifica ha selezionato una colonna inesistente (`is_verified`), la query è fallita in silenzio, lo snapshot è risultato `{}` e il `?? []` a valle ha scritto `gallery: []` sul profilo "Luigi Marzatico", svuotandone la galleria. I file erano salvi nello Storage, ma l'elenco è andato perso. Nessuna di queste cinque regole era stata rispettata.*

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) su **Vercel** (Fluid Compute)
- **Supabase**: Postgres + Auth + Storage (RLS attivo su tutto)
- **Brevo** come provider email principale, **Resend** come rete di sicurezza (vedi `lib/emails/dispatch.ts`)
- **Stripe** per gli abbonamenti artista (Free / Pro / Max)
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

Cinque, non tre. La documentazione precedente ne elencava tre e ignorava
organizzatore e consulente, che sono aree complete e funzionanti.

| Ruolo | Area | Cosa fa |
|---|---|---|
| `superadmin` | `/admin` | Accesso totale: eventi, format, blog, artisti, lead, consulenze, generi, recensioni, permessi |
| `artist` | `/dashboard` | Profilo (anche multiplo), calendario e slot, richieste, chat, consulenze, statistiche, abbonamento |
| `organizer` | `/organizzatore` | Strutture, invio richieste, trattativa in chat, calendario date confermate, recensioni |
| `consultant` | `/admin/consulenza` | Accesso limitato alle sole consulenze e al proprio profilo |
| `user` | — | Catalogo artisti, richiesta booking, preferiti |

Promozione automatica a superadmin: trigger Postgres che usa `SUPERADMIN_EMAIL` env.
⚠️ Non funziona di serie su questo progetto: vedi AGENTS.md, usare `npm run db:promote-admin`.

## Funzioni oltre il booking

Non erano documentate ma sono costruite e attive:

- **Chat** con offerte tracciate (`lib/chat/`, migration 0010-0013)
- **Blog** con editor TipTap (`app/(public)/blog/`, `app/(admin)/admin/blog/`)
- **Format** NaJam / NuLive / NaBand / NaCena (`app/(public)/format/`)
- **Abbonamenti** Stripe con applicazione automatica dei limiti (`lib/billing/`)
- **Recensioni** post-evento, visibili sul profilo pubblico (`lib/feedback/`)
- **Consulenze** con slot e consulenti (`app/(admin)/admin/consulenza/`)
- **Statistiche** di visita del profilo, piano Max (`lib/analytics/`)

## Sicurezza — aggiunte del 28/08/2026

- **Header di sicurezza** in `next.config.ts`. La **CSP è in sola segnalazione**:
  va verificata in console su tutte le aree e poi attivata rinominando la chiave.
- **Anti-spam** sui moduli pubblici: `lib/security/honeypot.ts` +
  `lib/security/rate-limit.ts`, riuniti in `guardPublicForm`. Ogni nuovo modulo
  pubblico deve chiamarla.
- **`/__health` non è più pubblica**: solo superadmin root.
- **Consensi** registrati in `user_consents` (migration 0049).

## Documenti legali

`lib/legal/content.ts` contiene bozze **non ancora validate da un avvocato**,
servite da `/privacy`, `/cookie-policy` e `/termini`. Sono predisposte per
essere sostituite da iubenda: basta valorizzare `NEXT_PUBLIC_IUBENDA_*` e le
pagine rimandano ai documenti ospitati, senza cambiare rotte.

## Subagent dedicati

In `.claude/agents/`:
- **frontend** — UI/UX, design system, animazioni
- **backend** — Supabase, Server Actions, email Resend
- **qa** — test E2E, Lighthouse, accessibilità

## Migration in attesa di applicazione

Da eseguire dal SQL editor Supabase (`db:apply` non funziona, vedi AGENTS.md):

- `0048_rate_limits.sql` — limitatore di frequenza. Finché manca, i freni
  registrano un avviso nei log e **lasciano passare**: il sito funziona, ma è
  senza protezione.
- `0049_user_consents.sql` — registro dei consensi. Finché manca, la casella in
  registrazione è obbligatoria lato modulo ma il consenso non viene archiviato.

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
