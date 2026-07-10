-- Sprint 4 - Production Database Recovery Migration A: Safe Infrastructure.
-- Safe to run on an incomplete legacy Supabase project.
-- This migration never casts legacy values, never migrates legacy data, never sets NOT NULL on existing rows,
-- and never creates unique indexes over existing legacy data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add repository-compatible nullable columns to existing legacy tables.
alter table if exists public.doctors add column if not exists experience_years integer;
alter table if exists public.doctors add column if not exists availability jsonb default '{}'::jsonb;
alter table if exists public.doctors add column if not exists review_count integer default 0;
alter table if exists public.doctors add column if not exists license_number text;
alter table if exists public.doctors add column if not exists clinic_name text;
alter table if exists public.doctors add column if not exists clinic_address text;
alter table if exists public.doctors add column if not exists languages text[] default '{}'::text[];
alter table if exists public.doctors add column if not exists bio text;
alter table if exists public.doctors add column if not exists certificate_urls text[] default '{}'::text[];

alter table if exists public.pets add column if not exists image_url text;
alter table if exists public.pets add column if not exists notes text;
alter table if exists public.pets add column if not exists updated_at timestamptz default now();
alter table if exists public.pets add column if not exists type text;
alter table if exists public.pets add column if not exists species text;
alter table if exists public.pets add column if not exists weight numeric(8,2);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  latitude double precision,
  longitude double precision,
  rating numeric(3,2) default 0,
  is_24x7 boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.appointments add column if not exists clinic_id uuid;
alter table if exists public.appointments add column if not exists scheduled_at timestamptz;
alter table if exists public.appointments add column if not exists reason text;
alter table if exists public.appointments add column if not exists report_urls text[];
alter table if exists public.appointments add column if not exists diagnosis text;
alter table if exists public.appointments add column if not exists prescription text;
alter table if exists public.appointments add column if not exists video_url text;

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  type text not null default 'other',
  title text not null,
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null,
  media_urls text[],
  media_type text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles(id) on delete cascade,
  author text,
  content text not null,
  image_url text,
  likes integer not null default 0,
  comments integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'general',
  is_read boolean not null default false,
  data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  file_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  prompt text not null,
  result text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  pet_name text,
  vaccine_name text not null,
  given_date date,
  next_due date,
  vet_name text,
  status text default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('doctor', 'clinic', 'product', 'grooming')),
  target_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('doctor', 'clinic', 'product')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

create table if not exists public.saved_clinics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, clinic_id)
);

create table if not exists public.pet_health_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  weight numeric(8,2),
  health_score integer check (health_score between 0 and 100),
  mood text,
  appetite text,
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.offline_sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  synced_at timestamptz
);

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

-- Foreign keys for legacy existing tables. NOT VALID preserves existing data while enforcing new writes.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_clinic_id_fkey') then
    alter table public.appointments add constraint appointments_clinic_id_fkey foreign key (clinic_id) references public.clinics(id) on delete set null not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_owner_id_fkey') then
    alter table public.appointments add constraint appointments_owner_id_fkey foreign key (owner_id) references public.profiles(id) on delete cascade not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_doctor_id_fkey') then
    alter table public.appointments add constraint appointments_doctor_id_fkey foreign key (doctor_id) references public.doctors(id) on delete cascade not valid;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_pet_id_fkey') then
    alter table public.appointments add constraint appointments_pet_id_fkey foreign key (pet_id) references public.pets(id) on delete cascade not valid;
  end if;
end $$;

-- Non-unique indexes only. Unique indexes over legacy existing data are deferred to Migration B.
create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists doctors_profile_id_idx on public.doctors(profile_id);
create index if not exists appointments_owner_id_idx on public.appointments(owner_id);
create index if not exists appointments_doctor_id_idx on public.appointments(doctor_id);
create index if not exists appointments_scheduled_at_idx on public.appointments(scheduled_at);
create index if not exists medical_records_doctor_id_idx on public.medical_records(doctor_id);
create index if not exists medical_records_pet_id_idx on public.medical_records(pet_id);
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at desc);
create index if not exists clinics_location_idx on public.clinics(latitude, longitude);
create index if not exists reviews_target_idx on public.reviews(target_type, target_id);
create index if not exists favorites_user_target_idx on public.favorites(user_id, target_type);
create index if not exists saved_clinics_user_id_idx on public.saved_clinics(user_id);
create index if not exists pet_health_logs_pet_id_idx on public.pet_health_logs(pet_id, logged_at desc);
create index if not exists offline_sync_queue_user_status_idx on public.offline_sync_queue(user_id, status);
create index if not exists prescriptions_doctor_id_idx on public.prescriptions(doctor_id);
create index if not exists prescriptions_owner_id_idx on public.prescriptions(owner_id);
create index if not exists prescriptions_pet_id_idx on public.prescriptions(pet_id);

create or replace trigger set_doctors_updated_at before update on public.doctors for each row execute function public.set_updated_at();
create or replace trigger set_pets_updated_at before update on public.pets for each row execute function public.set_updated_at();
create or replace trigger set_clinics_updated_at before update on public.clinics for each row execute function public.set_updated_at();
create or replace trigger set_appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create or replace trigger set_posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create or replace trigger set_community_posts_updated_at before update on public.community_posts for each row execute function public.set_updated_at();
create or replace trigger set_comments_updated_at before update on public.comments for each row execute function public.set_updated_at();
create or replace trigger set_reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create or replace trigger set_vaccinations_updated_at before update on public.vaccinations for each row execute function public.set_updated_at();
create or replace trigger set_prescriptions_updated_at before update on public.prescriptions for each row execute function public.set_updated_at();

alter table public.clinics enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.posts enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.ai_predictions enable row level security;
alter table public.vaccinations enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_clinics enable row level security;
alter table public.pet_health_logs enable row level security;
alter table public.offline_sync_queue enable row level security;
alter table public.prescriptions enable row level security;

drop policy if exists "clinics_public_read" on public.clinics;
drop policy if exists "appointments_owner_or_doctor_read" on public.appointments;
drop policy if exists "appointments_owner_insert" on public.appointments;
drop policy if exists "appointments_owner_or_doctor_update" on public.appointments;
drop policy if exists "medical_records_owner_or_doctor_read" on public.medical_records;
drop policy if exists "medical_records_owner_or_doctor_write" on public.medical_records;
drop policy if exists "posts_public_read" on public.posts;
drop policy if exists "posts_owner_write" on public.posts;
drop policy if exists "community_posts_public_read" on public.community_posts;
drop policy if exists "community_posts_owner_write" on public.community_posts;
drop policy if exists "comments_public_read" on public.comments;
drop policy if exists "comments_owner_write" on public.comments;
drop policy if exists "likes_public_read" on public.likes;
drop policy if exists "likes_owner_write" on public.likes;
drop policy if exists "notifications_user_all" on public.notifications;
drop policy if exists "messages_participants_all" on public.messages;
drop policy if exists "ai_predictions_user_all" on public.ai_predictions;
drop policy if exists "vaccinations_user_all" on public.vaccinations;
drop policy if exists "reviews_public_read" on public.reviews;
drop policy if exists "reviews_user_write" on public.reviews;
drop policy if exists "favorites_user_all" on public.favorites;
drop policy if exists "saved_clinics_user_all" on public.saved_clinics;
drop policy if exists "pet_health_logs_user_all" on public.pet_health_logs;
drop policy if exists "offline_sync_queue_user_all" on public.offline_sync_queue;
drop policy if exists "prescriptions_owner_or_doctor_read" on public.prescriptions;
drop policy if exists "prescriptions_doctor_write" on public.prescriptions;

create policy "clinics_public_read" on public.clinics for select using (true);
create policy "appointments_owner_or_doctor_read" on public.appointments for select using (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid()));
create policy "appointments_owner_insert" on public.appointments for insert with check (auth.uid() = owner_id);
create policy "appointments_owner_or_doctor_update" on public.appointments for update using (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid())) with check (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid()));
create policy "medical_records_owner_or_doctor_read" on public.medical_records for select using (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = medical_records.doctor_id and d.profile_id = auth.uid()));
create policy "medical_records_owner_or_doctor_write" on public.medical_records for all using (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = medical_records.doctor_id and d.profile_id = auth.uid())) with check (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = medical_records.doctor_id and d.profile_id = auth.uid()));
create policy "posts_public_read" on public.posts for select using (true);
create policy "posts_owner_write" on public.posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "community_posts_public_read" on public.community_posts for select using (true);
create policy "community_posts_owner_write" on public.community_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_public_read" on public.comments for select using (true);
create policy "comments_owner_write" on public.comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "likes_public_read" on public.likes for select using (true);
create policy "likes_owner_write" on public.likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_user_all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_participants_all" on public.messages for all using (auth.uid() = sender_id or auth.uid() = receiver_id) with check (auth.uid() = sender_id);
create policy "ai_predictions_user_all" on public.ai_predictions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vaccinations_user_all" on public.vaccinations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_user_write" on public.reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorites_user_all" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_clinics_user_all" on public.saved_clinics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pet_health_logs_user_all" on public.pet_health_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "offline_sync_queue_user_all" on public.offline_sync_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prescriptions_owner_or_doctor_read" on public.prescriptions for select using (auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = prescriptions.doctor_id and d.profile_id = auth.uid()));
create policy "prescriptions_doctor_write" on public.prescriptions for all using (exists (select 1 from public.doctors d where d.id = prescriptions.doctor_id and d.profile_id = auth.uid())) with check (exists (select 1 from public.doctors d where d.id = prescriptions.doctor_id and d.profile_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('pet-images', 'pet-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('doctor-images', 'doctor-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('medical-reports', 'medical-reports', true, 20971520, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('community-posts', 'community-posts', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_public_read_petcare" on storage.objects;
drop policy if exists "storage_user_insert_petcare" on storage.objects;
drop policy if exists "storage_user_update_petcare" on storage.objects;
drop policy if exists "storage_user_delete_petcare" on storage.objects;

create policy "storage_public_read_petcare" on storage.objects for select using (bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images'));
create policy "storage_user_insert_petcare" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images'));
create policy "storage_user_update_petcare" on storage.objects for update using (auth.role() = 'authenticated' and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')) with check (auth.role() = 'authenticated' and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images'));
create policy "storage_user_delete_petcare" on storage.objects for delete using (auth.role() = 'authenticated' and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images'));

notify pgrst, 'reload schema';
