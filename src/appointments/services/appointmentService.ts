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
import { authSecurityService } from '../../services/security/authSecurityService';

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
  type?: string | null;
  appointment_type?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
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

type DoctorRow = DoctorRecord & { profile?: Pick<ProfileRecord, 'full_name' | 'avatar_url'> | null; rating?: number | string | null; review_count?: number | null; clinic_id?: string | null };

type ClinicRow = ClinicRecord;

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

function toDatabaseAppointmentType(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return '';
  if (normalized === AppointmentType.VIDEO_CONSULTATION || normalized === 'VIDEO') return 'VIDEO';
  if (normalized === AppointmentType.HOME_VISIT) return 'HOME_VISIT';
  if (normalized === AppointmentType.EMERGENCY) return 'EMERGENCY';
  return 'CLINIC';
}

function appointmentDateFromScheduledAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function appointmentTimeFromScheduledAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 19);
}

function validateAppointmentPayload(payload: AppointmentBookingPayload) {
  const missing: string[] = [];
  if (!payload.ownerId) missing.push('owner_id');
  if (!payload.petId) missing.push('pet_id');
  if (!payload.doctorId) missing.push('doctor_id');
  if (!payload.clinicId) missing.push('clinic_id');
  if (!payload.scheduledAt) missing.push('scheduled_at');
  if (!toDatabaseAppointmentType(payload.appointmentType)) missing.push('appointment_type');
  if (!appointmentDateFromScheduledAt(payload.scheduledAt)) missing.push('appointment_date');
  if (!appointmentTimeFromScheduledAt(payload.scheduledAt)) missing.push('appointment_time');
  if (missing.length > 0) {
    throw new Error(`Appointment booking is missing required fields: ${missing.join(', ')}.`);
  }
}

function timeSlot(value: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function paymentStatus(value?: string | null): PaymentStatus {
  if (value === 'paid' || value === 'completed') return PaymentStatus.PAID;
  if (value === 'refunded') return PaymentStatus.REFUNDED;
  return PaymentStatus.PENDING;
}

function isNotificationMetadataMissing(error: { code?: string; message?: string } | null) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /column .* does not exist/i.test(error?.message ?? '');
}

function appointmentStatusCopy(status: string) {
  if (status === 'accepted' || status === 'confirmed') {
    return { title: 'Appointment approved', body: 'Your appointment has been approved by the doctor.', type: 'appointment_approved', action: 'appointment.approved' };
  }
  if (status === 'rejected') {
    return { title: 'Appointment rejected', body: 'Your appointment request was rejected. You can book another slot.', type: 'appointment_rejected', action: 'appointment.rejected' };
  }
  if (status === 'rescheduled') {
    return { title: 'Appointment rescheduled', body: 'Your appointment was marked for rescheduling.', type: 'appointment_rescheduled', action: 'appointment.rescheduled' };
  }
  if (status === 'cancelled') {
    return { title: 'Appointment cancelled', body: 'Your appointment was cancelled.', type: 'appointment_cancelled', action: 'appointment.cancelled' };
  }
  if (status === 'completed') {
    return { title: 'Appointment completed', body: 'Your appointment has been completed.', type: 'appointment_completed', action: 'appointment.completed' };
  }
  return { title: 'Appointment updated', body: 'Your appointment status was updated.', type: 'appointment_updated', action: 'appointment.updated' };
}

async function insertAppointmentNotification(input: {
  userId?: string | null;
  title: string;
  body: string;
  type: string;
  appointmentId?: string | null;
  data?: Record<string, unknown>;
  action?: string | null;
  actorId?: string | null;
  organizationId?: string | null;
}) {
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
  const { data: doctor, error } = await supabase
    .from(TABLES.doctors)
    .select('profile_id')
    .eq('id', appointment.doctor_id)
    .maybeSingle();
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
function distanceInKm(origin: { latitude: number; longitude: number }, target: { latitude: number; longitude: number }) {
  const radius = 6371;
  const dLat = ((target.latitude - origin.latitude) * Math.PI) / 180;
  const dLon = ((target.longitude - origin.longitude) * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lat2 = (target.latitude * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function normalizeStringArray(value?: string[] | null) {
  return Array.isArray(value) ? value.filter(item => item.trim().length > 0) : [];
}

function hospitalDisplayName(clinic: ClinicRow) {
  return clinic.hospital_name ?? clinic.name ?? 'Unnamed hospital';
}

function hospitalRejectionReasons(clinic: ClinicRow) {
  const reasons: string[] = [];
  if (clinic.is_active === false) reasons.push('is_active=false');
  return reasons;
}

function openStatus(clinic: ClinicRow) {
  if (clinic.open_24_hours || clinic.is_24x7) return 'Open 24 hours';
  if (clinic.opening_time && clinic.closing_time) return `${clinic.opening_time} - ${clinic.closing_time}`;
  return 'Hours not listed';
}

function mapHospital(clinic: ClinicRow, location?: { latitude: number; longitude: number }): Hospital {
  const hasCoordinates = typeof clinic.latitude === 'number' && typeof clinic.longitude === 'number';
  const distance = location && hasCoordinates
    ? distanceInKm(location, { latitude: clinic.latitude ?? 0, longitude: clinic.longitude ?? 0 })
    : null;
  const rating = Number(clinic.average_rating ?? clinic.rating ?? 0);
  return {
    id: clinic.id,
    name: clinic.hospital_name ?? clinic.name,
    logoUrl: clinic.logo_url ?? undefined,
    coverImage: clinic.cover_image ?? undefined,
    galleryImages: normalizeStringArray(clinic.gallery_images),
    address: clinic.address ?? '',
    area: clinic.area ?? '',
    city: clinic.city ?? '',
    state: clinic.state ?? '',
    pincode: clinic.pincode ?? '',
    latitude: clinic.latitude ?? null,
    longitude: clinic.longitude ?? null,
    phone: clinic.phone ?? '',
    email: clinic.email ?? '',
    website: clinic.website ?? '',
    description: clinic.description ?? '',
    rating,
    reviewCount: clinic.review_count ?? 0,
    services: normalizeStringArray(clinic.facilities ?? clinic.departments),
    departments: normalizeStringArray(clinic.departments),
    facilities: normalizeStringArray(clinic.facilities),
    consultationFee: Number(clinic.consultation_fee ?? 0),
    totalDoctors: clinic.total_doctors ?? 0,
    availableDoctors: clinic.available_doctors ?? 0,
    totalBeds: clinic.total_beds ?? 0,
    is24x7: Boolean(clinic.open_24_hours ?? clinic.is_24x7 ?? false),
    emergencyAvailable: Boolean(clinic.emergency_available ?? false),
    parkingAvailable: Boolean(clinic.parking_available ?? false),
    wheelchairAccessible: Boolean(clinic.wheelchair_accessible ?? false),
    ambulanceService: Boolean(clinic.ambulance_service ?? false),
    pharmacyAvailable: Boolean(clinic.pharmacy_available ?? false),
    laboratoryAvailable: Boolean(clinic.laboratory_available ?? false),
    openingTime: clinic.opening_time ?? undefined,
    closingTime: clinic.closing_time ?? undefined,
    distance,
    distanceLabel: distance === null ? 'Location unavailable' : `${distance.toFixed(1)} km Away`,
    todayAvailability: openStatus(clinic),
  };
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
    type: toAppointmentType(row.type ?? row.reason ?? row.appointment_type),
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

  async createAppointmentAfterPayment(payload: AppointmentBookingPayload, paymentId: string): Promise<AppointmentRecord> {
    validateAppointmentPayload(payload);

    const databaseAppointmentType = toDatabaseAppointmentType(payload.appointmentType);
    const appointmentDate = appointmentDateFromScheduledAt(payload.scheduledAt);
    const appointmentTime = appointmentTimeFromScheduledAt(payload.scheduledAt);

    console.info('[AppointmentCreation] creating appointment', {
      appointment_type: databaseAppointmentType,
      pet_id: payload.petId,
      doctor_id: payload.doctorId,
      clinic_id: payload.clinicId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      payment_id: paymentId,
    });

    const { count, error: conflictError } = await supabase
      .from(TABLES.appointments)
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', payload.doctorId)
      .eq('scheduled_at', payload.scheduledAt)
      .not('status', 'in', '(cancelled,rejected)');
    throwIfError(conflictError, 'Database error checking for slot conflicts.');
    if (count && count > 0) throw new Error('This time slot was just booked. Please select a different slot.');

    const appointment = await this.appointments.create({
      owner_id: payload.ownerId,
      pet_id: payload.petId,
      doctor_id: payload.doctorId,
      clinic_id: payload.clinicId,
      scheduled_at: payload.scheduledAt,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_type: databaseAppointmentType,
      type: payload.appointmentType,
      status: 'pending',
      reason: payload.symptoms,
      symptoms: payload.symptoms,
      notes: payload.notes,
      fee: payload.fee,
      payment_status: paymentId === 'pending-payment' ? 'pending' : 'pending',
      payment_id: paymentId === 'pending-payment' ? null : paymentId,
    });

    await notifyDoctorOfNewAppointment(appointment);
    await authSecurityService.recordAudit({
      actorId: payload.ownerId,
      actorRole: 'pet_owner',
      action: 'appointment.created',
      entityType: TABLES.appointments,
      entityId: appointment.id,
      metadata: {
        doctor_id: payload.doctorId,
        pet_id: payload.petId,
        clinic_id: payload.clinicId,
        scheduled_at: payload.scheduledAt,
        appointment_type: databaseAppointmentType,
      },
    });

    return appointment;
  }

  async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus, reason?: string): Promise<AppointmentRecord> {
    const backendStatus = toBackendStatus(status);
    const updated = await this.appointments.update(appointmentId, { status: backendStatus, notes: reason });
    await notifyOwnerOfAppointmentStatus(updated, backendStatus, reason);
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({
      actorId: userData.user?.id ?? null,
      action: appointmentStatusCopy(backendStatus).action,
      entityType: TABLES.appointments,
      entityId: updated.id,
      metadata: { status: backendStatus, reason: reason ?? null, doctor_id: updated.doctor_id, owner_id: updated.owner_id },
    });
    return updated;
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

  async getHospitals(location?: { latitude: number; longitude: number }): Promise<Hospital[]> {

    const { data, error } = await supabase
      .from(TABLES.clinics)
      .select('*')
      .range(0, 99);

    if (error) {
      console.error('[HospitalDiscovery] Supabase clinics query failed', {
        table: TABLES.clinics,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throwIfError(error, 'Unable to load hospitals.');
    }

    const rows = (data ?? []) as ClinicRow[];
    const hospitals = rows
      .filter(clinic => hospitalRejectionReasons(clinic).length === 0)
      .map(clinic => mapHospital(clinic, location))
      .sort((left, right) => {
        if (left.distance !== null && right.distance !== null) return left.distance - right.distance;
        if (left.distance !== null) return -1;
        if (right.distance !== null) return 1;
        return left.name.localeCompare(right.name);
      });
    return hospitals;
  }

  async getHospitalDetails(hospitalId: string, location?: { latitude: number; longitude: number }): Promise<Hospital | null> {
    const { data, error } = await supabase
      .from(TABLES.clinics)
      .select('*')
      .eq('id', hospitalId)
      .maybeSingle();
    throwIfError(error, 'Unable to load hospital details.');
    return data ? mapHospital(data as ClinicRow, location) : null;
  }

  async getDoctorsByHospital(hospitalId: string): Promise<Doctor[]> {
    const hospital = await this.getHospitalDetails(hospitalId);
    const hospitalName = hospital?.name ?? '';
    const { data, error } = await supabase
      .from(TABLES.doctors)
      .select('*, profile:profiles(full_name, avatar_url)')
      .eq('is_available', true)
      .or(`clinic_id.eq.${hospitalId},clinic_name.eq.${hospitalName}`);
    throwIfError(error, 'Unable to load doctors for this hospital.');
    return ((data ?? []) as DoctorRow[]).map(doctor => {
      const availability = doctor.availability as { days?: string[]; slots?: string[] } | null;
      const slots = availability?.slots ?? [];
      return {
        id: doctor.id ?? '',
        name: doctor.profile?.full_name ?? 'Doctor',
        photo: doctor.profile?.avatar_url ?? undefined,
        specialization: doctor.specialization ?? '',
        hospitalId,
        hospitalName: doctor.clinic_name ?? hospitalName,
        rating: Number(doctor.rating ?? 0),
        reviewCount: doctor.review_count ?? 0,
        experience: doctor.experience_years ?? 0,
        qualification: doctor.qualification ?? '',
        consultationFee: doctor.consultation_fee ?? hospital?.consultationFee ?? 0,
        languages: doctor.languages ?? [],
        isAvailable: doctor.is_available ?? true,
        availableToday: Boolean(doctor.is_available ?? true) && slots.length > 0,
        availableDays: availability?.days ?? [],
        availableSlots: slots,
      };
    });
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    return this.getDoctorAvailability(doctorId, date);
  }

  async bookAppointment(data: BookingFormData & Record<string, unknown>): Promise<AppointmentRecord> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) throw new Error('Please login before booking an appointment.');
    if (!data.petId || !data.doctorId || !data.hospitalId || !data.date || !data.timeSlot || !data.type) {
      throw new Error('Appointment booking is missing required data.');
    }

    const scheduledAt = new Date(`${data.date}T${String(data.timeSlot).slice(0, 5)}:00`).toISOString();
    const fee = typeof data.fee === 'number' ? data.fee : 0;
    let paymentId: string | null = null;

    const { data: paymentData, error: paymentError } = await supabase
      .from(TABLES.payments)
      .insert({
        user_id: user.id,
        owner_id: user.id,
        amount: fee,
        currency: 'INR',
        status: fee > 0 ? 'pending' : 'not_required',
        method: 'online_gateway',
        provider: 'razorpay',
      })
      .select('id')
      .maybeSingle();

    if (!paymentError && paymentData?.id) paymentId = paymentData.id;

    const appointment = await this.createAppointmentAfterPayment({
      ownerId: user.id,
      petId: data.petId,
      doctorId: data.doctorId,
      clinicId: data.hospitalId,
      scheduledAt,
      appointmentType: String(data.type),
      symptoms: typeof data.symptoms === 'string' ? data.symptoms : undefined,
      notes: paymentId ? `payment_id:${paymentId}` : undefined,
      fee,
    }, paymentId ?? 'pending-payment');

    if (paymentId) {
      await supabase.from(TABLES.payments).update({ appointment_id: appointment.id }).eq('id', paymentId);
    }

    await supabase.from(TABLES.notifications).insert({
      user_id: user.id,
      title: 'Appointment request created',
      body: 'Your appointment request was sent to the hospital.',
      type: 'appointment_booked',
      data: { appointmentId: appointment.id, doctorId: data.doctorId, hospitalId: data.hospitalId },
      reference_table: TABLES.appointments,
      reference_id: appointment.id,
      action: 'appointment.created',
      actor_id: user.id,
      organization_id: appointment.clinic_id ?? null,
    });

    return appointment;
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
    const updated = await this.appointments.update(appointmentId, { diagnosis, prescription, status: 'completed' });
    await notifyOwnerOfAppointmentStatus(updated, 'completed');
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({
      actorId: userData.user?.id ?? null,
      action: 'appointment.completed',
      entityType: TABLES.appointments,
      entityId: updated.id,
      metadata: { doctor_id: updated.doctor_id, owner_id: updated.owner_id },
    });
    return updated;
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<AppointmentRecord> {
    const updated = await this.appointments.update(appointmentId, { status: 'cancelled', notes: reason });
    await notifyOwnerOfAppointmentStatus(updated, 'cancelled', reason);
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({
      actorId: userData.user?.id ?? null,
      action: 'appointment.cancelled',
      entityType: TABLES.appointments,
      entityId: updated.id,
      metadata: { reason: reason ?? null, doctor_id: updated.doctor_id, owner_id: updated.owner_id },
      severity: 'warning',
    });
    return updated;
  }

  async rateAppointment(appointmentId: string, _rating: number, review?: string): Promise<AppointmentRecord> {
    return this.appointments.update(appointmentId, { notes: review });
  }
}

export const appointmentService = new AppointmentService();





