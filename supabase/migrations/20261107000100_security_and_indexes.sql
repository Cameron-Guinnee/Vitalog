-- Fixes found while reviewing the baseline schema.

-- 1. The shared food tables had policies but row-level security was off, so the
--    policies were ignored and the anon key could write to them. Turning RLS on
--    applies the existing policies (public read, users write only their own foods).
--    The FDC importer uses the service role key, which bypasses RLS.
alter table public.foods enable row level security;
alter table public.food_nutrient_values enable row level security;
alter table public.nutrients enable row level security;

-- 2. "Users can update own profile" covers every column, so any signed-in user
--    could set their own subscription_tier to 'pro'. Only the service role (used by
--    the billing webhook) and the database owner may set it. A trigger is used
--    rather than column grants so new profile columns stay editable by default.
create or replace function public.protect_subscription_tier()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.subscription_tier := 'free';
    elsif new.subscription_tier is distinct from old.subscription_tier then
      raise exception 'subscription_tier can only be changed by the billing service'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_subscription_tier
  before insert or update on public.profiles
  for each row execute function public.protect_subscription_tier();

-- 3. Pin the search_path of the SECURITY DEFINER signup trigger (Supabase linter
--    warning 0011) and fully qualify the table it writes to. Behaviour is unchanged.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email);
  return new;
end;
$$;

-- 4. Duplicate of food_nutrient_values_pkey.
alter table public.food_nutrient_values drop constraint food_nutrient_values_pkey_unique;

-- 5. Indexes for the per-user, per-day lookups the diary, dashboard and trends
--    screens make, and for foreign keys that RLS subqueries and cascades follow.
create index if not exists diary_entries_user_logged_idx on public.diary_entries (user_id, logged_at);
create index if not exists biometrics_user_logged_idx on public.biometrics (user_id, logged_at);
create index if not exists exercise_log_user_logged_idx on public.exercise_log (user_id, logged_at);
create index if not exists notes_user_created_idx on public.notes (user_id, created_at);
create index if not exists fasting_log_user_started_idx on public.fasting_log (user_id, started_at);
create index if not exists sleep_log_user_start_idx on public.sleep_log (user_id, sleep_start);
create index if not exists custom_foods_user_idx on public.custom_foods (user_id);
create index if not exists custom_meals_user_idx on public.custom_meals (user_id);
create index if not exists recipes_user_idx on public.recipes (user_id);
create index if not exists custom_meal_items_meal_idx on public.custom_meal_items (custom_meal_id);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);
create index if not exists foods_created_by_idx on public.foods (created_by);
