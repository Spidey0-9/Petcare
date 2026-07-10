-- Sprint 8A - Doctor module production repair.
-- Repairs doctor-owned RLS and provides owned RPCs for app access.
-- The RPCs validate auth.uid() = doctors.profile_id before returning or updating data.

alter table if exists public.doctors enable row level security;

grant select, insert, update, delete on public.doctors to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "doctors_select_public" on public.doctors;
drop policy if exists "doctors_public_read" on public.doctors;
drop policy if exists "doctors_select_own" on public.doctors;
drop policy if exists "doctors_select_own_sprint6h" on public.doctors;
drop policy if exists "doctors_insert_own" on public.doctors;
drop policy if exists "doctors_update_own" on public.doctors;
drop policy if exists "doctors_update_own_sprint6h" on public.doctors;
drop policy if exists "doctors_delete_own" on public.doctors;
drop policy if exists "doctors_manage_own" on public.doctors;

create policy "doctors_select_public" on public.doctors
for select using (true);

create policy "doctors_insert_own" on public.doctors
for insert with check (
  auth.uid() = profile_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'doctor'
  )
);

create policy "doctors_update_own" on public.doctors
for update using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "doctors_delete_own" on public.doctors
for delete using (auth.uid() = profile_id);

create or replace function public.get_current_doctor_profile()
returns public.doctors
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
  _doctor public.doctors;
begin
  _uid := auth.uid();

  if _uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select d.*
    into _doctor
  from public.doctors d
  join public.profiles p on p.id = d.profile_id
  where d.profile_id = _uid
    and p.role = 'doctor'
  limit 1;

  if _doctor.id is null then
    return public.ensure_doctor_profile();
  end if;

  return _doctor;
end;
$$;

create or replace function public.update_own_doctor(
  _doctor_id uuid,
  _patch jsonb
)
returns public.doctors
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
  _existing public.doctors;
  _updated public.doctors;
  _languages text[];
  _certificate_urls text[];
begin
  _uid := auth.uid();

  if _uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select d.*
    into _existing
  from public.doctors d
  join public.profiles p on p.id = d.profile_id
  where d.id = _doctor_id
    and d.profile_id = _uid
    and p.role = 'doctor'
  limit 1;

  if _existing.id is null then
    raise exception 'Doctor row not found for authenticated user' using errcode = '42501';
  end if;

  if jsonb_typeof(_patch -> 'languages') = 'array' then
    select coalesce(array_agg(value), '{}'::text[])
      into _languages
    from jsonb_array_elements_text(_patch -> 'languages') as value;
  else
    _languages := _existing.languages;
  end if;

  if jsonb_typeof(_patch -> 'certificate_urls') = 'array' then
    select coalesce(array_agg(value), '{}'::text[])
      into _certificate_urls
    from jsonb_array_elements_text(_patch -> 'certificate_urls') as value;
  else
    _certificate_urls := _existing.certificate_urls;
  end if;

  update public.doctors
  set
    is_available = case when _patch ? 'is_available' then (_patch ->> 'is_available')::boolean else is_available end,
    availability = case when _patch ? 'availability' then coalesce(_patch -> 'availability', '{}'::jsonb) else availability end,
    specialization = case when _patch ? 'specialization' then nullif(trim(_patch ->> 'specialization'), '') else specialization end,
    qualification = case when _patch ? 'qualification' then nullif(trim(_patch ->> 'qualification'), '') else qualification end,
    experience_years = case when _patch ? 'experience_years' and (_patch ->> 'experience_years') ~ '^\d+$' then (_patch ->> 'experience_years')::integer else experience_years end,
    consultation_fee = case when _patch ? 'consultation_fee' and (_patch ->> 'consultation_fee') ~ '^\d+(\.\d+)?$' then (_patch ->> 'consultation_fee')::numeric else consultation_fee end,
    license_number = case when _patch ? 'license_number' then nullif(trim(_patch ->> 'license_number'), '') else license_number end,
    clinic_name = case when _patch ? 'clinic_name' then nullif(trim(_patch ->> 'clinic_name'), '') else clinic_name end,
    clinic_address = case when _patch ? 'clinic_address' then nullif(trim(_patch ->> 'clinic_address'), '') else clinic_address end,
    languages = _languages,
    bio = case when _patch ? 'bio' then nullif(trim(_patch ->> 'bio'), '') else bio end,
    certificate_urls = _certificate_urls,
    updated_at = now()
  where id = _existing.id
    and profile_id = _uid
  returning * into _updated;

  if _updated.id is null then
    raise exception 'Doctor update returned no rows' using errcode = '42501';
  end if;

  return _updated;
end;
$$;

grant execute on function public.get_current_doctor_profile() to authenticated;
grant execute on function public.update_own_doctor(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
