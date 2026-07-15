-- Sprint 18 - Enterprise Super Admin Console policies.
-- Adds admin-scoped access to existing PetCare+ tables only.
-- No new projects, auth systems, APIs, or duplicate tables are created.

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

do $$
declare
  table_name text;
  tables text[] := array[
    'profiles',
    'doctors',
    'groomers',
    'pets',
    'clinics',
    'grooming_clinics',
    'grooming_services',
    'appointments',
    'grooming_bookings',
    'medical_records',
    'vaccinations',
    'pet_health_logs',
    'payments',
    'invoices',
    'memberships',
    'orders',
    'products',
    'categories',
    'wishlist',
    'cart',
    'posts',
    'comments',
    'likes',
    'notifications',
    'ai_predictions',
    'reviews',
    'favorites',
    'saved_clinics',
    'messages',
    'auth_devices',
    'auth_login_history',
    'user_security_settings',
    'audit_logs',
    'offline_sync_queue'
  ];
begin
  foreach table_name in array tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_super_admin_all', table_name);
      execute format(
        'create policy %I on public.%I for all using (public.is_admin_user()) with check (public.is_admin_user())',
        table_name || '_super_admin_all',
        table_name
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';