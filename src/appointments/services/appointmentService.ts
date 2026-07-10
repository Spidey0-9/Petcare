import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import type { AppointmentRecord, AppointmentStatus as BackendAppointmentStatus, ClinicRecord, DoctorRecord, PetRecord, ProfileRecord } from '../../types';
import {
  AppointmentStatus,
  AppointmentType,
  PaymentStatus,
  type Appointment,
  type BookingFormData,
  type Doctor,
  type Hospital,
  type Pet,
} from '../types/appointment.types';
import { throwIfError } from '../../services/errors';

export type DoctorSearchResult = DoctorRecord & {
  profile: Pick<ProfileRecord, 'full_name' | 'avatar_url'>;
  clinic: Pick<ClinicRecord, 'name' | 'address'>;
  distance: number | null;
};

export type AppointmentBookingPayload = {
  ownerId: string;
  petId: string;
  doctorId: string;
  clinicId: string;
  scheduledAt: string;
  appointmentType: string;
  symptoms?: string;
  notes?: string;
  fee: number;
};

type AppointmentRow = AppointmentRecord & {
  appointment_type?: string | null;
  symptoms?: string | null;
  fee?: number | null;
  payment_status?: string | null;
  rating?: number | null;
  review?: string | null;
  completed_at?: string | null;
  cancellation_reason?: string | null;
  doctor?: (DoctorRecord & { profile?: ProfileRecord | null }) | null;
  pet?: (PetRecord & { owner?: ProfileRecord | null }) | null;
  clinic?: ClinicRecord | null;
};

type DoctorRow = DoctorRecord & { profile?: Pick<ProfileRecord, 'full_name' | 'avatar_url'> | null; rating?: number | string | null };

type ClinicRow = ClinicRecord & { city?: string | null; services?: string[] | null };

function toBackendStatus(status: AppointmentStatus): BackendAppointmentStatus {
  if (status === AppointmentStatus.PENDING_APPROVAL) return 'pending';
  if (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.UPCOMING || status === AppointmentStatus.IN_PROGRESS) return 'accepted';
  if (status === AppointmentStatus.COMPLETED) return 'completed';
  if (status === AppointmentStatus.CANCELLED) return 'cancelled';
  if (status === AppointmentStatus.RESCHEDULED) return 'rescheduled';
  if (status === AppointmentStatus.REJECTED) return 'rejected';
  return 'pending';
}

function toUiStatus(status: string): AppointmentStatus {
  if (status === 'pending') return AppointmentStatus.PENDING_APPROVAL;
  if (status === 'accepted' || status === 'confirmed') return AppointmentStatus.CONFIRMED;
  if (status === 'completed') return AppointmentStatus.COMPLETED;
  if (status === 'cancelled') return AppointmentStatus.CANCELLED;
  if (status === 'rescheduled') return AppointmentStatus.RESCHEDULED;
  if (status === 'rejected') return AppointmentStatus.REJECTED;
  return AppointmentStatus.PENDING_APPROVAL;
}

function toAppointmentType(value?: string | null): AppointmentType {
  const normalized = String(value ?? '').toUpperCase();
  return Object.values(AppointmentType).includes(normalized as AppointmentType)
    ? normalized as AppointmentType
    : AppointmentType.GENERAL_CHECKUP;
}

function timeSlot(value: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function paymentStatus(value?: string | null): PaymentStatus {
  if (value === 'paid' || value === 'completed') return PaymentStatus.PAID;
  if (value === 'refunded') return PaymentStatus.REFUNDED;
  return PaymentStatus.PENDING;
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    customerId: row.owner_id,
    customerName: row.pet?.owner?.full_name ?? 'Pet Owner',
    doctorId: row.doctor_id,
    doctorName: row.doctor?.profile?.full_name ?? 'Doctor',
    doctorPhoto: row.doctor?.profile?.avatar_url ?? undefined,
    hospitalId: row.clinic_id ?? '',
    hospitalName: row.clinic?.name ?? row.doctor?.clinic_name ?? 'Clinic not assigned',
    petId: row.pet_id,
    petName: row.pet?.name ?? 'Pet',
    petPhoto: row.pet?.image_url ?? undefined,
    type: toAppointmentType(row.appointment_type ?? row.reason),
    date: row.scheduled_at,
    timeSlot: timeSlot(row.scheduled_at),
    status: toUiStatus(row.status),
    paymentStatus: paymentStatus(row.payment_status),
    symptoms: row.symptoms ?? row.reason ?? row.notes ?? '',
    medicalReports: row.report_urls ?? [],
    prescription: row.prescription ?? undefined,
    diagnosis: row.diagnosis ?? undefined,
    fee: Number(row.fee ?? row.doctor?.consultation_fee ?? 0),
    createdAt: row.created_at ?? row.scheduled_at,
    completedAt: row.completed_at ?? undefined,
    cancellationReason: row.cancellation_reason ?? undefined,
    rating: row.rating ?? undefined,
    review: row.review ?? undefined,
  };
}

export class AppointmentService {
  private readonly appointments = new SupabaseRepository<AppointmentRecord>(TABLES.appointments);
  private readonly doctors = new SupabaseRepository<DoctorRecord>(TABLES.doctors);

  async listAvailableDoctors(): Promise<DoctorSearchResult[]> {
    const { data, error } = await supabase
      .from(TABLES.doctors)
      .select('*, profile:profiles!doctors_profile_id_fkey(full_name, avatar_url), clinic:clinics(name, address, latitude, longitude)')
      .eq('is_available', true);
    throwIfError(error, 'Unable to load available doctors.');
    return (data ?? []) as DoctorSearchResult[];
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<string[]> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    const doctorData = await this.doctors.getById(doctorId);
    if (!doctorData) throw new Error('Doctor not found.');

    const availability = doctorData.availability as { slots?: string[] } | null;
    const allSlots = availability?.slots ?? ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const { data: bookedAppointments, error: bookingError } = await supabase
      .from(TABLES.appointments)
      .select('scheduled_at')
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)
      .not('status', 'in', '(cancelled,rejected)');
    throwIfError(bookingError, 'Unable to check doctor availability.');

    const bookedSlots = (bookedAppointments ?? []).map(appointment => timeSlot(appointment.scheduled_at));
    return allSlots.filter(slot => !bookedSlots.includes(slot));
  }

  async createAppointmentAfterPayment(payload: AppointmentBookingPayload, _paymentId: string): Promise<AppointmentRecord> {
    const { count, error: conflictError } = await supabase
      .from(TABLES.appointments)
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', payload.doctorId)
      .eq('scheduled_at', payload.scheduledAt)
      .not('status', 'in', '(cancelled,rejected)');
    throwIfError(conflictError, 'Database error checking for slot conflicts.');
    if (count && count > 0) throw new Error('This time slot was just booked. Please select a different slot.');

    return this.appointments.create({
      owner_id: payload.ownerId,
      pet_id: payload.petId,
      doctor_id: payload.doctorId,
      clinic_id: payload.clinicId,
      scheduled_at: payload.scheduledAt,
      status: 'pending',
      reason: payload.symptoms,
      notes: payload.notes,
    });
  }

  async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, reason?: string): Promise<AppointmentRecord> {
    const backendStatus = toBackendStatus(status);
    return this.appointments.update(appointmentId, { status: backendStatus, notes: reason });
  }

  async getCustomerAppointments(customerId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*, doctor:doctors(*, profile:profiles(*)), clinic:clinics(*)')
      .eq('owner_id', customerId)
      .order('scheduled_at', { ascending: false });
    throwIfError(error, 'Unable to load your appointments.');
    return ((data ?? []) as AppointmentRow[]).map(mapAppointment);
  }

  async getDoctorAppointments(doctorId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*, pet:pets(*, owner:profiles(*)), clinic:clinics(*)')
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: false });
    throwIfError(error, "Unable to load doctor's appointments.");
    return ((data ?? []) as AppointmentRow[]).map(mapAppointment);
  }

  async getAppointmentDetails(appointmentId: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*, pet:pets(*, owner:profiles(*)), doctor:doctors(*, profile:profiles(*)), clinic:clinics(*)')
      .eq('id', appointmentId)
      .maybeSingle();
    throwIfError(error, 'Unable to load appointment details.');
    return data ? mapAppointment(data as AppointmentRow) : null;
  }

  async getPets(): Promise<Pet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from(TABLES.pets).select('*').eq('owner_id', user.id);
    throwIfError(error, 'Unable to load pets.');
    return ((data ?? []) as PetRecord[]).map(pet => ({
      id: pet.id,
      name: pet.name,
      breed: pet.breed ?? '',
      age: pet.date_of_birth ?? '',
      healthScore: 0,
      photo: pet.image_url ?? undefined,
    }));
  }

  async getHospitals(): Promise<Hospital[]> {
    const { data, error } = await supabase.from(TABLES.clinics).select('*');
    throwIfError(error, 'Unable to load clinics.');
    return ((data ?? []) as ClinicRow[]).map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      address: clinic.address ?? '',
      city: clinic.city ?? '',
      phone: clinic.phone ?? '',
      rating: Number(clinic.rating ?? 0),
      is24x7: clinic.is_24x7 ?? false,
      distance: 0,
      services: clinic.services ?? [],
    }));
  }

  async getDoctorsByHospital(hospitalId: string): Promise<Doctor[]> {
    const { data, error } = await supabase
      .from(TABLES.doctors)
      .select('*, profile:profiles(full_name, avatar_url)')
      .eq('is_available', true);
    throwIfError(error, 'Unable to load doctors.');
    return ((data ?? []) as DoctorRow[]).map(doctor => ({
      id: doctor.id ?? '',
      name: doctor.profile?.full_name ?? 'Doctor',
      photo: doctor.profile?.avatar_url ?? undefined,
      specialization: doctor.specialization ?? '',
      hospitalId,
      hospitalName: doctor.clinic_name ?? '',
      rating: Number(doctor.rating ?? 0),
      experience: doctor.experience_years ?? 0,
      qualification: doctor.qualification ?? '',
      consultationFee: doctor.consultation_fee ?? 0,
      isAvailable: doctor.is_available ?? true,
      availableDays: [],
      availableSlots: [],
    }));
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    return this.getDoctorAvailability(doctorId, date);
  }

  async bookAppointment(_data: BookingFormData & Record<string, unknown>): Promise<void> {
    return undefined;
  }

  async getTodayAppointments(doctorId: string): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*, pet:pets(*, owner:profiles(*)), clinic:clinics(*)')
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', `${today}T00:00:00.000Z`)
      .lte('scheduled_at', `${today}T23:59:59.999Z`);
    throwIfError(error, "Unable to load today's appointments.");
    return ((data ?? []) as AppointmentRow[]).map(mapAppointment);
  }

  async getEmergencyAppointments(doctorId: string): Promise<Appointment[]> {
    const appointments = await this.getDoctorAppointments(doctorId);
    return appointments.filter(appointment => appointment.type === AppointmentType.EMERGENCY && appointment.status === AppointmentStatus.PENDING_APPROVAL);
  }

  async addDiagnosisAndPrescription(appointmentId: string, diagnosis: string, prescription: string): Promise<AppointmentRecord> {
    return this.appointments.update(appointmentId, { diagnosis, prescription, status: 'completed' });
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<AppointmentRecord> {
    return this.appointments.update(appointmentId, { status: 'cancelled', notes: reason });
  }

  async rateAppointment(appointmentId: string, _rating: number, review?: string): Promise<AppointmentRecord> {
    return this.appointments.update(appointmentId, { notes: review });
  }
}

export const appointmentService = new AppointmentService();