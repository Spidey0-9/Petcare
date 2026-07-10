-- PetCare+ backend schema for Supabase
-- Apply in Supabase SQL Editor or with: supabase db push

create extension if not exists pgcrypto;
create extension if not exists cube;
create extension if not exists earthdistance;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  specialization text,
  qualification text,
  experience_years integer default 0,
  consultation_fee numeric(10,2) default 0,
  is_available boolean not null default true,
  availability jsonb not null default '{}'::jsonb,
  rating numeric(3,2) default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  species text,
  type text,
  breed text,
  gender text,
  age integer,
  date_of_birth date,
  weight numeric(8,2),
  color text,
  image_url text,
  notes text,
  microchip_number text,
  blood_group text,
  allergies text,
  medical_conditions text,
  vaccination_status text,
  owner_name text,
  emergency_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete set null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  reason text,
  notes text,
  report_urls text[],
  diagnosis text,
  prescription text,
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists appointments_no_double_booking_idx
on public.appointments (doctor_id, scheduled_at)
where status not in ('cancelled', 'rejected');

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

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  stock integer not null default 0,
  image_url text,
  rating numeric(3,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  total numeric(10,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists appointments_owner_id_idx on public.appointments(owner_id);
create index if not exists appointments_doctor_id_idx on public.appointments(doctor_id);
create index if not exists appointments_scheduled_at_idx on public.appointments(scheduled_at);
create index if not exists medical_records_pet_id_idx on public.medical_records(pet_id);
create index if not exists reminders_user_id_idx on public.reminders(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at desc);
create index if not exists clinics_location_idx on public.clinics(latitude, longitude);

create or replace trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create or replace trigger set_doctors_updated_at before update on public.doctors for each row execute function public.set_updated_at();
create or replace trigger set_pets_updated_at before update on public.pets for each row execute function public.set_updated_at();
create or replace trigger set_appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create or replace trigger set_reminders_updated_at before update on public.reminders for each row execute function public.set_updated_at();
create or replace trigger set_posts_updated_at before update on public.posts for each row execute function public.set_updated_at();
create or replace trigger set_community_posts_updated_at before update on public.community_posts for each row execute function public.set_updated_at();
create or replace trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create or replace trigger set_cart_updated_at before update on public.cart for each row execute function public.set_updated_at();
create or replace trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'pet_owner')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.pets enable row level security;
alter table public.clinics enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.reminders enable row level security;
alter table public.posts enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.wishlist enable row level security;
alter table public.cart enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.ai_predictions enable row level security;
alter table public.vaccinations enable row level security;


drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "doctors_public_read" on public.doctors;
drop policy if exists "doctors_manage_own" on public.doctors;
drop policy if exists "pets_owner_all" on public.pets;
drop policy if exists "clinics_public_read" on public.clinics;
drop policy if exists "appointments_owner_or_doctor_read" on public.appointments;
drop policy if exists "appointments_owner_insert" on public.appointments;
drop policy if exists "appointments_owner_or_doctor_update" on public.appointments;
drop policy if exists "medical_records_owner_or_doctor_read" on public.medical_records;
drop policy if exists "medical_records_owner_or_doctor_write" on public.medical_records;
drop policy if exists "reminders_user_all" on public.reminders;
drop policy if exists "posts_public_read" on public.posts;
drop policy if exists "posts_owner_write" on public.posts;
drop policy if exists "community_posts_public_read" on public.community_posts;
drop policy if exists "community_posts_owner_write" on public.community_posts;
drop policy if exists "comments_public_read" on public.comments;
drop policy if exists "comments_owner_write" on public.comments;
drop policy if exists "likes_public_read" on public.likes;
drop policy if exists "likes_owner_write" on public.likes;
drop policy if exists "notifications_user_all" on public.notifications;
drop policy if exists "categories_public_read" on public.categories;
drop policy if exists "products_public_read" on public.products;
drop policy if exists "wishlist_user_all" on public.wishlist;
drop policy if exists "cart_user_all" on public.cart;
drop policy if exists "orders_user_all" on public.orders;
drop policy if exists "messages_participants_all" on public.messages;
drop policy if exists "ai_predictions_user_all" on public.ai_predictions;
drop policy if exists "vaccinations_user_all" on public.vaccinations;
drop policy if exists "storage_public_read_petcare" on storage.objects;
drop policy if exists "storage_user_insert_petcare" on storage.objects;
drop policy if exists "storage_user_update_petcare" on storage.objects;
drop policy if exists "storage_user_delete_petcare" on storage.objects;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

create policy "doctors_public_read" on public.doctors for select using (true);
create policy "doctors_manage_own" on public.doctors for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "pets_owner_all" on public.pets for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "clinics_public_read" on public.clinics for select using (true);

create policy "appointments_owner_or_doctor_read" on public.appointments for select using (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid())
);
create policy "appointments_owner_insert" on public.appointments for insert with check (auth.uid() = owner_id);
create policy "appointments_owner_or_doctor_update" on public.appointments for update using (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid())
) with check (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid())
);

create policy "medical_records_owner_or_doctor_read" on public.medical_records for select using (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = medical_records.doctor_id and d.profile_id = auth.uid())
);
create policy "medical_records_owner_or_doctor_write" on public.medical_records for all using (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = medical_records.doctor_id and d.profile_id = auth.uid())
) with check (
  auth.uid() = owner_id or exists (select 1 from public.doctors d where d.id = medical_records.doctor_id and d.profile_id = auth.uid())
);

create policy "reminders_user_all" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts_public_read" on public.posts for select using (true);
create policy "posts_owner_write" on public.posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "community_posts_public_read" on public.community_posts for select using (true);
create policy "community_posts_owner_write" on public.community_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_public_read" on public.comments for select using (true);
create policy "comments_owner_write" on public.comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "likes_public_read" on public.likes for select using (true);
create policy "likes_owner_write" on public.likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_user_all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_public_read" on public.categories for select using (true);
create policy "products_public_read" on public.products for select using (true);
create policy "wishlist_user_all" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart_user_all" on public.cart for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders_user_all" on public.orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_participants_all" on public.messages for all using (auth.uid() = sender_id or auth.uid() = receiver_id) with check (auth.uid() = sender_id);
create policy "ai_predictions_user_all" on public.ai_predictions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vaccinations_user_all" on public.vaccinations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('pet-images', 'pet-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('doctor-images', 'doctor-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('medical-reports', 'medical-reports', true, 20971520, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('community-posts', 'community-posts', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "storage_public_read_petcare" on storage.objects for select using (
  bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
);

create policy "storage_user_insert_petcare" on storage.objects for insert with check (
  auth.role() = 'authenticated'
  and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
);

create policy "storage_user_update_petcare" on storage.objects for update using (
  auth.role() = 'authenticated'
  and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
) with check (
  auth.role() = 'authenticated'
  and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
);

create policy "storage_user_delete_petcare" on storage.objects for delete using (
  auth.role() = 'authenticated'
  and bucket_id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
);

