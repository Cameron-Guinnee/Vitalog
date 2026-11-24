-- Branded foods store their label nutrients as one row per food instead of one row
-- per value. A value row in food_nutrient_values costs about 111 bytes with its index,
-- so the ~416,000 branded foods would need about 450 MB that way; this table needs
-- about 60 MB, which keeps the database inside the Supabase free plan.
--
-- The app reads nutrients through the food_nutrients view, which combines both tables
-- in the same (food_id, nutrient_id, value) shape, so it doesn't care where a food's
-- values are kept. Values are per 100 g, like food_nutrient_values.

create table public.branded_food_nutrients (
  food_id uuid primary key references public.foods (id) on delete cascade,
  energy real,         -- 1008, kcal
  protein real,        -- 1003, g
  fat real,            -- 1004, g
  carbs real,          -- 1005, g
  fiber real,          -- 1079, g
  sugars real,         -- 1063, g
  added_sugars real,   -- 1235, g
  saturated_fat real,  -- 1258, g
  trans_fat real,      -- 1257, g
  cholesterol real,    -- 1253, mg
  sodium real,         -- 1092, mg
  calcium real,        -- 1087, mg
  iron real,           -- 1088, mg
  potassium real,      -- 1091, mg
  vitamin_d real       -- 1110, mcg
);

comment on table public.branded_food_nutrients is
  'Nutrition-label nutrients per 100 g for branded foods, one row per food. Read them through the food_nutrients view.';

-- Like the other food tables: anyone can read, and only the import (the service role,
-- which bypasses row-level security) can write.
alter table public.branded_food_nutrients enable row level security;
create policy "Branded food nutrients are publicly readable" on public.branded_food_nutrients
  for select to public using (true);

create view public.food_nutrients with (security_invoker = true) as
  select food_id, nutrient_id, value
  from public.food_nutrient_values
  union all
  select b.food_id, v.nutrient_id, v.value::numeric
  from public.branded_food_nutrients b
  cross join lateral (values
    (1008, b.energy), (1003, b.protein), (1004, b.fat), (1005, b.carbs),
    (1079, b.fiber), (1063, b.sugars), (1235, b.added_sugars), (1258, b.saturated_fat),
    (1257, b.trans_fat), (1253, b.cholesterol), (1092, b.sodium), (1087, b.calcium),
    (1088, b.iron), (1091, b.potassium), (1110, b.vitamin_d)
  ) as v (nutrient_id, value)
  where v.value is not null;

comment on view public.food_nutrients is
  'Nutrients per 100 g for every USDA food, whichever table holds them: (food_id, nutrient_id, value).';

grant select on public.food_nutrients to anon, authenticated;
