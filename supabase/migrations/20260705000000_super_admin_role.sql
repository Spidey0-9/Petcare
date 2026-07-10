-- Allow development super admin accounts without recreating existing tables.
-- Safe to run after the base PetCare+ schema.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles drop constraint if exists profiles_role_check;
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('pet_owner', 'doctor', 'admin', 'super_admin'));
  end if;
end $$;

notify pgrst, 'reload schema';