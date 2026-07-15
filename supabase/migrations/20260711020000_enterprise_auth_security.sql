-- Enterprise Authentication & Security foundation.
-- Adds audit, login history, device, and security settings tables for Supabase-backed auth.
-- Idempotent and additive. Existing auth/profile tables are not recreated.

create extension if not exists pgcrypto;

create table if not exists public.user_security_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  biometric_enabled boolean not null default false,
  mfa_enabled boolean not null default false,
  mfa_required boolean not null default false,
  remember_me_enabled boolean not null default true,
  session_timeout_minutes integer not null default 1440,
  force_logout_after timestamptz,
  preferred_login_method text not null default 'password' check (preferred_login_method in ('password','phone_otp','google','apple','biometric')),
  last_login_at timestamptz,
  last_login_method text,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text,
  platform text,
  app_version text,
  device_fingerprint text,
  push_token text,
  trusted boolean not null default false,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, device_fingerprint)
);

create table if not exists public.auth_login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  login_method text not null,
  success boolean not null,
  failure_reason text,
  role text,
  device_name text,
  platform text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  created_at timestamptz not null default now()
);

create index if not exists user_security_settings_user_id_idx on public.user_security_settings(user_id);
create index if not exists auth_devices_user_id_idx on public.auth_devices(user_id);
create index if not exists auth_devices_fingerprint_idx on public.auth_devices(device_fingerprint);
create index if not exists auth_login_history_user_id_idx on public.auth_login_history(user_id, created_at desc);
create index if not exists auth_login_history_email_idx on public.auth_login_history(email, created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);

create or replace trigger set_user_security_settings_updated_at before update on public.user_security_settings for each row execute function public.set_updated_at();
create or replace trigger set_auth_devices_updated_at before update on public.auth_devices for each row execute function public.set_updated_at();

alter table public.user_security_settings enable row level security;
alter table public.auth_devices enable row level security;
alter table public.auth_login_history enable row level security;
alter table public.audit_logs enable row level security;

grant select, insert, update on public.user_security_settings to authenticated;
grant select, insert, update on public.auth_devices to authenticated;
grant select, insert on public.auth_login_history to anon, authenticated;
grant select, insert on public.audit_logs to anon, authenticated;

drop policy if exists "security_settings_user_read" on public.user_security_settings;
drop policy if exists "security_settings_user_write" on public.user_security_settings;
drop policy if exists "security_settings_admin_all" on public.user_security_settings;
create policy "security_settings_user_read" on public.user_security_settings for select using (auth.uid() = user_id or public.is_admin_user());
create policy "security_settings_user_write" on public.user_security_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "security_settings_admin_all" on public.user_security_settings for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "auth_devices_user_read" on public.auth_devices;
drop policy if exists "auth_devices_user_write" on public.auth_devices;
drop policy if exists "auth_devices_admin_all" on public.auth_devices;
create policy "auth_devices_user_read" on public.auth_devices for select using (auth.uid() = user_id or public.is_admin_user());
create policy "auth_devices_user_write" on public.auth_devices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "auth_devices_admin_all" on public.auth_devices for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "auth_login_history_user_read" on public.auth_login_history;
drop policy if exists "auth_login_history_insert_own" on public.auth_login_history;
drop policy if exists "auth_login_history_admin_all" on public.auth_login_history;
create policy "auth_login_history_user_read" on public.auth_login_history for select using (auth.uid() = user_id or public.is_admin_user());
create policy "auth_login_history_insert_own" on public.auth_login_history for insert with check (user_id is null or auth.uid() = user_id);
create policy "auth_login_history_admin_all" on public.auth_login_history for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "audit_logs_user_read" on public.audit_logs;
drop policy if exists "audit_logs_insert_own" on public.audit_logs;
drop policy if exists "audit_logs_admin_all" on public.audit_logs;
create policy "audit_logs_user_read" on public.audit_logs for select using (auth.uid() = actor_id or public.is_admin_user());
create policy "audit_logs_insert_own" on public.audit_logs for insert with check (actor_id is null or auth.uid() = actor_id);
create policy "audit_logs_admin_all" on public.audit_logs for all using (public.is_admin_user()) with check (public.is_admin_user());

create or replace function public.ensure_security_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_security_settings (user_id, mfa_required, session_timeout_minutes)
  values (
    new.id,
    new.role in ('doctor', 'groomer', 'admin', 'super_admin'),
    case when new.role in ('admin', 'super_admin') then 30 when new.role in ('doctor', 'groomer') then 480 else 1440 end
  )
  on conflict (user_id) do update
    set
      mfa_required = excluded.mfa_required,
      session_timeout_minutes = least(user_security_settings.session_timeout_minutes, excluded.session_timeout_minutes),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists ensure_security_settings_after_profile on public.profiles;
create trigger ensure_security_settings_after_profile
after insert or update of role on public.profiles
for each row execute function public.ensure_security_settings();

insert into public.user_security_settings (user_id, mfa_required, session_timeout_minutes)
select
  p.id,
  p.role in ('doctor', 'groomer', 'admin', 'super_admin'),
  case when p.role in ('admin', 'super_admin') then 30 when p.role in ('doctor', 'groomer') then 480 else 1440 end
from public.profiles p
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';

