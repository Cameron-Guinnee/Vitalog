-- Custom foods, meals and recipes, as the Foods screens and the diary use them.

-- 1. Deleting a custom food cascaded to every diary entry that used it, wiping
--    past days. Custom foods and recipes are now archived instead: hidden from
--    lists and search, but still there for the diary entries that point at them.
alter table public.custom_foods add column archived_at timestamp with time zone;
alter table public.recipes add column archived_at timestamp with time zone;

comment on table public.custom_food_nutrient_values is
  'Nutrients per serving of the custom food (as on a nutrition label), unlike food_nutrient_values, which are per 100 g.';

-- Editing a custom food updates its nutrients in place.
create policy "Users can update own custom food nutrient values" on public.custom_food_nutrient_values for update to authenticated
  using ((select auth.uid()) = (select custom_foods.user_id from public.custom_foods where custom_foods.id = custom_food_nutrient_values.custom_food_id))
  with check ((select auth.uid()) = (select custom_foods.user_id from public.custom_foods where custom_foods.id = custom_food_nutrient_values.custom_food_id));

-- 2. Recipe ingredients could only be USDA foods. They can now be custom foods too,
--    and exactly one of the two must be set. serving_unit is 'serving' or '100 g'.
alter table public.recipe_ingredients alter column food_id drop not null;
alter table public.recipe_ingredients add column custom_food_id uuid references public.custom_foods(id) on delete cascade;
alter table public.recipe_ingredients add constraint recipe_ingredients_one_food check (num_nonnulls(food_id, custom_food_id) = 1);
create index if not exists recipe_ingredients_custom_food_idx on public.recipe_ingredients (custom_food_id);

-- Meal items name exactly one food as well. NOT VALID so any old rows that break the
-- rule don't stop the migration; new and changed rows are still checked.
alter table public.custom_meal_items add constraint custom_meal_items_one_food check (num_nonnulls(food_id, custom_food_id) = 1) not valid;
create index if not exists custom_meal_items_custom_food_idx on public.custom_meal_items (custom_food_id);
create index if not exists custom_meal_items_food_idx on public.custom_meal_items (food_id);

-- 3. A diary entry can be servings of a recipe.
alter table public.diary_entries add column recipe_id uuid references public.recipes(id) on delete set null;
create index if not exists diary_entries_recipe_idx on public.diary_entries (recipe_id);
