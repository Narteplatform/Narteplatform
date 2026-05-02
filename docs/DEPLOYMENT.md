# Deployment

## Vercel

Stack: Next.js 16 + Fluid Compute (default), Node.js 24 LTS, timeout 300s.

### Setup primo deploy

```bash
# Vercel CLI
npm i -g vercel

# Login + link
vercel login
vercel link

# Pull env
vercel env pull .env.local
```

Configurazione tramite `vercel.ts` (TypeScript, sostituisce `vercel.json`).

### Integrazione Supabase via Marketplace

1. Dashboard Vercel → progetto → **Storage** → **Connect Database** → **Supabase**
2. Crea un nuovo progetto Supabase (oppure connetti uno esistente)
3. Vercel popola automaticamente `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Apri il progetto Supabase → SQL Editor → esegui `supabase/migrations/0001_init.sql`
5. Imposta la GUC superadmin:
   ```sql
   alter database postgres set app.superadmin_email = 'tua@email.com';
   ```

### Resend

1. Dashboard Vercel → **Integrations** → **Resend** → installa
2. In alternativa, manualmente:
   ```bash
   vercel env add RESEND_API_KEY production
   vercel env add RESEND_FROM_EMAIL production
   vercel env add ADMIN_NOTIFICATION_EMAIL production
   vercel env add NEXT_PUBLIC_SITE_URL production
   ```
3. Verifica il dominio in Resend per superare i 100 email/giorno della sandbox

### Deploy

```bash
# Preview (branch attuale)
vercel

# Production
vercel deploy --prod
```

### Domini

Dashboard Vercel → **Domains** → aggiungi `narte.it` (e `www.narte.it`). Configura i DNS come indicato.

## Performance check post-deploy

```bash
npx lighthouse https://narte.it --view
```

Target: Performance ≥ 85 mobile, Accessibility ≥ 95.

## Rolling release / canary

Per rollout graduali (es. nuovo design system) usare **Rolling Releases** dal dashboard Vercel.
