-- Sprint 6E - Doctor bootstrap RPC.
-- Provides a production-safe doctor row bootstrap path that does not depend on
-- direct client inserts into public.doctors. The function still validates that
-- the authenticated user owns a doctor profile before inserting anything.

create or replace function public.ensure_doctor_profile()
returns public.doctors
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
  _profile_role text;
  _doctor public.doctors;
begin
  _uid := auth.uid();

  if _uid is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  select role
    into _profile_role
  from public.profiles
  where id = _uid;

  if _profile_role is distinct from 'doctor' then
    raise exception 'Doctor profile required'
      using errcode = '42501';
  end if;

  insert into public.doctors (profile_id)
  values (_uid)
  on conflict (profile_id) do update
    set updated_at = now()
  returning * into _doctor;

  return _doctor;
end;
$$;

grant execute on function public.ensure_doctor_profile() to authenticated;

notify pgrst, 'reload schema';
