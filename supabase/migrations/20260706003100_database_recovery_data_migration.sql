-- Sprint 4 - Production Database Recovery Migration B: Data Migration and Validation.
-- Run only after Migration A succeeds.
-- This migration validates legacy data before promotion steps. It skips malformed rows and logs counts with RAISE NOTICE.

-- 1. Safely migrate legacy appointments.appointment_date + appointment_time into appointments.scheduled_at.
do $$
declare
  has_legacy_date boolean;
  has_legacy_time boolean;
  eligible_count integer := 0;
  invalid_count integer := 0;
  missing_count integer := 0;
  updated_count integer := 0;
  remaining_null_count integer := 0;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'appointment_date'
  ) into has_legacy_date;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments' and column_name = 'appointment_time'
  ) into has_legacy_time;

  if has_legacy_date and has_legacy_time then
    execute $sql$
      select count(*)
      from public.appointments
      where scheduled_at is null
        and appointment_date is not null
        and appointment_time is not null
        and appointment_date::text ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
        and to_char(to_date(appointment_date::text, 'YYYY-MM-DD'), 'YYYY-MM-DD') = appointment_date::text
        and appointment_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
    $sql$ into eligible_count;

    execute $sql$
      select count(*)
      from public.appointments
      where scheduled_at is null
        and appointment_date is not null
        and appointment_time is not null
        and not (
          appointment_date::text ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
          and to_char(to_date(appointment_date::text, 'YYYY-MM-DD'), 'YYYY-MM-DD') = appointment_date::text
          and appointment_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
        )
    $sql$ into invalid_count;

    execute $sql$
      select count(*)
      from public.appointments
      where scheduled_at is null
        and (appointment_date is null or appointment_time is null)
    $sql$ into missing_count;

    execute $sql$
      update public.appointments
      set scheduled_at = (appointment_date::date + appointment_time::time)::timestamptz
      where scheduled_at is null
        and appointment_date is not null
        and appointment_time is not null
        and appointment_date::text ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
        and to_char(to_date(appointment_date::text, 'YYYY-MM-DD'), 'YYYY-MM-DD') = appointment_date::text
        and appointment_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
    $sql$;
    get diagnostics updated_count = row_count;
  else
    raise notice 'appointments legacy date/time columns not found. No appointment data migration attempted.';
  end if;

  select count(*) into remaining_null_count from public.appointments where scheduled_at is null;

  raise notice 'appointment scheduled_at migration: eligible=%, updated=%, invalid_skipped=%, missing_skipped=%, remaining_null=%',
    eligible_count, updated_count, invalid_count, missing_count, remaining_null_count;

  if remaining_null_count = 0 then
    alter table public.appointments alter column scheduled_at set not null;
    raise notice 'appointments.scheduled_at SET NOT NULL applied.';
  else
    raise notice 'appointments.scheduled_at SET NOT NULL skipped because % rows remain null.', remaining_null_count;
  end if;
end $$;

-- 2. Safely migrate doctors.experience into doctors.experience_years.
do $$
declare
  has_col boolean;
  eligible_count integer := 0;
  skipped_count integer := 0;
  updated_count integer := 0;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'doctors' and column_name = 'experience'
  ) into has_col;

  if has_col then
    execute $sql$
      select count(*) from public.doctors
      where experience is not null and trim(experience::text) ~ '^\d+$'
    $sql$ into eligible_count;

    execute $sql$
      select count(*) from public.doctors
      where experience is not null and not (trim(experience::text) ~ '^\d+$')
    $sql$ into skipped_count;

    execute $sql$
      update public.doctors
      set experience_years = trim(experience::text)::integer
      where experience is not null and trim(experience::text) ~ '^\d+$'
    $sql$;
    get diagnostics updated_count = row_count;
  end if;

  raise notice 'doctor experience migration: eligible=%, updated=%, skipped_non_numeric=%', eligible_count, updated_count, skipped_count;
end $$;

-- 3. Safely migrate doctors.total_reviews into doctors.review_count.
do $$
declare
  has_col boolean;
  eligible_count integer := 0;
  skipped_count integer := 0;
  updated_count integer := 0;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'doctors' and column_name = 'total_reviews'
  ) into has_col;

  if has_col then
    execute $sql$
      select count(*) from public.doctors
      where total_reviews is not null and trim(total_reviews::text) ~ '^\d+$'
    $sql$ into eligible_count;

    execute $sql$
      select count(*) from public.doctors
      where total_reviews is not null and not (trim(total_reviews::text) ~ '^\d+$')
    $sql$ into skipped_count;

    execute $sql$
      update public.doctors
      set review_count = trim(total_reviews::text)::integer
      where total_reviews is not null and trim(total_reviews::text) ~ '^\d+$'
    $sql$;
    get diagnostics updated_count = row_count;
  end if;

  raise notice 'doctor review_count migration: eligible=%, updated=%, skipped_non_numeric=%', eligible_count, updated_count, skipped_count;
end $$;

-- 4. Safely migrate pets.weight_kg into pets.weight.
do $$
declare
  has_col boolean;
  eligible_count integer := 0;
  skipped_count integer := 0;
  updated_count integer := 0;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'weight_kg'
  ) into has_col;

  if has_col then
    execute $sql$
      select count(*) from public.pets
      where weight_kg is not null and trim(weight_kg::text) ~ '^\d+(\.\d+)?$'
    $sql$ into eligible_count;

    execute $sql$
      select count(*) from public.pets
      where weight_kg is not null and not (trim(weight_kg::text) ~ '^\d+(\.\d+)?$')
    $sql$ into skipped_count;

    execute $sql$
      update public.pets
      set weight = trim(weight_kg::text)::numeric(8,2)
      where weight_kg is not null and trim(weight_kg::text) ~ '^\d+(\.\d+)?$'
    $sql$;
    get diagnostics updated_count = row_count;
  end if;

  raise notice 'pet weight migration: eligible=%, updated=%, skipped_non_numeric=%', eligible_count, updated_count, skipped_count;
end $$;

-- 5. Report duplicate active appointment slots before unique index creation.
do $$
declare
  duplicate_group_count integer := 0;
begin
  select count(*) into duplicate_group_count
  from (
    select doctor_id, scheduled_at
    from public.appointments
    where scheduled_at is not null
      and status not in ('cancelled', 'rejected')
    group by doctor_id, scheduled_at
    having count(*) > 1
  ) dupes;

  raise notice 'duplicate active appointment slot groups=%', duplicate_group_count;

  if duplicate_group_count = 0 then
    create unique index if not exists appointments_no_double_booking_idx
      on public.appointments (doctor_id, scheduled_at)
      where status not in ('cancelled', 'rejected');
    raise notice 'appointments_no_double_booking_idx created or already exists.';
  else
    raise notice 'appointments_no_double_booking_idx skipped. Resolve duplicate active appointment slots first.';
  end if;
end $$;

-- 6. Validate NOT VALID appointment foreign keys only when no orphan rows exist.
do $$
declare
  orphan_count integer := 0;
begin
  select count(*) into orphan_count
  from public.appointments a
  left join public.clinics c on c.id = a.clinic_id
  where a.clinic_id is not null and c.id is null;

  if orphan_count = 0 and exists (select 1 from pg_constraint where conname = 'appointments_clinic_id_fkey' and conrelid = 'public.appointments'::regclass) then
    alter table public.appointments validate constraint appointments_clinic_id_fkey;
    raise notice 'appointments_clinic_id_fkey validated.';
  else
    raise notice 'appointments_clinic_id_fkey validation skipped. orphan_count=%', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.appointments a
  left join public.profiles p on p.id = a.owner_id
  where p.id is null;

  if orphan_count = 0 and exists (select 1 from pg_constraint where conname = 'appointments_owner_id_fkey' and conrelid = 'public.appointments'::regclass) then
    alter table public.appointments validate constraint appointments_owner_id_fkey;
    raise notice 'appointments_owner_id_fkey validated.';
  else
    raise notice 'appointments_owner_id_fkey validation skipped. orphan_count=%', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.appointments a
  left join public.doctors d on d.id = a.doctor_id
  where d.id is null;

  if orphan_count = 0 and exists (select 1 from pg_constraint where conname = 'appointments_doctor_id_fkey' and conrelid = 'public.appointments'::regclass) then
    alter table public.appointments validate constraint appointments_doctor_id_fkey;
    raise notice 'appointments_doctor_id_fkey validated.';
  else
    raise notice 'appointments_doctor_id_fkey validation skipped. orphan_count=%', orphan_count;
  end if;

  select count(*) into orphan_count
  from public.appointments a
  left join public.pets p on p.id = a.pet_id
  where p.id is null;

  if orphan_count = 0 and exists (select 1 from pg_constraint where conname = 'appointments_pet_id_fkey' and conrelid = 'public.appointments'::regclass) then
    alter table public.appointments validate constraint appointments_pet_id_fkey;
    raise notice 'appointments_pet_id_fkey validated.';
  else
    raise notice 'appointments_pet_id_fkey validation skipped. orphan_count=%', orphan_count;
  end if;
end $$;

notify pgrst, 'reload schema';
