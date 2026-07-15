import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { AppointmentRecord } from '../../types';
import { throwIfError } from '../errors';
import { authSecurityService } from '../security/authSecurityService';
import { storageService } from '../storage';

function isNotificationMetadataMissing(error: { code?: string; message?: string } | null) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /column .* does not exist/i.test(error?.message ?? '');
}

function appointmentStatusCopy(status: string) {
  if (status === 'accepted' || status === 'confirmed') return { title: 'Appointment approved', body: 'Your appointment has been approved by the doctor.', type: 'appointment_approved', action: 'appointment.approved' };
  if (status === 'rejected') return { title: 'Appointment rejected', body: 'Your appointment request was rejected. You can book another slot.', type: 'appointment_rejected', action: 'appointment.rejected' };
  if (status === 'rescheduled') return { title: 'Appointment rescheduled', body: 'Your appointment was marked for rescheduling.', type: 'appointment_rescheduled', action: 'appointment.rescheduled' };
  if (status === 'cancelled') return { title: 'Appointment cancelled', body: 'Your appointment was cancelled.', type: 'appointment_cancelled', action: 'appointment.cancelled' };
  if (status === 'completed') return { title: 'Appointment completed', body: 'Your appointment has been completed.', type: 'appointment_completed', action: 'appointment.completed' };
  return { title: 'Appointment updated', body: 'Your appointment status was updated.', type: 'appointment_updated', action: 'appointment.updated' };
}

async function insertAppointmentNotification(input: { userId?: string | null; title: string; body: string; type: string; appointmentId?: string | null; data?: Record<string, unknown>; action?: string | null; actorId?: string | null; organizationId?: string | null }) {
  if (!input.userId) return;
  const payload = {
    user_id: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    data: input.data ?? {},
    reference_table: TABLES.appointments,
    reference_id: input.appointmentId ?? null,
    action: input.action ?? input.type,
    actor_id: input.actorId ?? null,
    organization_id: input.organizationId ?? null,
  };
  const { error } = await supabase.from(TABLES.notifications).insert(payload);
  if (isNotificationMetadataMissing(error)) {
    const { action, actor_id, organization_id, ...fallbackPayload } = payload;
    const retry = await supabase.from(TABLES.notifications).insert(fallbackPayload);
    if (retry.error) console.warn('[AppointmentWorkflow] notification insert failed:', retry.error);
    return;
  }
  if (error) console.warn('[AppointmentWorkflow] notification insert failed:', error);
}

async function notifyDoctorOfNewAppointment(appointment: AppointmentRecord) {
  const { data: doctor, error } = await supabase.from(TABLES.doctors).select('profile_id').eq('id', appointment.doctor_id).maybeSingle();
  if (error) {
    console.warn('[AppointmentWorkflow] doctor lookup failed:', error);
    return;
  }
  await insertAppointmentNotification({
    userId: doctor?.profile_id,
    title: 'New appointment request',
    body: 'A pet owner booked an appointment. Review it in your pending requests.',
    type: 'doctor_new_booking',
    appointmentId: appointment.id,
    data: { appointmentId: appointment.id, ownerId: appointment.owner_id, petId: appointment.pet_id, clinicId: appointment.clinic_id },
    action: 'appointment.created',
    actorId: appointment.owner_id,
    organizationId: appointment.clinic_id ?? null,
  });
}

async function notifyOwnerOfAppointmentStatus(appointment: AppointmentRecord, status: string, reason?: string) {
  const copy = appointmentStatusCopy(status);
  await insertAppointmentNotification({
    userId: appointment.owner_id,
    title: copy.title,
    body: reason ? `${copy.body} Reason: ${reason}` : copy.body,
    type: copy.type,
    appointmentId: appointment.id,
    data: { appointmentId: appointment.id, doctorId: appointment.doctor_id, status, reason: reason ?? null },
    action: appointmentStatusCopy(status).action,
    actorId: appointment.doctor_id ?? null,
    organizationId: appointment.clinic_id ?? null,
  });
}

export class AppointmentService {
  private readonly repository = new SupabaseRepository<AppointmentRecord>(TABLES.appointments);

  listForOwner(ownerId: string) {
    return this.repository.list({ filters: { owner_id: ownerId }, orderBy: 'scheduled_at', ascending: false });
  }

  listForDoctor(doctorId: string) {
    return this.repository.list({ filters: { doctor_id: doctorId }, orderBy: 'scheduled_at', ascending: false });
  }

  async validateTimeSlot(doctorId: string, scheduledAt: string, ignoredAppointmentId?: string) {
    let query = supabase
      .from(TABLES.appointments)
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('scheduled_at', scheduledAt)
      .not('status', 'in', '(cancelled,rejected)');

    if (ignoredAppointmentId) query = query.neq('id', ignoredAppointmentId);

    const { data, error } = await query;
    throwIfError(error, 'Unable to validate appointment slot.');
    return (data ?? []).length === 0;
  }

  async bookAppointment(payload: Partial<AppointmentRecord> & Pick<AppointmentRecord, 'doctor_id' | 'scheduled_at'>) {
    const appointmentDate = payload.appointment_date ?? payload.scheduled_at.slice(0, 10);
    const appointmentTime = payload.appointment_time ?? payload.scheduled_at.slice(11, 19);
    const appointmentType = payload.appointment_type ?? payload.type;

    const missing = [
      ['owner_id', payload.owner_id],
      ['pet_id', payload.pet_id],
      ['doctor_id', payload.doctor_id],
      ['scheduled_at', payload.scheduled_at],
      ['appointment_date', appointmentDate],
      ['appointment_time', appointmentTime],
      ['appointment_type', appointmentType],
    ].filter(([, value]) => !value).map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Appointment booking is missing required fields: ${missing.join(', ')}.`);
    }

    const isAvailable = await this.validateTimeSlot(payload.doctor_id, payload.scheduled_at);
    if (!isAvailable) throw new Error('This appointment slot is already booked.');
    const appointment = await this.repository.create({
      ...payload,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_type: appointmentType,
      status: payload.status ?? 'pending',
    });
    await notifyDoctorOfNewAppointment(appointment);
    await authSecurityService.recordAudit({
      actorId: appointment.owner_id,
      actorRole: 'pet_owner',
      action: 'appointment.created',
      entityType: TABLES.appointments,
      entityId: appointment.id,
      metadata: { doctor_id: appointment.doctor_id, pet_id: appointment.pet_id, clinic_id: appointment.clinic_id, scheduled_at: appointment.scheduled_at, appointment_type: appointmentType },
    });
    return appointment;
  }

  async reschedule(id: string, doctorId: string, scheduledAt: string) {
    const isAvailable = await this.validateTimeSlot(doctorId, scheduledAt, id);
    if (!isAvailable) throw new Error('This appointment slot is already booked.');
    const updated = await this.repository.update(id, { doctor_id: doctorId, scheduled_at: scheduledAt, status: 'rescheduled' });
    await notifyOwnerOfAppointmentStatus(updated, 'rescheduled');
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({ actorId: userData.user?.id ?? null, action: 'appointment.rescheduled', entityType: TABLES.appointments, entityId: updated.id, metadata: { doctor_id: updated.doctor_id, owner_id: updated.owner_id, scheduled_at: updated.scheduled_at } });
    return updated;
  }

  async updateStatus(id: string, status: AppointmentRecord['status']) {
    const updated = await this.repository.update(id, { status });
    await notifyOwnerOfAppointmentStatus(updated, status);
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({ actorId: userData.user?.id ?? null, action: appointmentStatusCopy(status).action, entityType: TABLES.appointments, entityId: updated.id, metadata: { status, doctor_id: updated.doctor_id, owner_id: updated.owner_id } });
    return updated;
  }

  async cancel(id: string, reason?: string) {
    const updated = await this.repository.update(id, { status: 'cancelled', notes: reason });
    await notifyOwnerOfAppointmentStatus(updated, 'cancelled', reason);
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({ actorId: userData.user?.id ?? null, action: 'appointment.cancelled', entityType: TABLES.appointments, entityId: updated.id, metadata: { reason: reason ?? null, doctor_id: updated.doctor_id, owner_id: updated.owner_id }, severity: 'warning' });
    return updated;
  }

  async complete(id: string, diagnosis?: string, prescription?: string) {
    const updated = await this.repository.update(id, { status: 'completed', diagnosis, prescription });
    await notifyOwnerOfAppointmentStatus(updated, 'completed');
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({ actorId: userData.user?.id ?? null, action: 'appointment.completed', entityType: TABLES.appointments, entityId: updated.id, metadata: { doctor_id: updated.doctor_id, owner_id: updated.owner_id } });
    return updated;
  }

  async uploadReport(appointmentId: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return storageService.uploadFile(STORAGE_BUCKETS.medicalReports, `appointments/${appointmentId}`, file);
  }

  subscribe(callback: (payload: unknown) => void) {
    return this.repository.subscribe('*', callback);
  }
}

export const backendAppointmentService = new AppointmentService();


