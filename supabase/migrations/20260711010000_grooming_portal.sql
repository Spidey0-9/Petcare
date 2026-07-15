-- Sprint 16 - Production Ready Groomer Portal foundation.
-- Adds the grooming-specific schema without changing existing appointment/payment tables.
-- Safe to run repeatedly: all objects are additive or idempotently replaced.

create extension if not exists pgcrypto;

alter table if exists public.profiles drop constraint if exists profiles_role_check;
alter table if exists public.profiles
  add constraint profiles_role_check
  check (role in ('pet_owner', 'doctor', 'groomer', 'admin', 'super_admin'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

create table if not exists public.grooming_clinics (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  area text,
  city text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  logo_url text,
  cover_image text,
  gallery_images text[] not null default '{}'::text[],
  description text,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  is_active boolean not null default false,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  opening_time text,
  closing_time text,
  working_days text[] not null default array['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
  pickup_available boolean not null default false,
  dropoff_available boolean not null default false,
  emergency_grooming boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groomers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id uuid references public.grooming_clinics(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  specializations text[] not null default '{}'::text[],
  experience_years integer not null default 0,
  bio text,
  profile_image_url text,
  rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  is_available boolean not null default true,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  availability jsonb not null default '{"monday":["09:00","10:00","11:00","17:00","18:00"],"tuesday":["09:00","10:00","11:00","17:00","18:00"],"wednesday":["09:00","10:00","11:00","17:00","18:00"],"thursday":["09:00","10:00","11:00","17:00","18:00"],"friday":["09:00","10:00","11:00","17:00","18:00"],"saturday":["10:00","11:00","16:00","17:00"],"sunday":["10:00","11:00"]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grooming_services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.grooming_clinics(id) on delete cascade,
  groomer_id uuid references public.groomers(id) on delete set null,
  name text not null,
  description text,
  pet_species text,
  price numeric(10,2) not null default 0,
  duration_minutes integer not null default 60,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grooming_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  groomer_id uuid references public.groomers(id) on delete set null,
  clinic_id uuid not null references public.grooming_clinics(id) on delete cascade,
  service_id uuid not null references public.grooming_services(id) on delete restrict,
  scheduled_at timestamptz not null,
  service_date date not null,
  service_time time not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'rescheduled')),
  pickup_required boolean not null default false,
  dropoff_required boolean not null default false,
  service_address text,
  symptoms text,
  medical_notes text,
  ai_safety_notes text,
  price numeric(10,2) not null default 0,
  payment_status text not null default 'pending',
  payment_id uuid references public.payments(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists groomers_profile_id_unique_idx on public.groomers(profile_id);
create index if not exists grooming_clinics_status_idx on public.grooming_clinics(approval_status, is_active);
create index if not exists grooming_clinics_city_area_idx on public.grooming_clinics(city, area);
create index if not exists grooming_services_clinic_id_idx on public.grooming_services(clinic_id);
create index if not exists grooming_services_active_idx on public.grooming_services(is_active);
create index if not exists grooming_bookings_owner_id_idx on public.grooming_bookings(owner_id, scheduled_at desc);
create index if not exists grooming_bookings_groomer_id_idx on public.grooming_bookings(groomer_id, scheduled_at desc);
create index if not exists grooming_bookings_clinic_id_idx on public.grooming_bookings(clinic_id, scheduled_at desc);
create index if not exists grooming_bookings_status_idx on public.grooming_bookings(status);

create or replace trigger set_grooming_clinics_updated_at before update on public.grooming_clinics for each row execute function public.set_updated_at();
create or replace trigger set_groomers_updated_at before update on public.groomers for each row execute function public.set_updated_at();
create or replace trigger set_grooming_services_updated_at before update on public.grooming_services for each row execute function public.set_updated_at();
create or replace trigger set_grooming_bookings_updated_at before update on public.grooming_bookings for each row execute function public.set_updated_at();

alter table public.grooming_clinics enable row level security;
alter table public.groomers enable row level security;
alter table public.grooming_services enable row level security;
alter table public.grooming_bookings enable row level security;

drop policy if exists "grooming_clinics_public_read_active" on public.grooming_clinics;
drop policy if exists "grooming_clinics_owner_insert" on public.grooming_clinics;
drop policy if exists "grooming_clinics_owner_update" on public.grooming_clinics;
drop policy if exists "grooming_clinics_admin_all" on public.grooming_clinics;

create policy "grooming_clinics_public_read_active" on public.grooming_clinics
for select using (is_active = true and approval_status = 'approved' or public.is_admin_user() or owner_profile_id = auth.uid());
create policy "grooming_clinics_owner_insert" on public.grooming_clinics
for insert with check (owner_profile_id = auth.uid());
create policy "grooming_clinics_owner_update" on public.grooming_clinics
for update using (owner_profile_id = auth.uid()) with check (owner_profile_id = auth.uid());
create policy "grooming_clinics_admin_all" on public.grooming_clinics
for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "groomers_public_read_approved" on public.groomers;
drop policy if exists "groomers_insert_own" on public.groomers;
drop policy if exists "groomers_update_own" on public.groomers;
drop policy if exists "groomers_admin_all" on public.groomers;

create policy "groomers_public_read_approved" on public.groomers
for select using (approval_status = 'approved' or profile_id = auth.uid() or public.is_admin_user());
create policy "groomers_insert_own" on public.groomers
for insert with check (
  profile_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'groomer')
);
create policy "groomers_update_own" on public.groomers
for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "groomers_admin_all" on public.groomers
for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "grooming_services_public_read_active" on public.grooming_services;
drop policy if exists "grooming_services_groomer_manage" on public.grooming_services;
drop policy if exists "grooming_services_admin_all" on public.grooming_services;

create policy "grooming_services_public_read_active" on public.grooming_services
for select using (
  is_active = true
  and exists (
    select 1 from public.grooming_clinics c
    where c.id = grooming_services.clinic_id
      and c.is_active = true
      and c.approval_status = 'approved'
  )
  or public.is_admin_user()
  or exists (select 1 from public.groomers g where g.id = grooming_services.groomer_id and g.profile_id = auth.uid())
);
create policy "grooming_services_groomer_manage" on public.grooming_services
for all using (exists (select 1 from public.groomers g where g.id = grooming_services.groomer_id and g.profile_id = auth.uid()))
with check (exists (select 1 from public.groomers g where g.id = grooming_services.groomer_id and g.profile_id = auth.uid()));
create policy "grooming_services_admin_all" on public.grooming_services
for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "grooming_bookings_owner_or_groomer_read" on public.grooming_bookings;
drop policy if exists "grooming_bookings_owner_insert" on public.grooming_bookings;
drop policy if exists "grooming_bookings_owner_or_groomer_update" on public.grooming_bookings;
drop policy if exists "grooming_bookings_admin_all" on public.grooming_bookings;

create policy "grooming_bookings_owner_or_groomer_read" on public.grooming_bookings
for select using (
  owner_id = auth.uid()
  or exists (select 1 from public.groomers g where g.id = grooming_bookings.groomer_id and g.profile_id = auth.uid())
  or public.is_admin_user()
);
create policy "grooming_bookings_owner_insert" on public.grooming_bookings
for insert with check (owner_id = auth.uid());
create policy "grooming_bookings_owner_or_groomer_update" on public.grooming_bookings
for update using (
  owner_id = auth.uid()
  or exists (select 1 from public.groomers g where g.id = grooming_bookings.groomer_id and g.profile_id = auth.uid())
) with check (
  owner_id = auth.uid()
  or exists (select 1 from public.groomers g where g.id = grooming_bookings.groomer_id and g.profile_id = auth.uid())
);
create policy "grooming_bookings_admin_all" on public.grooming_bookings
for all using (public.is_admin_user()) with check (public.is_admin_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grooming-images', 'grooming-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_public_read_grooming" on storage.objects;
drop policy if exists "storage_authenticated_write_grooming" on storage.objects;

create policy "storage_public_read_grooming" on storage.objects for select using (bucket_id = 'grooming-images');
create policy "storage_authenticated_write_grooming" on storage.objects for all using (
  auth.role() = 'authenticated' and bucket_id = 'grooming-images'
) with check (
  auth.role() = 'authenticated' and bucket_id = 'grooming-images'
);

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
  _role := coalesce(nullif(trim(new.raw_user_meta_data ->> 'role'), ''), 'pet_owner');

  if _role not in ('pet_owner', 'doctor', 'groomer', 'admin', 'super_admin') then
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
