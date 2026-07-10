-- Sprint 6G - Doctor own read/update policy repair.
-- Fixes PGRST116 after doctor bootstrap by allowing an authenticated doctor
-- to read and update the public.doctors row whose profile_id is auth.uid().

alter table if exists public.doctors enable row level security;

drop policy if exists "doctors_select_public" on public.doctors;
drop policy if exists "doctors_public_read" on public.doctors;
drop policy if exists "doctors_select_own" on public.doctors;
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

notify pgrst, 'reload schema';
