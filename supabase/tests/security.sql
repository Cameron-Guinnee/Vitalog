-- Checks the row-level security rules. Every block raises if a rule is broken.
\set ON_ERROR_STOP 1

insert into auth.users values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.foods (name) values ('Apple');
insert into public.nutrients (id, name, unit, category) values (1008, 'Energy', 'kcal', 'General');

-- Signup creates a free profile.
do $$ begin
  assert (select count(*) from public.profiles where subscription_tier = 'free') = 2, 'signup should create free profiles';
end $$;

-- Signed-in user A.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$ begin
  assert (select count(*) from public.profiles) = 1, 'a user should only see their own profile';

  update public.profiles set display_name = 'Alice' where id = auth.uid();
  assert (select display_name from public.profiles) = 'Alice', 'a user should be able to edit their profile';

  begin
    update public.profiles set subscription_tier = 'pro' where id = auth.uid();
    raise exception 'a user was able to give themselves pro';
  exception when insufficient_privilege then null;
  end;

  update public.foods set name = 'Hacked';
  delete from public.foods;
  assert (select name from public.foods) = 'Apple', 'a user should not be able to change shared foods';

  insert into public.diary_entries (user_id, meal_type, quantity, serving_unit, logged_at)
    values (auth.uid(), 'breakfast', 1, 'g', now());
  begin
    insert into public.diary_entries (user_id, meal_type, quantity, serving_unit, logged_at)
      values ('22222222-2222-2222-2222-222222222222', 'breakfast', 1, 'g', now());
    raise exception 'a user was able to write to another user''s diary';
  exception when insufficient_privilege then null;
  end;

  -- Custom foods, recipes and their nutrients.
  insert into public.custom_foods (id, user_id, name) values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Bread');
  insert into public.custom_food_nutrient_values values ('aaaaaaaa-0000-0000-0000-000000000001', 1008, 120);
  update public.custom_food_nutrient_values set value = 130;
  assert (select value from public.custom_food_nutrient_values) = 130, 'a user should be able to edit their custom food''s nutrients';
  insert into public.recipes (id, user_id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', auth.uid(), 'Toast');
  insert into public.recipe_ingredients (recipe_id, custom_food_id, quantity, serving_unit)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 2, 'serving');
  begin
    insert into public.recipe_ingredients (recipe_id, quantity, serving_unit) values ('bbbbbbbb-0000-0000-0000-000000000001', 1, 'serving');
    raise exception 'a recipe ingredient was saved without a food';
  exception when check_violation then null;
  end;
  insert into public.diary_entries (user_id, recipe_id, meal_type, quantity, serving_unit, logged_at)
    values (auth.uid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'lunch', 1, 'serving', now());

  insert into public.biometric_snapshots (user_id, metrics) values (auth.uid(), '{"weight": {"value": 180, "unit": "lbs"}}');
  begin
    insert into public.biometric_snapshots (user_id) values ('22222222-2222-2222-2222-222222222222');
    raise exception 'a user was able to save a snapshot for another user';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Signed-in user B can't see or delete A's snapshot.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

do $$ begin
  assert (select count(*) from public.biometric_snapshots) = 0, 'a user should not see another user''s snapshots';
  delete from public.biometric_snapshots;
  assert (select count(*) from public.custom_food_nutrient_values) = 0, 'a user should not see another user''s custom food nutrients';
  update public.custom_food_nutrient_values set value = 1;
  assert (select count(*) from public.recipe_ingredients) = 0, 'a user should not see another user''s recipe ingredients';
end $$;

reset role;
do $$ begin
  assert (select count(*) from public.biometric_snapshots) = 1, 'a user should not be able to delete another user''s snapshots';
  assert (select value from public.custom_food_nutrient_values) = 130, 'a user should not be able to edit another user''s custom food nutrients';
end $$;
set role authenticated;

-- Signed-out visitor.
reset role;
set role anon;
set request.jwt.claim.sub = '';

do $$ begin
  update public.foods set name = 'Hacked';
  assert (select name from public.foods) = 'Apple', 'anon should not be able to change shared foods';
  assert (select count(*) from public.foods) = 1, 'anon should be able to read foods';
  assert (select count(*) from public.diary_entries) = 0, 'anon should not see any diary entries';
end $$;

-- Account deletion: anon can't call it, and user B deleting their account leaves A's data alone.
do $$ begin
  begin
    perform public.delete_own_account();
    raise exception 'anon was able to call delete_own_account';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.diary_entries (user_id, meal_type, quantity, serving_unit, logged_at)
  values (auth.uid(), 'dinner', 1, 'g', now());
select public.delete_own_account();

reset role;
do $$ begin
  assert not exists (select from auth.users where id = '22222222-2222-2222-2222-222222222222'), 'delete_own_account should remove the auth user';
  assert not exists (select from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'delete_own_account should remove the profile';
  assert not exists (select from public.diary_entries where user_id = '22222222-2222-2222-2222-222222222222'), 'delete_own_account should remove the diary';
  assert exists (select from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'deleting one account should leave other accounts alone';
  assert (select count(*) from public.diary_entries) = 2, 'deleting one account should leave other users'' diaries alone';
end $$;
set role anon;

-- Billing service.
reset role;
set role service_role;

do $$ begin
  update public.profiles set subscription_tier = 'pro' where display_name = 'Alice';
  assert (select subscription_tier from public.profiles where display_name = 'Alice') = 'pro', 'the service role should be able to set pro';
end $$;

reset role;
\echo 'security checks passed'
