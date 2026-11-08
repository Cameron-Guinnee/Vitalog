-- Checks the row-level security rules. Every block raises if a rule is broken.
\set ON_ERROR_STOP 1

insert into auth.users values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.foods (name) values ('Apple');

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
end $$;

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

-- Billing service.
reset role;
set role service_role;

do $$ begin
  update public.profiles set subscription_tier = 'pro' where display_name = 'Alice';
  assert (select subscription_tier from public.profiles where display_name = 'Alice') = 'pro', 'the service role should be able to set pro';
end $$;

reset role;
\echo 'security checks passed'
