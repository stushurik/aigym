# convex/

Backend/infrastructure layer (constitution Principle VII/VIII) — schema, queries, mutations, and
the server-side Claude adapter, organized one directory per bounded context
(`workoutTracking/`, `chat/`, `preferences/`) per plan.md's Project Structure. Those directories
land in the Foundational-phase PR; this Setup PR only establishes `tsconfig.json` for the folder.

## One-time local setup (not automatable — requires an interactive login)

```bash
npx convex dev
```

This links the repo to a Convex deployment (creating one on first run if needed) and writes
`CONVEX_DEPLOYMENT` / `VITE_CONVEX_URL` to `.env.local` (gitignored). See `.env.example` at the
repo root for the full list of environment variables this project needs, including
`ANTHROPIC_API_KEY` (set server-side via `npx convex env set ANTHROPIC_API_KEY sk-...`, per
quickstart.md).
