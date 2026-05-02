# Email transazionali

Provider: **Resend** + **React Email**.

## Setup

1. Account su [resend.com](https://resend.com)
2. Verifica un dominio (`narte.it`) oppure usa l'indirizzo di sandbox
3. Imposta in `.env.local`:
   ```
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=N'arte <noreply@narte.it>
   ADMIN_NOTIFICATION_EMAIL=tua@email.com
   ```

## Helper

`lib/emails/send.ts` esporta `sendEmail({ to, subject, react, replyTo })`. Restituisce `{ ok: boolean, id?, error? }`. Logga in console gli errori. Se `RESEND_API_KEY` manca, restituisce `{ ok: false, skipped: true }` senza throw — utile in dev.

## Template (in `lib/emails/templates/`)

| Template | Usato in | Destinatari |
|----------|----------|-------------|
| `BookingRequestEmail.tsx` | `submitLead` | Artista (richiesta diretta) + admin (copia) |
| `ApplicationReceivedEmail.tsx` | `submitArtistApplication` | Candidato (conferma) + admin (notifica) |
| `ContactMessageEmail.tsx` | `submitContact` | Admin |

Tutti i template sono server-rendered (React Email → HTML inline). Nessuna dipendenza da Tailwind: stili inline coerenti con il design system (Inter, palette N'arte).

## Flusso lead booking

```
Server Action submitLead
        │
        ├─ insert leads (admin client)
        │
        ├─ Promise.all([
        │     sendEmail({ to: artista.email, react: <BookingRequestEmail /> }),
        │     sendEmail({ to: admin.email, react: <BookingRequestEmail isAdminCopy /> })
        │  ])
        │
        └─ return { ok: true, leadId }
```

`replyTo` viene impostato all'email del richiedente, così l'artista può rispondere direttamente.

## Test in dev

Senza `RESEND_API_KEY`: i log su console mostrano "RESEND_API_KEY mancante" e il flusso prosegue.

Con sandbox Resend (dominio non verificato): le email sono limitate a indirizzi @resend.dev e all'email del proprietario dell'account.

## Aggiungere un nuovo template

1. Crea `lib/emails/templates/MioTemplate.tsx` (component React Email)
2. Importa nel Server Action e chiama `sendEmail({ ..., react: MioTemplate({...}) })`
3. Verifica visualmente con `npx react-email dev` (richiede `react-email` come devDep, già incluso)
