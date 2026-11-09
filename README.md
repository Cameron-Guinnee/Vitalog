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
| `scripts/fdc_import` | The Python import that loads USDA FoodData Central foods into the database |

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

Some new accounts are also refused S3 in us-east-1. Add `--region us-east-2`, or another region that works, to put the bucket there; CloudFront still serves it worldwide.

New accounts also can't create a CloudFront distribution until AWS has verified them, which can take a day or two. If the script stops with "Your account must be verified before you can add new CloudFront resources", open an Account and billing case in AWS Support with that message, and run the script again once they confirm. It picks up where it stopped.

It creates the private bucket, CloudFront with the same app route rewrite and security headers, and an IAM user, `vitalog-github-deploy`, that can only upload the site and clear the cache. It is safe to run again: it only creates what's missing. When it finishes it prints what to add in GitHub under Settings → Secrets and variables → Actions:

- **Variables:** `SITE_BUCKET` and `DISTRIBUTION_ID`, plus `SITE_REGION` if you used `--region`. Leave `AWS_DEPLOY_ROLE_ARN` unset.
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

## Food database

The `foods`, `food_nutrient_values` and `nutrients` tables are filled from the USDA's [FoodData Central](https://fdc.nal.usda.gov/download-datasets) by `scripts/fdc_import`. It uses Foundation Foods and SR Legacy by default, with Foundation Foods replacing the SR Legacy entries they supersede. Branded Foods are optional. Values are stored per 100 g. Running it again updates foods in place, matched by their FDC id.

One-time setup, from the repository root, with Python 3.10 or newer:

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows (Git Bash); on macOS and Linux: source .venv/bin/activate
pip install -r scripts/fdc_import/requirements.txt
cp scripts/fdc_import/.env.example scripts/fdc_import/.env   # then fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
```

Then:

```bash
python -m scripts.fdc_import.run --dry-run                  # download, count, estimate the size; writes nothing
python -m scripts.fdc_import.run                            # import Foundation Foods and SR Legacy
python -m scripts.fdc_import.run --branded slim --dry-run   # how much slim Branded Foods would add
python -m pytest scripts/fdc_import                         # tests
```

The datasets download into `data/fdc/`, which git ignores. If the download page changes and the links can't be found, download the JSON zips by hand into `data/fdc/` and add `--skip-download`.

### Branded Foods and database size

The full Branded Foods set is several GB unzipped and far more than the Supabase free plan's 500 MB. `--branded slim` keeps only what a nutrition label carries, only products sold in the US, and only the newest record for each barcode, since FoodData Central adds a new record each time a label is resubmitted. `--dry-run` prints how much space each dataset would take, using per-row costs measured with this schema, so you can decide before importing anything.

To see what the database uses now, run this in the Supabase SQL editor:

```sql
select pg_size_pretty(pg_database_size(current_database())) as whole_database,
       pg_size_pretty(pg_total_relation_size('public.foods') + pg_total_relation_size('public.food_nutrient_values')) as food_tables;
```

