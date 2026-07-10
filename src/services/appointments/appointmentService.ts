import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { AppointmentRecord } from '../../types';
import { throwIfError } from '../errors';
import { storageService } from '../storage';

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
    const isAvailable = await this.validateTimeSlot(payload.doctor_id, payload.scheduled_at);
    if (!isAvailable) throw new Error('This appointment slot is already booked.');
    return this.repository.create({ ...payload, status: payload.status ?? 'pending' });
  }

  async reschedule(id: string, doctorId: string, scheduledAt: string) {
    const isAvailable = await this.validateTimeSlot(doctorId, scheduledAt, id);
    if (!isAvailable) throw new Error('This appointment slot is already booked.');
    return this.repository.update(id, { doctor_id: doctorId, scheduled_at: scheduledAt, status: 'rescheduled' });
  }

  updateStatus(id: string, status: AppointmentRecord['status']) {
    return this.repository.update(id, { status });
  }

  cancel(id: string, reason?: string) {
    return this.repository.update(id, { status: 'cancelled', notes: reason });
  }

  complete(id: string, diagnosis?: string, prescription?: string) {
    return this.repository.update(id, { status: 'completed', diagnosis, prescription });
  }

  async uploadReport(appointmentId: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return storageService.uploadFile(STORAGE_BUCKETS.medicalReports, `appointments/${appointmentId}`, file);
  }

  subscribe(callback: (payload: unknown) => void) {
    return this.repository.subscribe('*', callback);
  }
}

export const backendAppointmentService = new AppointmentService();
