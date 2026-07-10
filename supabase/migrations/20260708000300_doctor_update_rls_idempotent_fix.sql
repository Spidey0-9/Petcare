-- Sprint 6H - Doctor UPDATE RLS idempotent repair.
-- Adds missing own-row read/update policies without dropping or replacing
-- existing policies. This fixes authenticated doctor updates that return
-- zero rows because public.doctors is hidden by RLS.

alter table if exists public.doctors enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doctors'
      and policyname = 'doctors_select_own_sprint6h'
  ) then
    create policy "doctors_select_own_sprint6h" on public.doctors
    for select using (auth.uid() = profile_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doctors'
      and policyname = 'doctors_update_own_sprint6h'
  ) then
    create policy "doctors_update_own_sprint6h" on public.doctors
    for update using (auth.uid() = profile_id)
    with check (auth.uid() = profile_id);
  end if;
end $$;

notify pgrst, 'reload schema';
