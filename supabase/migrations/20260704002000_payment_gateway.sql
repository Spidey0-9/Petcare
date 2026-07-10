-- Payment gateway support for hosted Razorpay checkout sessions.

create table if not exists public.payment_gateway_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay', 'mock')),
  provider_session_id text,
  checkout_url text,
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'cancelled', 'expired')),
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

create index if not exists payment_gateway_sessions_user_id_idx on public.payment_gateway_sessions(user_id);
create index if not exists payment_gateway_sessions_payment_id_idx on public.payment_gateway_sessions(payment_id);
create index if not exists payment_gateway_sessions_provider_session_id_idx on public.payment_gateway_sessions(provider_session_id);
create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_status_idx on public.memberships(status);

create or replace trigger set_payment_gateway_sessions_updated_at before update on public.payment_gateway_sessions for each row execute function public.set_updated_at();
create or replace trigger set_memberships_updated_at before update on public.memberships for each row execute function public.set_updated_at();

alter table public.payment_gateway_sessions enable row level security;
alter table public.memberships enable row level security;

drop policy if exists "payment_gateway_sessions_user_read" on public.payment_gateway_sessions;
drop policy if exists "memberships_user_read" on public.memberships;
drop policy if exists "memberships_user_insert" on public.memberships;

create policy "payment_gateway_sessions_user_read" on public.payment_gateway_sessions
  for select using (auth.uid() = user_id);

create policy "memberships_user_read" on public.memberships
  for select using (auth.uid() = user_id);

create policy "memberships_user_insert" on public.memberships
  for insert with check (auth.uid() = user_id);
