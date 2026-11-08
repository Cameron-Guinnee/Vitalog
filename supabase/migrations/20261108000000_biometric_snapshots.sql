-- The Vue app's Snapshots screen wrote to biometric_snapshots, but the table was
-- never created, so taking a snapshot always failed. Each row records the latest
-- value of every biometric at one moment, as {"weight": {"value": 180, "unit": "lbs"}, ...}.

create table public.biometric_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  metrics jsonb default '{}'::jsonb not null,
  note text,
  created_at timestamp with time zone default now() not null
);

create index biometric_snapshots_user_created_idx on public.biometric_snapshots (user_id, created_at);

alter table public.biometric_snapshots enable row level security;

create policy "Users can view own snapshots" on public.biometric_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own snapshots" on public.biometric_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own snapshots" on public.biometric_snapshots for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own snapshots" on public.biometric_snapshots for delete to authenticated
  using ((select auth.uid()) = user_id);
