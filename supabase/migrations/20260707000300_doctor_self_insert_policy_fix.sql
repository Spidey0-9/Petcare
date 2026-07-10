-- Sprint 6D follow-up V2 - Doctor self-insert policy fix.
-- The app must be able to bootstrap a doctors row for an authenticated doctor profile.
-- This policy still prevents inserting a row for any other user because profile_id must equal auth.uid().

alter table if exists public.doctors enable row level security;

drop policy if exists "doctors_insert_own" on public.doctors;
drop policy if exists "doctors_manage_own" on public.doctors;

create policy "doctors_insert_own" on public.doctors
for insert with check (auth.uid() = profile_id);

drop policy if exists "doctors_update_own" on public.doctors;
create policy "doctors_update_own" on public.doctors
for update using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "doctors_delete_own" on public.doctors;
create policy "doctors_delete_own" on public.doctors
for delete using (auth.uid() = profile_id);

notify pgrst, 'reload schema';
