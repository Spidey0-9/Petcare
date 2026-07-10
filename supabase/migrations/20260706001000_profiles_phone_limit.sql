-- Enforce a maximum of 10 digits for profile phone values.
-- Null/empty phone values are allowed. Saved phone values may contain digits only.

alter table public.profiles
  drop constraint if exists profiles_phone_10_digits_check;

update public.profiles
set phone = nullif(left(regexp_replace(phone, '\D', '', 'g'), 10), '')
where phone is not null;

alter table public.profiles
  add constraint profiles_phone_10_digits_check
  check (phone is null or phone ~ '^\d{1,10}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
  _phone text;
begin
  _role := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'role'), ''),
    'pet_owner'
  );

  if _role not in ('pet_owner', 'doctor', 'admin', 'super_admin') then
    _role := 'pet_owner';
  end if;

  _phone := nullif(left(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g'), 10), '');

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), null),
    _phone,
    _role
  )
  on conflict (id) do update
    set
      email      = excluded.email,
      full_name  = coalesce(excluded.full_name, profiles.full_name),
      phone      = coalesce(excluded.phone, profiles.phone),
      role       = excluded.role,
      updated_at = now()
    where profiles.role = 'pet_owner' or excluded.role != 'pet_owner';

  return new;
end;
$$;

notify pgrst, 'reload schema';