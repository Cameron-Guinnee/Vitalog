-- Baseline: reproduces the live Vitalog schema as of 2026-11-07.
-- Generated from the database's catalog export. Do not edit; add new migrations instead.

create table public.biometrics (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  metric_type text not null,
  value numeric not null,
  unit text not null,
  logged_at timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  meal_group integer default 0
);

create table public.custom_food_nutrient_values (
  custom_food_id uuid not null,
  nutrient_id integer not null,
  value numeric not null
);

create table public.custom_foods (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  serving_size numeric,
  serving_unit text,
  created_at timestamp with time zone default now() not null,
  brand text
);

create table public.custom_meal_items (
  id uuid default gen_random_uuid() not null,
  custom_meal_id uuid,
  food_id uuid,
  custom_food_id uuid,
  quantity numeric default 1 not null
);

create table public.custom_meals (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  name text not null,
  created_at timestamp with time zone default now()
);

create table public.diary_entries (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  food_id uuid,
  meal_type text not null,
  quantity numeric not null,
  serving_unit text not null,
  logged_at timestamp with time zone not null,
  created_at timestamp with time zone default now() not null,
  meal_group integer default 0,
  custom_food_id uuid
);

create table public.diary_nutrient_values (
  diary_entry_id uuid not null,
  nutrient_id integer not null,
  value numeric not null
);

create table public.exercise_log (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  exercise_name text not null,
  category text not null,
  duration_minutes integer not null,
  calories_burned numeric,
  logged_at timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  meal_group integer default 0
);

create table public.fasting_log (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  target_duration_hours integer,
  completed boolean default false not null,
  notes text
);

create table public.food_nutrient_values (
  food_id uuid not null,
  nutrient_id integer not null,
  value numeric not null
);

create table public.foods (
  id uuid default gen_random_uuid() not null,
  name text not null,
  brand text,
  source text default 'usda'::text not null,
  is_verified boolean default false not null,
  serving_size numeric,
  serving_unit text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  fdc_id integer,
  category text
);

create table public.notes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  content text not null,
  created_at timestamp with time zone default now() not null,
  meal_group integer default 0
);

create table public.nutrients (
  id integer not null,
  name text not null,
  unit text not null,
  category text not null
);

create table public.profiles (
  id uuid not null,
  display_name text,
  units_preference text default 'imperial'::text not null,
  calorie_goal integer,
  weight_goal numeric,
  weight_goal_type text default 'maintain'::text,
  subscription_tier text default 'free'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  date_of_birth date,
  sex text,
  height_cm numeric,
  activity_level text default 'sedentary'::text,
  weekly_rate numeric,
  display_settings jsonb default '{}'::jsonb
);

create table public.recipe_ingredients (
  id uuid default gen_random_uuid() not null,
  recipe_id uuid not null,
  food_id uuid not null,
  quantity numeric not null,
  serving_unit text not null
);

create table public.recipes (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  servings integer default 1 not null,
  created_at timestamp with time zone default now() not null
);

create table public.sleep_log (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  sleep_start timestamp with time zone not null,
  sleep_end timestamp with time zone not null,
  duration_minutes integer not null,
  source text default 'manual'::text not null,
  created_at timestamp with time zone default now() not null
);

create table public.streaks (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  last_logged_at timestamp with time zone
);

alter table public.biometrics add constraint biometrics_pkey PRIMARY KEY (id);
alter table public.custom_food_nutrient_values add constraint custom_food_nutrient_values_pkey PRIMARY KEY (custom_food_id, nutrient_id);
alter table public.custom_foods add constraint custom_foods_pkey PRIMARY KEY (id);
alter table public.custom_meal_items add constraint custom_meal_items_pkey PRIMARY KEY (id);
alter table public.custom_meals add constraint custom_meals_pkey PRIMARY KEY (id);
alter table public.diary_entries add constraint diary_entries_pkey PRIMARY KEY (id);
alter table public.diary_nutrient_values add constraint diary_nutrient_values_pkey PRIMARY KEY (diary_entry_id, nutrient_id);
alter table public.exercise_log add constraint exercise_log_pkey PRIMARY KEY (id);
alter table public.fasting_log add constraint fasting_log_pkey PRIMARY KEY (id);
alter table public.food_nutrient_values add constraint food_nutrient_values_pkey PRIMARY KEY (food_id, nutrient_id);
alter table public.food_nutrient_values add constraint food_nutrient_values_pkey_unique UNIQUE (food_id, nutrient_id);
alter table public.foods add constraint foods_fdc_id_key UNIQUE (fdc_id);
alter table public.foods add constraint foods_pkey PRIMARY KEY (id);
alter table public.notes add constraint notes_pkey PRIMARY KEY (id);
alter table public.nutrients add constraint nutrients_name_key UNIQUE (name);
alter table public.nutrients add constraint nutrients_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.recipe_ingredients add constraint recipe_ingredients_pkey PRIMARY KEY (id);
alter table public.recipes add constraint recipes_pkey PRIMARY KEY (id);
alter table public.sleep_log add constraint sleep_log_pkey PRIMARY KEY (id);
alter table public.streaks add constraint streaks_pkey PRIMARY KEY (id);
alter table public.streaks add constraint streaks_user_id_key UNIQUE (user_id);

alter table public.biometrics add constraint biometrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.custom_food_nutrient_values add constraint custom_food_nutrient_values_custom_food_id_fkey FOREIGN KEY (custom_food_id) REFERENCES public.custom_foods(id) ON DELETE CASCADE;
alter table public.custom_food_nutrient_values add constraint custom_food_nutrient_values_nutrient_id_fkey FOREIGN KEY (nutrient_id) REFERENCES public.nutrients(id) ON DELETE CASCADE;
alter table public.custom_foods add constraint custom_foods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.custom_meal_items add constraint custom_meal_items_custom_food_id_fkey FOREIGN KEY (custom_food_id) REFERENCES public.custom_foods(id) ON DELETE CASCADE;
alter table public.custom_meal_items add constraint custom_meal_items_custom_meal_id_fkey FOREIGN KEY (custom_meal_id) REFERENCES public.custom_meals(id) ON DELETE CASCADE;
alter table public.custom_meal_items add constraint custom_meal_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;
alter table public.custom_meals add constraint custom_meals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.diary_entries add constraint diary_entries_custom_food_id_fkey FOREIGN KEY (custom_food_id) REFERENCES public.custom_foods(id) ON DELETE CASCADE;
alter table public.diary_entries add constraint diary_entries_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;
alter table public.diary_entries add constraint diary_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.diary_nutrient_values add constraint diary_nutrient_values_diary_entry_id_fkey FOREIGN KEY (diary_entry_id) REFERENCES public.diary_entries(id) ON DELETE CASCADE;
alter table public.diary_nutrient_values add constraint diary_nutrient_values_nutrient_id_fkey FOREIGN KEY (nutrient_id) REFERENCES public.nutrients(id) ON DELETE CASCADE;
alter table public.exercise_log add constraint exercise_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.fasting_log add constraint fasting_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.food_nutrient_values add constraint food_nutrient_values_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;
alter table public.food_nutrient_values add constraint food_nutrient_values_nutrient_id_fkey FOREIGN KEY (nutrient_id) REFERENCES public.nutrients(id) ON DELETE CASCADE;
alter table public.foods add constraint foods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
alter table public.notes add constraint notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.recipe_ingredients add constraint recipe_ingredients_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;
alter table public.recipe_ingredients add constraint recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;
alter table public.recipes add constraint recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.sleep_log add constraint sleep_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.streaks add constraint streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX foods_brand_search_idx ON public.foods USING gin (to_tsvector('english'::regconfig, COALESCE(brand, ''::text)));
CREATE INDEX foods_name_search_idx ON public.foods USING gin (to_tsvector('english'::regconfig, name));

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

alter table public.biometrics enable row level security;
alter table public.custom_food_nutrient_values enable row level security;
alter table public.custom_foods enable row level security;
alter table public.custom_meal_items enable row level security;
alter table public.custom_meals enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_nutrient_values enable row level security;
alter table public.exercise_log enable row level security;
alter table public.fasting_log enable row level security;
alter table public.notes enable row level security;
alter table public.profiles enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.sleep_log enable row level security;
alter table public.streaks enable row level security;

create policy "Users can delete own biometrics" on public.biometrics for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own biometrics" on public.biometrics for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own biometrics" on public.biometrics for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own biometrics" on public.biometrics for select to public
  using ((auth.uid() = user_id));
create policy "Users can delete own custom food nutrient values" on public.custom_food_nutrient_values for delete to public
  using ((auth.uid() = ( SELECT custom_foods.user_id
   FROM custom_foods
  WHERE (custom_foods.id = custom_food_nutrient_values.custom_food_id))));
create policy "Users can insert own custom food nutrient values" on public.custom_food_nutrient_values for insert to public
  with check ((auth.uid() = ( SELECT custom_foods.user_id
   FROM custom_foods
  WHERE (custom_foods.id = custom_food_nutrient_values.custom_food_id))));
create policy "Users can view own custom food nutrient values" on public.custom_food_nutrient_values for select to public
  using ((auth.uid() = ( SELECT custom_foods.user_id
   FROM custom_foods
  WHERE (custom_foods.id = custom_food_nutrient_values.custom_food_id))));
create policy "Users can delete own custom foods" on public.custom_foods for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own custom foods" on public.custom_foods for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own custom foods" on public.custom_foods for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own custom foods" on public.custom_foods for select to public
  using ((auth.uid() = user_id));
create policy "Users can manage their own custom meal items" on public.custom_meal_items for all to public
  using ((custom_meal_id IN ( SELECT custom_meals.id
   FROM custom_meals
  WHERE (custom_meals.user_id = auth.uid()))));
create policy "Users can manage their own custom meals" on public.custom_meals for all to public
  using ((auth.uid() = user_id));
create policy "Users can delete own diary entries" on public.diary_entries for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own diary entries" on public.diary_entries for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own diary entries" on public.diary_entries for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own diary entries" on public.diary_entries for select to public
  using ((auth.uid() = user_id));
create policy "Users can delete own diary nutrient values" on public.diary_nutrient_values for delete to public
  using ((auth.uid() = ( SELECT diary_entries.user_id
   FROM diary_entries
  WHERE (diary_entries.id = diary_nutrient_values.diary_entry_id))));
create policy "Users can insert own diary nutrient values" on public.diary_nutrient_values for insert to public
  with check ((auth.uid() = ( SELECT diary_entries.user_id
   FROM diary_entries
  WHERE (diary_entries.id = diary_nutrient_values.diary_entry_id))));
create policy "Users can view own diary nutrient values" on public.diary_nutrient_values for select to public
  using ((auth.uid() = ( SELECT diary_entries.user_id
   FROM diary_entries
  WHERE (diary_entries.id = diary_nutrient_values.diary_entry_id))));
create policy "Users can delete own exercise log" on public.exercise_log for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own exercise log" on public.exercise_log for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own exercise log" on public.exercise_log for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own exercise log" on public.exercise_log for select to public
  using ((auth.uid() = user_id));
create policy "Users can delete own fasting log" on public.fasting_log for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own fasting log" on public.fasting_log for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own fasting log" on public.fasting_log for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own fasting log" on public.fasting_log for select to public
  using ((auth.uid() = user_id));
create policy "Food nutrient values are publicly readable" on public.food_nutrient_values for select to public
  using (true);
create policy "Users can insert food nutrient values for own foods" on public.food_nutrient_values for insert to public
  with check ((auth.uid() = ( SELECT foods.created_by
   FROM foods
  WHERE (foods.id = food_nutrient_values.food_id))));
create policy "Foods are publicly readable" on public.foods for select to public
  using (true);
create policy "Users can insert own custom foods" on public.foods for insert to public
  with check ((auth.uid() = created_by));
create policy "Users can update own custom foods" on public.foods for update to public
  using ((auth.uid() = created_by));
create policy "Users can delete own notes" on public.notes for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own notes" on public.notes for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own notes" on public.notes for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own notes" on public.notes for select to public
  using ((auth.uid() = user_id));
create policy "Nutrients are publicly readable" on public.nutrients for select to public
  using (true);
create policy "Users can insert own profile" on public.profiles for insert to public
  with check ((auth.uid() = id));
create policy "Users can update own profile" on public.profiles for update to public
  using ((auth.uid() = id));
create policy "Users can view own profile" on public.profiles for select to public
  using ((auth.uid() = id));
create policy "Users can delete own recipe ingredients" on public.recipe_ingredients for delete to public
  using ((auth.uid() = ( SELECT recipes.user_id
   FROM recipes
  WHERE (recipes.id = recipe_ingredients.recipe_id))));
create policy "Users can insert own recipe ingredients" on public.recipe_ingredients for insert to public
  with check ((auth.uid() = ( SELECT recipes.user_id
   FROM recipes
  WHERE (recipes.id = recipe_ingredients.recipe_id))));
create policy "Users can view own recipe ingredients" on public.recipe_ingredients for select to public
  using ((auth.uid() = ( SELECT recipes.user_id
   FROM recipes
  WHERE (recipes.id = recipe_ingredients.recipe_id))));
create policy "Users can delete own recipes" on public.recipes for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own recipes" on public.recipes for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own recipes" on public.recipes for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own recipes" on public.recipes for select to public
  using ((auth.uid() = user_id));
create policy "Users can delete own sleep log" on public.sleep_log for delete to public
  using ((auth.uid() = user_id));
create policy "Users can insert own sleep log" on public.sleep_log for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own sleep log" on public.sleep_log for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own sleep log" on public.sleep_log for select to public
  using ((auth.uid() = user_id));
create policy "Users can insert own streaks" on public.streaks for insert to public
  with check ((auth.uid() = user_id));
create policy "Users can update own streaks" on public.streaks for update to public
  using ((auth.uid() = user_id));
create policy "Users can view own streaks" on public.streaks for select to public
  using ((auth.uid() = user_id));
