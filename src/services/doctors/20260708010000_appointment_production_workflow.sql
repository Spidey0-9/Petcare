-- Sprint 8B: Production appointment workflow enhancements.

-- Stored procedure for aggregated doctor dashboard statistics.
-- This is significantly more performant than fetching all appointments and calculating on the client.
create or replace function public.get_doctor_dashboard_stats(p_doctor_id uuid)
returns table (
  todays_appointments bigint,
  upcoming_appointments bigint,
  completed_appointments bigint,
  cancelled_appointments bigint,
  total_patients bigint,
  new_patients bigint,
  monthly_consultations bigint
)
language sql
security definer
as $$
  select
    (select count(*) from public.appointments where doctor_id = p_doctor_id and scheduled_at >= date_trunc('day', now()) and scheduled_at < date_trunc('day', now()) + interval '1 day' and status not in ('cancelled', 'rejected')) as todays_appointments,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and scheduled_at >= now() and status not in ('cancelled', 'rejected', 'completed')) as upcoming_appointments,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and status = 'completed') as completed_appointments,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and status in ('cancelled', 'rejected')) as cancelled_appointments,
    (select count(distinct pet_id) from public.appointments where doctor_id = p_doctor_id and pet_id is not null) as total_patients,
    (select count(distinct pet_id) from public.appointments where doctor_id = p_doctor_id and pet_id is not null and created_at >= date_trunc('month', now())) as new_patients,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and scheduled_at >= date_trunc('month', now())) as monthly_consultations
$$;