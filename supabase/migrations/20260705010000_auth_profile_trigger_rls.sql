-- Phase 1 stabilization: server-side profile creation trigger + RLS fixes.
-- Safe to apply on top of all prior migrations.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Auto-create a profile row whenever a new auth.users record is inserted.
--    This covers the case where email confirmation happens outside the app
--    (e.g. user clicks the link in a browser) so the app-side ensureProfile
--    call is a no-op rather than the sole creator of the row.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
begin
  -- Prefer the role stored in user_metadata, fall back to 'pet_owner'.
  _role := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'role'), ''),
    'pet_owner'
  );

  -- Constrain to allowed values so the check constraint is never violated.
  if _role not in ('pet_owner', 'doctor', 'admin', 'super_admin') then
    _role := 'pet_owner';
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), null),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), null),
    _role
  )
  on conflict (id) do update
    set
      email      = excluded.email,
      full_name  = coalesce(excluded.full_name,  profiles.full_name),
      phone      = coalesce(excluded.phone,      profiles.phone),
      role       = excluded.role,
      updated_at = now()
    -- Only overwrite role if the stored value is the default sentinel,
    -- preventing accidental downgrade of admin/super_admin accounts.
    where profiles.role = 'pet_owner' or excluded.role != 'pet_owner';

  return new;
end;
$$;

-- Drop and recreate so re-running is idempotent.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS policies for profiles
--    Existing repair migration only created select-own, update-own, insert-own.
--    We need a cross-user SELECT so that:
--      - Doctors can look up appointment owners' names/contacts.
--      - The booking flow can display doctor profiles to pet owners.
--    The policy uses authenticated role (not anon) so anonymous visitors
--    cannot enumerate user data.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Remove any prior conflicting public-read policy first.
drop policy if exists "profiles_public_read"          on public.profiles;
drop policy if exists "profiles_authenticated_read"   on public.profiles;

-- All authenticated users can read any profile row (name, email, role, avatar).
-- This is intentional: the appointment module shows doctor profiles to owners
-- and appointment detail screens show owner names to doctors.
create policy "profiles_authenticated_read"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Own-row write policies (kept from prior migration, recreated idempotently).
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using    (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Ensure the updated_at trigger exists (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

notify pgrst, 'reload schema';
