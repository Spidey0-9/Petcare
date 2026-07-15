with expected_tables(name) as (
  values
    ('grooming_clinics'),('groomers'),('grooming_services'),('grooming_bookings'),
    ('user_security_settings'),('auth_devices'),('auth_login_history'),('audit_logs')
), expected_functions(name) as (
  values ('set_updated_at'),('is_admin_user'),('handle_new_user'),('ensure_security_settings')
), expected_triggers(name) as (
  values
    ('set_grooming_clinics_updated_at'),('set_groomers_updated_at'),('set_grooming_services_updated_at'),('set_grooming_bookings_updated_at'),
    ('set_user_security_settings_updated_at'),('set_auth_devices_updated_at'),('ensure_security_settings_after_profile')
), expected_buckets(name) as (
  values ('grooming-images'),('profile-images'),('pet-images'),('doctor-images'),('medical-reports'),('community-posts'),('product-images')
)
select 'table_exists' as check_type, e.name as object_name,
  case when t.table_name is null then 'FAIL missing' else 'PASS exists' end as status
from expected_tables e
left join information_schema.tables t on t.table_schema = 'public' and t.table_name = e.name
union all
select 'rls_enabled', e.name,
  case when c.relrowsecurity then 'PASS enabled' else 'FAIL disabled_or_missing' end
from expected_tables e
left join pg_class c on c.relname = e.name
left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
union all
select 'policy_count', e.name,
  coalesce(count(p.policyname)::text, '0')
from expected_tables e
left join pg_policies p on p.schemaname = 'public' and p.tablename = e.name
group by e.name
union all
select 'function_exists', e.name,
  case when p.proname is null then 'FAIL missing' else 'PASS exists' end
from expected_functions e
left join pg_proc p on p.proname = e.name
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
union all
select 'trigger_exists', e.name,
  case when tg.tgname is null then 'FAIL missing' else 'PASS on ' || c.relname end
from expected_triggers e
left join pg_trigger tg on tg.tgname = e.name
left join pg_class c on c.oid = tg.tgrelid
union all
select 'bucket_exists', e.name,
  case when b.id is null then 'FAIL missing' else 'PASS ' || case when b.public then 'public' else 'private' end end
from expected_buckets e
left join storage.buckets b on b.id = e.name
order by check_type, object_name;
