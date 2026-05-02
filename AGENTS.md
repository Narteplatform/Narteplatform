# AGENTS.md

Non-discoverable landmines for agents working on N'arte. For stack/architecture see [CLAUDE.md](CLAUDE.md) and [docs/](docs/).

## Setup landmines

- **Supabase CLI is not installed and not linked.** Use `npx supabase` for one-off commands. `supabase login` is interactive (browser) and won't work non-interactively. The DB password is **not** stored anywhere — never assume `supabase db push` works.
- **Migrations are applied via the SQL Editor**, not the CLI. New SQL goes in `supabase/migrations/000N_*.sql`; tell the user to paste it at https://supabase.com/dashboard/project/nppzchkgzltcokvxcpji/sql/new.
- **Smoke-test connection with `npm run db:check`** before any DB-touching task. It hits all 8 tables + buckets + admin auth API.

## Type-system landmines

- **Do not downgrade `@supabase/ssr` below 0.10.** Versions 0.5.x silently drop the `<Database>` generic, making every typed query return `never` and producing ~60 phantom TS errors. If you see "Property X does not exist on type 'never'" everywhere, that's the symptom.
- **`lib/supabase/types.ts` must keep the canonical `supabase gen types typescript` shape** (`Tables`/`Views`/`Functions`/`Enums`/`CompositeTypes` with `Relationships: []` per table). A "simplified" hand-roll breaks postgrest-js v2 result inference. Regenerate via `npx supabase gen types typescript --project-id nppzchkgzltcokvxcpji` rather than editing by hand.
- **`.eq("category", x as never)` casts in `app/(public)/page.tsx` and `app/(public)/eventi/page.tsx` are intentional.** `category` is `EventCategory` enum but the route param is `string`. Don't "clean up" by removing the cast without adding runtime validation — it will break the build.

## Bootstrap landmines

- **Superadmin auto-promotion does NOT work out of the box.** The trigger reads `app.superadmin_email` GUC, but that GUC was never set on this project. Use `npm run db:promote-admin` after the first signup instead. Do not rely on the trigger for `boostcreativeai@gmail.com` becoming superadmin automatically.
- **Use the JWT-format keys** (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) for `@supabase/supabase-js`, not `sb_publishable_*` / `sb_secret_*`. The new format is in `.env.local` as backup but supabase-js v2.47 paths assume JWT.

## Vercel / Next.js landmines

- **Do not create a `vercel.ts`.** `@vercel/config` is not on npm despite what some agent skills suggest. Edit `vercel.json` instead.
- **`middleware.ts` is deprecated in Next 16** (warning in dev). Rename to `proxy.ts` carries an export rename and changes how the matcher behaves with Turbopack — don't do it casually; auth guards in this file run on every request.
- **Stray `package-lock.json` in `C:\Users\luigi\OneDrive\Desktop\`** (parent dir) confuses Turbopack root inference. Don't try to "fix" it from inside this repo — it's an unrelated file the user owns.

## Workflow

- **Push to `Narteplatform/Narteplatform` on `main` at the end of each meaningful feature.** Single-commit-per-tweak floods the history; one commit per logical unit. The user expects automatic push at end-of-task without re-asking.
- **Italian-only UI copy.** Reference design (event-guide screenshot in chat history) is the visual contract; don't redesign components without checking.
- **All admin/dashboard mutations go through Server Actions in `_actions.ts`** that re-validate auth + role + Zod. Never trust client-side role checks alone, even though `middleware.ts` already filters routes.
