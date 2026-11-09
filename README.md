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
| `infra` | The AWS hosting (S3 and CloudFront) and the GitHub deploy role, as a CDK app |

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

## Deploying

The web app is served from a private S3 bucket through CloudFront. The AWS resources are defined with the CDK in `infra/`, and the `Deploy` workflow publishes each commit on `main` once CI passes.

### One-time setup

You need the AWS CLI signed in to your account (for example with `aws configure sso`, using a profile called `vitalog`).

1. Create the AWS resources. `bootstrap` is only needed the first time in an account.
   ```bash
   cd infra
   pnpm cdk bootstrap --profile vitalog
   pnpm cdk deploy --profile vitalog
   ```
   When it finishes it prints four outputs: `SiteUrl`, `BucketName`, `DistributionId` and `DeployRoleArn`.
2. In GitHub, open Settings → Secrets and variables → Actions → **Variables** and add:
   - `AWS_DEPLOY_ROLE_ARN`: the `DeployRoleArn` output
   - `SITE_BUCKET`: the `BucketName` output
   - `DISTRIBUTION_ID`: the `DistributionId` output

   The build also uses the `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets described below.
3. Run the `Deploy` workflow from the Actions tab, then open the `SiteUrl`.
4. In Supabase, open Authentication → URL Configuration. Set **Site URL** to the `SiteUrl`, and add the `SiteUrl` followed by `/**` to **Redirect URLs**. Keep `http://localhost:5173/**` for local development.

### Accounts that block CloudFormation

AWS free-plan accounts are refused `cdk bootstrap` and the GitHub sign-in the CDK stack uses. On those, create the same hosting with plain API calls instead:

```bash
pnpm --filter @vitalog/infra setup-site -- --profile vitalog
```

It creates the private bucket, CloudFront with the same app route rewrite and security headers, and an IAM user, `vitalog-github-deploy`, that can only upload the site and clear the cache. It is safe to run again: it only creates what's missing. When it finishes it prints what to add in GitHub under Settings → Secrets and variables → Actions:

- **Variables:** `SITE_BUCKET` and `DISTRIBUTION_ID`. Leave `AWS_DEPLOY_ROLE_ARN` unset.
- **Secrets:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. The secret key is shown only once; run the script again with `--new-key` to replace it.

Then carry on from step 3 above, using the site address the script prints. The script doesn't change a distribution that already exists, so after changing its settings, edit the distribution in the CloudFront console or delete it and run the script again.

### Afterwards

Every push to `main` deploys on its own once CI passes. The deploy role can only upload files and clear the cache, so changes to `infra/` are applied by running `pnpm cdk deploy --profile vitalog` again; `pnpm cdk diff --profile vitalog` shows what would change first.

At personal or portfolio traffic, S3 and CloudFront cost cents a month or nothing at all.

## Keeping the free Supabase project awake

Free Supabase projects pause after about a week without activity. The `Keep Supabase awake` workflow (`.github/workflows/keep-alive.yml`) reads one row a day so the demo never goes to sleep. It needs two repository secrets, under Settings → Secrets and variables → Actions:

- `SUPABASE_URL`: the project URL, such as `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY`: the anon (publishable) key. Never the service role key.

To check it, run the workflow by hand from the Actions tab. GitHub turns off scheduled workflows in public repositories after 60 days with no commits, and emails a warning first; re-enable it from the Actions tab, or push any commit.

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
