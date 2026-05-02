# Contribuire

## Branching

- `main`: produzione
- `dev`: integrazione (deploy preview)
- Feature branch: `feat/nome-feature`, `fix/descrizione`, `docs/...`

## Commit

Stile Conventional Commits:

```
feat(eventi): aggiungi filtro per città
fix(auth): redirect dopo login non funzionava
docs(database): chiarisci RLS leads
```

## Code style

- Niente `console.log` in produzione
- Niente `any` (preferire `unknown` + narrowing)
- Server Components di default
- Tailwind v4 con i token in `app/globals.css`
- Per ogni feature: type-check, lint, smoke test manuale

## Workflow tipico

1. `git checkout -b feat/...`
2. Implementa con il subagent appropriato (frontend / backend / qa)
3. `npm run typecheck && npm run lint && npm run build`
4. Apri PR verso `dev`
5. Verifica preview Vercel
6. Merge dopo approvazione
