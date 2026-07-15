select 'table' as check_type, table_name as object_name, 'exists' as status
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'grooming_clinics','groomers','grooming_services','grooming_bookings',
    'user_security_settings','auth_devices','auth_login_history','audit_logs'
  )
order by table_name;

select 'rls' as check_type, c.relname as object_name, case when c.relrowsecurity then 'enabled' else 'disabled' end as status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'grooming_clinics','groomers','grooming_services','grooming_bookings',
    'user_security_settings','auth_devices','auth_login_history','audit_logs'
  )
order by c.relname;

select 'policy_count' as check_type, tablename as object_name, count(*)::text as status
from pg_policies
where schemaname = 'public'
  and tablename in (
    'grooming_clinics','groomers','grooming_services','grooming_bookings',
    'user_security_settings','auth_devices','auth_login_history','audit_logs'
  )
group by tablename
order by tablename;

select 'function' as check_type, p.proname as object_name, 'exists' as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('set_updated_at','is_admin_user','handle_new_user','ensure_security_settings')
order by p.proname;

select 'trigger' as check_type, tg.tgname as object_name, c.relname as status
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and tg.tgname in (
    'set_grooming_clinics_updated_at','set_groomers_updated_at','set_grooming_services_updated_at','set_grooming_bookings_updated_at',
    'set_user_security_settings_updated_at','set_auth_devices_updated_at','ensure_security_settings_after_profile'
  )
order by tg.tgname;

select 'bucket' as check_type, id as object_name, case when public then 'public' else 'private' end as status
from storage.buckets
where id in ('grooming-images','profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
order by id;
