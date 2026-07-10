-- Sprint 6D follow-up - Doctor portal RLS repair.
-- Fixes doctor self-bootstrap when a doctor auth/profile exists but public.doctors has no row yet.
-- Also allows doctors to read owner profiles for pets/appointments assigned to them.

alter table if exists public.doctors enable row level security;
alter table if exists public.profiles enable row level security;

drop policy if exists "doctors_public_read" on public.doctors;
drop policy if exists "doctors_manage_own" on public.doctors;
drop policy if exists "doctors_select_public" on public.doctors;
drop policy if exists "doctors_insert_own" on public.doctors;
drop policy if exists "doctors_update_own" on public.doctors;
drop policy if exists "doctors_delete_own" on public.doctors;

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

drop policy if exists "profiles_doctor_patient_read" on public.profiles;

create policy "profiles_doctor_patient_read" on public.profiles
for select using (
  auth.uid() = id
  or exists (
    select 1
    from public.appointments a
    join public.doctors d on d.id = a.doctor_id
    where d.profile_id = auth.uid()
      and a.owner_id = profiles.id
  )
  or exists (
    select 1
    from public.pets p
    join public.appointments a on a.pet_id = p.id
    join public.doctors d on d.id = a.doctor_id
    where d.profile_id = auth.uid()
      and p.owner_id = profiles.id
  )
);

notify pgrst, 'reload schema';
