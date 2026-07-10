-- Doctor module support: profile fields, prescription storage, and performance indexes.

alter table public.doctors add column if not exists license_number text;
alter table public.doctors add column if not exists clinic_name text;
alter table public.doctors add column if not exists clinic_address text;
alter table public.doctors add column if not exists languages text[] default '{}'::text[];
alter table public.doctors add column if not exists bio text;
alter table public.doctors add column if not exists certificate_urls text[] default '{}'::text[];

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  medicines jsonb not null default '[]'::jsonb,
  notes text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctors_profile_id_idx on public.doctors(profile_id);
create index if not exists prescriptions_doctor_id_idx on public.prescriptions(doctor_id);
create index if not exists prescriptions_owner_id_idx on public.prescriptions(owner_id);
create index if not exists prescriptions_pet_id_idx on public.prescriptions(pet_id);
create index if not exists medical_records_doctor_id_idx on public.medical_records(doctor_id);
create index if not exists medical_records_pet_id_idx on public.medical_records(pet_id);

create or replace trigger set_prescriptions_updated_at before update on public.prescriptions for each row execute function public.set_updated_at();

alter table public.prescriptions enable row level security;

drop policy if exists "prescriptions_owner_or_doctor_read" on public.prescriptions;
drop policy if exists "prescriptions_doctor_write" on public.prescriptions;

create policy "prescriptions_owner_or_doctor_read" on public.prescriptions for select using (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = prescriptions.doctor_id and d.profile_id = auth.uid())
);

create policy "prescriptions_doctor_write" on public.prescriptions for all using (
  exists (select 1 from public.doctors d where d.id = prescriptions.doctor_id and d.profile_id = auth.uid())
) with check (
  exists (select 1 from public.doctors d where d.id = prescriptions.doctor_id and d.profile_id = auth.uid())
);

notify pgrst, 'reload schema';
