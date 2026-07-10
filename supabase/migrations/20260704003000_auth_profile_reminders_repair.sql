-- Runtime repair migration for auth/profile/reminders stability.
-- Safe to run after the original PetCare+ migrations.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'pet_owner' check (role in ('pet_owner', 'doctor', 'admin', 'super_admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  type text not null,
  title text not null,
  pet_name text,
  scheduled_at timestamptz,
  date text,
  time text,
  repeat text default 'none',
  is_active boolean not null default true,
  notification_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders add column if not exists user_id uuid default auth.uid() references public.profiles(id) on delete cascade;
alter table public.reminders add column if not exists pet_id uuid references public.pets(id) on delete cascade;
alter table public.reminders add column if not exists type text;
alter table public.reminders add column if not exists title text;
alter table public.reminders add column if not exists pet_name text;
alter table public.reminders add column if not exists scheduled_at timestamptz;
alter table public.reminders add column if not exists date text;
alter table public.reminders add column if not exists time text;
alter table public.reminders add column if not exists repeat text default 'none';
alter table public.reminders add column if not exists is_active boolean not null default true;
alter table public.reminders add column if not exists notification_id text;
alter table public.reminders add column if not exists created_at timestamptz not null default now();
alter table public.reminders add column if not exists updated_at timestamptz not null default now();

update public.reminders set user_id = auth.uid() where user_id is null;

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists reminders_scheduled_at_idx on public.reminders(scheduled_at);
create index if not exists reminders_user_active_idx on public.reminders(user_id, is_active);

create or replace trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create or replace trigger set_reminders_updated_at before update on public.reminders for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "reminders_user_all" on public.reminders;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "reminders_user_all" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Compatibility alias for older app bundles or misspelled database calls.
-- New app code uses public.reminders only.
create or replace view public.remainders as select * from public.reminders;

notify pgrst, 'reload schema';

