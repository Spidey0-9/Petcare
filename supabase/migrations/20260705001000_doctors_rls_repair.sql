-- Repair doctors RLS policies for authenticated doctor dashboard access.
-- Safe to run after public.profiles and public.doctors exist.

alter table if exists public.doctors enable row level security;

drop policy if exists "doctors_public_read" on public.doctors;
drop policy if exists "doctors_manage_own" on public.doctors;
drop policy if exists "doctors_select_public" on public.doctors;
drop policy if exists "doctors_insert_own" on public.doctors;
drop policy if exists "doctors_update_own" on public.doctors;
drop policy if exists "doctors_delete_own" on public.doctors;

create policy "doctors_select_public" on public.doctors
for select using (true);

create policy "doctors_insert_own" on public.doctors
for insert with check (auth.uid() = profile_id);

create policy "doctors_update_own" on public.doctors
for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "doctors_delete_own" on public.doctors
for delete using (auth.uid() = profile_id);

notify pgrst, 'reload schema';