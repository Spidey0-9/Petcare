-- PetCare+ production feature extension: payments, reviews, favorites, saved clinics, health logs, and offline sync.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount numeric(10,2) not null default 0,
  method text not null check (method in ('upi', 'credit_card', 'debit_card', 'wallet', 'cash_on_delivery')),
  status text not null default 'pending',
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  invoice_number text not null unique,
  file_url text,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
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

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists reviews_target_idx on public.reviews(target_type, target_id);
create index if not exists favorites_user_target_idx on public.favorites(user_id, target_type);
create index if not exists saved_clinics_user_id_idx on public.saved_clinics(user_id);
create index if not exists pet_health_logs_pet_id_idx on public.pet_health_logs(pet_id, logged_at desc);
create index if not exists offline_sync_queue_user_status_idx on public.offline_sync_queue(user_id, status);

create or replace trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create or replace trigger set_reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_clinics enable row level security;
alter table public.pet_health_logs enable row level security;
alter table public.offline_sync_queue enable row level security;

drop policy if exists "payments_user_all" on public.payments;
drop policy if exists "invoices_user_all" on public.invoices;
drop policy if exists "reviews_public_read" on public.reviews;
drop policy if exists "reviews_user_write" on public.reviews;
drop policy if exists "favorites_user_all" on public.favorites;
drop policy if exists "saved_clinics_user_all" on public.saved_clinics;
drop policy if exists "pet_health_logs_user_all" on public.pet_health_logs;
drop policy if exists "offline_sync_queue_user_all" on public.offline_sync_queue;

create policy "payments_user_all" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_user_all" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_user_write" on public.reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorites_user_all" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_clinics_user_all" on public.saved_clinics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pet_health_logs_user_all" on public.pet_health_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "offline_sync_queue_user_all" on public.offline_sync_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
