# Vitalog

A personal health tracker for food, calories, weight, exercise, sleep, fasting, water and biometrics, built web-first.

This is the second version of Vitalog. The first was a Tauri desktop app written in Vue ([Cameron-Guinnee/vitalog](https://github.com/Cameron-Guinnee/vitalog)). This version rebuilds it as a React web app on the same Supabase backend, with desktop and mobile apps to follow.

## Repository layout

| Path | What it holds |
|---|---|
| `apps/web` | The React web app (Vite, TypeScript, React Router, TanStack Query) |
| `packages/shared` | Code shared by every app: database types and domain helpers |
| `supabase/migrations` | The database schema as ordered SQL migrations |
| `supabase/tests` | Security checks that run against the migrations in CI |

## Getting started

You need Node 22 and pnpm 10 (`corepack enable` installs the right pnpm).

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in your Supabase URL and anon key
pnpm dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the web app locally |
| `pnpm check` | Lint, typecheck and unit tests |
| `pnpm build` | Production build of every package |
| `pnpm test:migrations` | Applies all migrations to a scratch Postgres and runs the security checks (needs `psql` and the usual `PG*` variables) |
| `pnpm gen:types` | Regenerates `packages/shared/src/database.types.ts` from the linked Supabase project |

## Supabase auth settings

Email links (signup confirmation, password reset) send people back to the web app, so Supabase must allow its URLs. In the Supabase dashboard, open Authentication → URL Configuration:

- **Site URL**: the deployed site once it exists; `http://localhost:5173` until then.
- **Redirect URLs**: add `http://localhost:5173/**` for local development, and the deployed origin followed by `/**` later.

## Database

`20261107000000_baseline.sql` reproduces the live schema exactly as it was on 2026-11-07. Every change after that is a new migration.

To connect this repo to the live project without re-running the baseline:

```bash
supabase link --project-ref <your-project-ref>
supabase migration repair --status applied 20261107000000
supabase db push   # applies the migrations after the baseline
```

`20261107000100_security_and_indexes.sql` fixes problems found in the baseline:

- Row-level security was off on `foods`, `food_nutrient_values` and `nutrients`, so their policies were ignored and anyone with the anon key could edit the food database.
- Any signed-in user could set their own `subscription_tier` to `pro`. A trigger now lets only the billing service change it.
- The signup trigger now pins its `search_path`.
- Adds indexes for per-user, per-day lookups and drops a duplicate constraint.
