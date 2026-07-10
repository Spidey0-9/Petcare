-- Sprint 10: Enterprise Production Appointment Ecosystem
-- This function creates a complete booking as a single atomic transaction.

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
returns uuid -- Returns the new appointment ID
language plpgsql
security definer
as $$
declare
  new_payment_id uuid;
  new_appointment_id uuid;
  new_invoice_id uuid;
begin
  -- Step 1: Check for double booking within the transaction for safety
  if exists (
    select 1 from public.appointments
    where doctor_id = p_doctor_id
      and scheduled_at = p_scheduled_at
      and status not in ('cancelled', 'rejected')
  ) then
    raise exception 'This time slot was just booked. Please select a different slot.';
  end if;

  -- Step 2: Create the Payment Record
  insert into public.payments (owner_id, amount, currency, status, provider, provider_payment_id, provider_order_id)
  values (p_owner_id, p_total_amount, 'INR', p_payment_status::payment_status, p_payment_provider::payment_provider, p_provider_payment_id, p_provider_order_id)
  returning id into new_payment_id;

  -- Step 3: Create the Appointment Record, linking the payment
  insert into public.appointments (owner_id, pet_id, doctor_id, clinic_id, scheduled_at, status, reason, notes, type, payment_id)
  values (p_owner_id, p_pet_id, p_doctor_id, p_clinic_id, p_scheduled_at, 'pending_approval'::appointment_status, p_symptoms, p_notes, p_appointment_type, new_payment_id)
  returning id into new_appointment_id;

  -- Step 4: Update the Payment Record with the appointment_id
  update public.payments
  set appointment_id = new_appointment_id
  where id = new_payment_id;

  -- Step 5: Create the Invoice Record
  insert into public.invoices (appointment_id, payment_id, amount, gst, total_amount)
  values (new_appointment_id, new_payment_id, p_consultation_fee, p_gst, p_total_amount)
  returning id into new_invoice_id;

  -- Step 6: Create Notifications
  -- For Pet Owner
  insert into public.notifications (user_id, message, reference_id, type)
  values (p_owner_id, 'Your appointment is booked and awaiting confirmation.', new_appointment_id, 'appointment_booked');

  -- For Doctor
  insert into public.notifications (user_id, message, reference_id, type)
  values (p_doctor_id, 'You have a new appointment request.', new_appointment_id, 'new_appointment_request');

  -- (Optional) Step 7: Create an Activity Log entry
  -- insert into public.activity_logs (user_id, action, details)
  -- values (p_owner_id, 'booked_appointment', jsonb_build_object('appointment_id', new_appointment_id, 'doctor_id', p_doctor_id));

  -- Return the ID of the newly created appointment
  return new_appointment_id;
end;
$$;