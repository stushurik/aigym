# AIGYM

AI-assisted workout builder and tracker — a single-user Progressive Web App. See
[`specs/001-ai-workout-tracker/`](specs/001-ai-workout-tracker/) for the full spec, plan, and
task breakdown, and [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for the
project's governing principles.

## Getting started

```bash
corepack enable && corepack prepare pnpm@11.25.0 --activate
pnpm install
npx convex dev   # one-time interactive login; see convex/README.md
pnpm dev
```

See [`specs/001-ai-workout-tracker/quickstart.md`](specs/001-ai-workout-tracker/quickstart.md)
for end-to-end validation scenarios once a story is implemented.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | Typecheck only |
| `pnpm lint` / `pnpm format` | Biome lint / format |
| `pnpm test` | Vitest (unit + component) |
| `pnpm test:e2e` | Playwright smoke suite |
