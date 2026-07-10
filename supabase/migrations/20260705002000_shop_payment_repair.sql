-- Shop and payment repair migration.
-- Safe to run on an existing project: creates only missing objects and refreshes PostgREST schema cache.

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

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount numeric(10,2) not null default 0,
  method text not null default 'online_gateway',
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

create table if not exists public.payment_gateway_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_session_id text,
  checkout_url text,
  status text not null default 'created',
  amount numeric(10,2) not null default 0,
  currency text not null default 'INR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'expired')),
  starts_at timestamptz,
  expires_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.products add column if not exists updated_at timestamptz not null default now();
alter table if exists public.cart add column if not exists updated_at timestamptz not null default now();
alter table if exists public.orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table if exists public.orders add column if not exists shipping_address jsonb;
alter table if exists public.orders add column if not exists updated_at timestamptz not null default now();
alter table if exists public.payments add column if not exists provider_reference text;
alter table if exists public.payments add column if not exists updated_at timestamptz not null default now();
alter table if exists public.payment_gateway_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.payment_gateway_sessions add column if not exists updated_at timestamptz not null default now();

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%method%';

  if constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.payments
  add constraint payments_method_check
  check (method in ('upi', 'credit_card', 'debit_card', 'wallet', 'cash_on_delivery', 'online_gateway'));

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists wishlist_user_id_idx on public.wishlist(user_id);
create index if not exists cart_user_id_idx on public.cart(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists payment_gateway_sessions_user_id_idx on public.payment_gateway_sessions(user_id);
create index if not exists payment_gateway_sessions_payment_id_idx on public.payment_gateway_sessions(payment_id);
create index if not exists payment_gateway_sessions_provider_session_id_idx on public.payment_gateway_sessions(provider_session_id);
create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_status_idx on public.memberships(status);

create or replace trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create or replace trigger set_cart_updated_at before update on public.cart for each row execute function public.set_updated_at();
create or replace trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create or replace trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create or replace trigger set_payment_gateway_sessions_updated_at before update on public.payment_gateway_sessions for each row execute function public.set_updated_at();
create or replace trigger set_memberships_updated_at before update on public.memberships for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.wishlist enable row level security;
alter table public.cart enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_gateway_sessions enable row level security;
alter table public.memberships enable row level security;

drop policy if exists "categories_public_read" on public.categories;
drop policy if exists "products_public_read" on public.products;
drop policy if exists "wishlist_user_all" on public.wishlist;
drop policy if exists "cart_user_all" on public.cart;
drop policy if exists "orders_user_all" on public.orders;
drop policy if exists "payments_user_all" on public.payments;
drop policy if exists "invoices_user_all" on public.invoices;
drop policy if exists "payment_gateway_sessions_user_read" on public.payment_gateway_sessions;
drop policy if exists "memberships_user_read" on public.memberships;
drop policy if exists "memberships_user_insert" on public.memberships;

create policy "categories_public_read" on public.categories for select using (true);
create policy "products_public_read" on public.products for select using (true);
create policy "wishlist_user_all" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart_user_all" on public.cart for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders_user_all" on public.orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payments_user_all" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_user_all" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payment_gateway_sessions_user_read" on public.payment_gateway_sessions for select using (auth.uid() = user_id);
create policy "memberships_user_read" on public.memberships for select using (auth.uid() = user_id);
create policy "memberships_user_insert" on public.memberships for insert with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
