-- Sprint 14 - Appointment booking schema cache repair.
-- Purpose: align live Supabase with the appointment booking code path.
-- Safe to run repeatedly: only adds missing nullable/defaulted columns, missing indexes,
-- missing RPCs, and reloads PostgREST schema cache.

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

-- Appointment compatibility columns used by the booking and appointment detail screens.
alter table if exists public.appointments add column if not exists type text;
alter table if exists public.appointments add column if not exists appointment_type text;
alter table if exists public.appointments add column if not exists symptoms text;
alter table if exists public.appointments add column if not exists fee numeric(10,2) default 0;
alter table if exists public.appointments add column if not exists payment_status text default 'pending';
alter table if exists public.appointments add column if not exists payment_id uuid;
alter table if exists public.appointments add column if not exists invoice_id uuid;
alter table if exists public.appointments add column if not exists meeting_url text;
alter table if exists public.appointments add column if not exists meeting_id text;
alter table if exists public.appointments add column if not exists meeting_provider text;
alter table if exists public.appointments add column if not exists meeting_password text;

-- Payment compatibility columns used by appointment booking and gateway flows.
alter table if exists public.payments add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table if exists public.payments add column if not exists appointment_id uuid references public.appointments(id) on delete set null;
alter table if exists public.payments add column if not exists currency text not null default 'INR';
alter table if exists public.payments add column if not exists method text not null default 'online_gateway';
alter table if exists public.payments add column if not exists provider text;
alter table if exists public.payments add column if not exists provider_payment_id text;
alter table if exists public.payments add column if not exists provider_order_id text;
alter table if exists public.payments add column if not exists razorpay_order_id text;
alter table if exists public.payments add column if not exists razorpay_payment_id text;
alter table if exists public.payments add column if not exists signature text;
alter table if exists public.payments add column if not exists paid_at timestamptz;
alter table if exists public.payments add column if not exists updated_at timestamptz not null default now();

update public.payments
set owner_id = coalesce(owner_id, user_id)
where owner_id is null
  and user_id is not null;

-- Invoice compatibility columns used by appointment summaries and payment verification.
alter table if exists public.invoices add column if not exists appointment_id uuid references public.appointments(id) on delete set null;
alter table if exists public.invoices add column if not exists payment_id uuid references public.payments(id) on delete set null;
alter table if exists public.invoices add column if not exists amount numeric(10,2) default 0;
alter table if exists public.invoices add column if not exists gst numeric(10,2) default 0;
alter table if exists public.invoices add column if not exists total_amount numeric(10,2) default 0;
alter table if exists public.invoices add column if not exists updated_at timestamptz not null default now();

-- Notification compatibility columns for older appointment RPCs. The app mostly uses title/body/data,
-- but these columns prevent legacy RPC calls from failing on partially migrated databases.
alter table if exists public.notifications add column if not exists message text;
alter table if exists public.notifications add column if not exists reference_id uuid;

-- Foreign keys that may be absent on partially migrated databases. NOT VALID avoids legacy data failures.
do $$ begin
  if to_regclass('public.appointments') is not null
     and to_regclass('public.payments') is not null
     and not exists (select 1 from pg_constraint where conname = 'appointments_payment_id_fkey') then
    alter table public.appointments add constraint appointments_payment_id_fkey foreign key (payment_id) references public.payments(id) on delete set null not valid;
  end if;
end $$;

do $$ begin
  if to_regclass('public.appointments') is not null
     and to_regclass('public.invoices') is not null
     and not exists (select 1 from pg_constraint where conname = 'appointments_invoice_id_fkey') then
    alter table public.appointments add constraint appointments_invoice_id_fkey foreign key (invoice_id) references public.invoices(id) on delete set null not valid;
  end if;
end $$;

create index if not exists appointments_payment_id_idx on public.appointments(payment_id);
create index if not exists appointments_invoice_id_idx on public.appointments(invoice_id);
create index if not exists payments_owner_id_idx on public.payments(owner_id);
create index if not exists payments_appointment_id_idx on public.payments(appointment_id);
create index if not exists invoices_appointment_id_idx on public.invoices(appointment_id);
create index if not exists invoices_payment_id_idx on public.invoices(payment_id);

create or replace trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create or replace trigger set_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();

-- Efficient doctor dashboard statistics RPC used by doctorService.
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
set search_path = public
as $$
  select
    (select count(*) from public.appointments where doctor_id = p_doctor_id and scheduled_at >= date_trunc('day', now()) and scheduled_at < date_trunc('day', now()) + interval '1 day' and status not in ('cancelled', 'rejected')) as todays_appointments,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and scheduled_at >= now() and status not in ('cancelled', 'rejected', 'completed')) as upcoming_appointments,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and status = 'completed') as completed_appointments,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and status in ('cancelled', 'rejected')) as cancelled_appointments,
    (select count(distinct pet_id) from public.appointments where doctor_id = p_doctor_id and pet_id is not null) as total_patients,
    (select count(distinct pet_id) from public.appointments where doctor_id = p_doctor_id and pet_id is not null and created_at >= date_trunc('month', now())) as new_patients,
    (select count(*) from public.appointments where doctor_id = p_doctor_id and scheduled_at >= date_trunc('month', now())) as monthly_consultations;
$$;

-- Atomic appointment booking RPC for the production appointment flow.
create or replace function public.create_booking_transaction(
  p_owner_id uuid,
  p_pet_id uuid,
  p_doctor_id uuid,
  p_clinic_id uuid,
  p_scheduled_at timestamptz,
  p_appointment_type text,
  p_symptoms text,
  p_notes text,
  p_consultation_fee numeric,
  p_platform_fee numeric,
  p_gst numeric,
  p_total_amount numeric,
  p_payment_provider text,
  p_provider_payment_id text,
  p_provider_order_id text,
  p_payment_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_payment_id uuid;
  new_appointment_id uuid;
  new_invoice_id uuid;
  doctor_profile_id uuid;
  normalized_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if auth.uid() <> p_owner_id then
    raise exception 'Cannot book appointment for another user' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.appointments
    where doctor_id = p_doctor_id
      and scheduled_at = p_scheduled_at
      and status not in ('cancelled', 'rejected')
  ) then
    raise exception 'This time slot was just booked. Please select a different slot.';
  end if;

  normalized_status := coalesce(nullif(trim(p_payment_status), ''), 'pending');

  insert into public.payments (
    user_id,
    owner_id,
    appointment_id,
    amount,
    currency,
    method,
    status,
    provider,
    provider_payment_id,
    provider_order_id,
    razorpay_payment_id,
    razorpay_order_id,
    paid_at
  ) values (
    p_owner_id,
    p_owner_id,
    null,
    p_total_amount,
    'INR',
    'online_gateway',
    normalized_status,
    p_payment_provider,
    p_provider_payment_id,
    p_provider_order_id,
    p_provider_payment_id,
    p_provider_order_id,
    case when normalized_status in ('paid', 'completed', 'success') then now() else null end
  ) returning id into new_payment_id;

  insert into public.appointments (
    owner_id,
    pet_id,
    doctor_id,
    clinic_id,
    scheduled_at,
    status,
    reason,
    symptoms,
    notes,
    type,
    appointment_type,
    fee,
    payment_status,
    payment_id
  ) values (
    p_owner_id,
    p_pet_id,
    p_doctor_id,
    p_clinic_id,
    p_scheduled_at,
    'pending',
    p_symptoms,
    p_symptoms,
    p_notes,
    p_appointment_type,
    p_appointment_type,
    p_consultation_fee,
    normalized_status,
    new_payment_id
  ) returning id into new_appointment_id;

  update public.payments
  set appointment_id = new_appointment_id,
      updated_at = now()
  where id = new_payment_id;

  insert into public.invoices (
    user_id,
    appointment_id,
    payment_id,
    invoice_number,
    amount,
    gst,
    total,
    total_amount
  ) values (
    p_owner_id,
    new_appointment_id,
    new_payment_id,
    'INV-' || upper(replace(new_appointment_id::text, '-', '')),
    p_consultation_fee,
    p_gst,
    p_total_amount,
    p_total_amount
  ) returning id into new_invoice_id;

  update public.appointments
  set invoice_id = new_invoice_id,
      updated_at = now()
  where id = new_appointment_id;

  select profile_id into doctor_profile_id
  from public.doctors
  where id = p_doctor_id;

  insert into public.notifications (user_id, title, body, message, reference_id, type, data)
  values (
    p_owner_id,
    'Appointment request created',
    'Your appointment is booked and awaiting confirmation.',
    'Your appointment is booked and awaiting confirmation.',
    new_appointment_id,
    'appointment_booked',
    jsonb_build_object('appointmentId', new_appointment_id, 'doctorId', p_doctor_id, 'clinicId', p_clinic_id)
  );

  if doctor_profile_id is not null then
    insert into public.notifications (user_id, title, body, message, reference_id, type, data)
    values (
      doctor_profile_id,
      'New appointment request',
      'You have a new appointment request.',
      'You have a new appointment request.',
      new_appointment_id,
      'new_appointment_request',
      jsonb_build_object('appointmentId', new_appointment_id, 'ownerId', p_owner_id, 'clinicId', p_clinic_id)
    );
  end if;

  return new_appointment_id;
end;
$$;

grant execute on function public.get_doctor_dashboard_stats(uuid) to authenticated;
grant execute on function public.create_booking_transaction(uuid, uuid, uuid, uuid, timestamptz, text, text, text, numeric, numeric, numeric, numeric, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';