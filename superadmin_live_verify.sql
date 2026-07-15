with table_counts as (
  select 'table_count' as check_name, 'profiles' as item, count(*)::text as detail from public.profiles
  union all select 'table_count', 'doctors', count(*)::text from public.doctors
  union all select 'table_count', 'groomers', count(*)::text from public.groomers
  union all select 'table_count', 'clinics', count(*)::text from public.clinics
  union all select 'table_count', 'grooming_clinics', count(*)::text from public.grooming_clinics
  union all select 'table_count', 'pets', count(*)::text from public.pets
  union all select 'table_count', 'appointments', count(*)::text from public.appointments
  union all select 'table_count', 'grooming_bookings', count(*)::text from public.grooming_bookings
  union all select 'table_count', 'medical_records', count(*)::text from public.medical_records
  union all select 'table_count', 'vaccinations', count(*)::text from public.vaccinations
  union all select 'table_count', 'pet_health_logs', count(*)::text from public.pet_health_logs
  union all select 'table_count', 'payments', count(*)::text from public.payments
  union all select 'table_count', 'invoices', count(*)::text from public.invoices
  union all select 'table_count', 'memberships', count(*)::text from public.memberships
  union all select 'table_count', 'orders', count(*)::text from public.orders
  union all select 'table_count', 'products', count(*)::text from public.products
  union all select 'table_count', 'categories', count(*)::text from public.categories
  union all select 'table_count', 'wishlist', count(*)::text from public.wishlist
  union all select 'table_count', 'cart', count(*)::text from public.cart
  union all select 'table_count', 'posts', count(*)::text from public.posts
  union all select 'table_count', 'comments', count(*)::text from public.comments
  union all select 'table_count', 'likes', count(*)::text from public.likes
  union all select 'table_count', 'notifications', count(*)::text from public.notifications
  union all select 'table_count', 'ai_predictions', count(*)::text from public.ai_predictions
  union all select 'table_count', 'reviews', count(*)::text from public.reviews
  union all select 'table_count', 'favorites', count(*)::text from public.favorites
  union all select 'table_count', 'saved_clinics', count(*)::text from public.saved_clinics
  union all select 'table_count', 'messages', count(*)::text from public.messages
  union all select 'table_count', 'auth_devices', count(*)::text from public.auth_devices
  union all select 'table_count', 'auth_login_history', count(*)::text from public.auth_login_history
  union all select 'table_count', 'user_security_settings', count(*)::text from public.user_security_settings
  union all select 'table_count', 'audit_logs', count(*)::text from public.audit_logs
  union all select 'table_count', 'offline_sync_queue', count(*)::text from public.offline_sync_queue
),
rls_checks as (
  select 'rls' as check_name, c.relname as item, case when c.relrowsecurity then 'enabled' else 'disabled' end as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (select item from table_counts)
),
policy_counts as (
  select 'policy_count' as check_name, tablename as item, count(*)::text as detail
  from pg_policies
  where schemaname = 'public'
    and tablename in (select item from table_counts)
  group by tablename
),
revenue as (
  select 'revenue' as check_name, 'payments' as item, coalesce(sum(amount), 0)::text as detail
  from public.payments
  where status in ('completed','paid','success','captured')
)
select * from table_counts
union all select * from rls_checks
union all select * from policy_counts
union all select * from revenue
order by check_name, item;