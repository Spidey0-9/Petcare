-- Sprint 4 database recovery validation queries.
-- Run manually before/after Migration A and Migration B.

-- Expected table presence.
select expected.table_name,
       case when actual.table_name is null then 'MISSING' else 'OK' end as status
from (values
  ('profiles'), ('doctors'), ('pets'), ('clinics'), ('appointments'), ('medical_records'),
  ('reminders'), ('posts'), ('community_posts'), ('comments'), ('likes'), ('notifications'),
  ('categories'), ('products'), ('wishlist'), ('cart'), ('orders'), ('payments'), ('invoices'),
  ('payment_gateway_sessions'), ('memberships'), ('reviews'), ('favorites'), ('saved_clinics'),
  ('pet_health_logs'), ('offline_sync_queue'), ('messages'), ('ai_predictions'), ('vaccinations'),
  ('prescriptions')
) as expected(table_name)
left join information_schema.tables actual
  on actual.table_schema = 'public'
 and actual.table_name = expected.table_name
order by expected.table_name;

-- appointments.scheduled_at status.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'appointments'
  and column_name in ('scheduled_at', 'appointment_date', 'appointment_time')
order by column_name;

-- Appointment rows that can be safely converted from legacy date/time.
select count(*) as convertible_appointment_rows
from public.appointments
where scheduled_at is null
  and appointment_date is not null
  and appointment_time is not null
  and appointment_date::text ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
  and to_char(to_date(appointment_date::text, 'YYYY-MM-DD'), 'YYYY-MM-DD') = appointment_date::text
  and appointment_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$';

-- Appointment rows that cannot be converted and will block SET NOT NULL.
select id, appointment_date, appointment_time, created_at
from public.appointments
where scheduled_at is null
  and (
    appointment_date is null
    or appointment_time is null
    or not (
      appointment_date::text ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
      and to_char(to_date(appointment_date::text, 'YYYY-MM-DD'), 'YYYY-MM-DD') = appointment_date::text
      and appointment_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
    )
  )
order by created_at desc;

-- Duplicate active appointment slots that block the unique index.
select doctor_id, scheduled_at, count(*) as duplicate_count, array_agg(id order by created_at) as appointment_ids
from public.appointments
where scheduled_at is not null
  and status not in ('cancelled', 'rejected')
group by doctor_id, scheduled_at
having count(*) > 1
order by duplicate_count desc, scheduled_at;

-- Appointment FK orphan checks.
select 'clinic_id' as fk, count(*) as orphan_count
from public.appointments a
left join public.clinics c on c.id = a.clinic_id
where a.clinic_id is not null and c.id is null
union all
select 'owner_id' as fk, count(*) as orphan_count
from public.appointments a
left join public.profiles p on p.id = a.owner_id
where p.id is null
union all
select 'doctor_id' as fk, count(*) as orphan_count
from public.appointments a
left join public.doctors d on d.id = a.doctor_id
where d.id is null
union all
select 'pet_id' as fk, count(*) as orphan_count
from public.appointments a
left join public.pets p on p.id = a.pet_id
where p.id is null;

-- Legacy numeric data quality checks.
select 'doctors.experience' as source_column, count(*) as invalid_count
from public.doctors
where exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'doctors' and column_name = 'experience')
  and experience is not null
  and not (trim(experience::text) ~ '^\d+$')
union all
select 'doctors.total_reviews' as source_column, count(*) as invalid_count
from public.doctors
where exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'doctors' and column_name = 'total_reviews')
  and total_reviews is not null
  and not (trim(total_reviews::text) ~ '^\d+$')
union all
select 'pets.weight_kg' as source_column, count(*) as invalid_count
from public.pets
where exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pets' and column_name = 'weight_kg')
  and weight_kg is not null
  and not (trim(weight_kg::text) ~ '^\d+(\.\d+)?$');

-- RLS status.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Policies created.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- Storage buckets.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('profile-images','pet-images','doctor-images','medical-reports','community-posts','product-images')
order by id;
