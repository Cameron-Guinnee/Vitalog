-- Lets a signed-in user delete their own account.
--
-- profiles has no delete policy, so the Vue app's "Delete account" removed nothing
-- and then signed the user out. Deleting the auth user is what removes everything:
-- profiles cascades from auth.users, and every user table cascades from profiles
-- (custom_meals cascades from auth.users directly).
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
