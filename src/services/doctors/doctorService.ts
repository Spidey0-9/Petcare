import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { AppointmentRecord, DoctorRecord, MedicalRecord, PetRecord, ProfileRecord } from '../../types';
import { AppError, throwIfError } from '../errors';
import { logDatabaseFailure } from '../database/databaseDiagnostics';
import { storageService } from '../storage';

export type DoctorProfile = DoctorRecord & {
  profile?: ProfileRecord | null;
  rating?: number | string | null;
  review_count?: number | null;
};

export type DoctorAppointmentCard = AppointmentRecord & {
  pet?: PetRecord | null;
  owner?: ProfileRecord | null;
  appointment_type?: string | null;
  symptoms?: string | null;
  video_url?: string | null;
};

export type DoctorPatient = PetRecord & {
  owner?: ProfileRecord | null;
  last_appointment_at?: string | null;
};

export type DoctorDashboardStats = {
  todaysAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalPatients: number;
  newPatients: number;
  monthlyConsultations: number;
  averageRating: number;
};


function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export class DoctorService {
  private readonly doctors = new SupabaseRepository<DoctorRecord>(TABLES.doctors);
  private readonly medicalRecords = new SupabaseRepository<MedicalRecord>(TABLES.medicalRecords);

  /**
   * Retrieves a list of all doctor records.
   * @returns A promise that resolves with the list of doctors or an error.
   */
  listDoctors() {
    return this.doctors.list({ orderBy: 'created_at' });
  }

  /**
   * Retrieves a single doctor record by its ID.
   * @param id The UUID of the doctor to retrieve.
   * @returns A promise that resolves with the doctor record or an error.
   */
  getDoctor(id: string) {
    return this.doctors.getById(id);
  }

  private async updateDoctorById(id: string, payload: Partial<DoctorRecord>, operation: string) {
    const { data: userData } = await supabase.auth.getUser();
    const authUserId = userData.user?.id ?? null;

    const { data, error } = await supabase.rpc('update_own_doctor', {
      _doctor_id: id,
      _patch: payload,
    });

    if (error) {
      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.doctors,
        operation,
        query: `rpc update_own_doctor doctor_id=${id} auth_uid=${authUserId}`,
      }, error);
      throwIfError(error, 'Unable to update doctor profile.');
    }

    const doctor = (Array.isArray(data) ? data[0] : data) as DoctorProfile | null;
    if (!doctor?.id) {
      const ownershipError = new AppError(
        'The doctor row could not be updated for the authenticated doctor account.',
        'DOCTOR_UPDATE_ZERO_ROWS',
        { authUserId, doctorId: id, payload },
        'permission_denied',
      );

      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.doctors,
        operation,
        query: `rpc update_own_doctor returned no doctor row for id=${id}`,
      }, ownershipError);
      throw ownershipError;
    }

    return doctor;
  }
  /**
   * Retrieves the full doctor profile for the currently authenticated user.
   * @param profileId The profile ID of the authenticated user to ensure the correct doctor profile is returned.
   * @returns The doctor profile, or null if not found or doesn't match the profileId.
   * @throws {AppError} If the database RPC call fails.
   */
  async getCurrentDoctor(profileId: string) {
    const { data, error } = await supabase.rpc('get_current_doctor_profile');

    if (error) {
      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.doctors,
        operation: 'getCurrentDoctor',
        query: 'rpc get_current_doctor_profile',
      }, error);
      throwIfError(error, 'Unable to load doctor profile.');
    }

    const doctor = (Array.isArray(data) ? data[0] : data) as DoctorProfile | null;
    if (!doctor || doctor.profile_id !== profileId) return null;
    return doctor;
  }
  /**
   * Ensures a doctor profile exists for the given user profile and returns it.
   * Throws an error if not found.
   * @param profile The user's profile record.
   * @returns The complete doctor profile.
   * @throws {Error} If the doctor profile could not be loaded for the authenticated account.
   */
  async ensureDoctorProfile(profile: ProfileRecord) {
    const { data, error } = await supabase.rpc('get_current_doctor_profile');

    if (error) {
      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.doctors,
        operation: 'ensureDoctorProfile',
        query: 'rpc get_current_doctor_profile',
      }, error);
      throwIfError(error, 'Unable to load doctor profile.');
    }

    const doctor = (Array.isArray(data) ? data[0] : data) as DoctorProfile | null;
    if (!doctor?.id || doctor.profile_id !== profile.id) {
      throw new Error('Doctor profile could not be loaded for the authenticated account.');
    }

    return { ...doctor, profile, is_available: doctor.is_available ?? true };
  }
  /**
   * Fetches key performance indicators for a doctor's dashboard.
   * @param doctorId The ID of the doctor.
   * @returns An object containing dashboard statistics.
   * @throws {AppError} If the doctor record cannot be loaded or the stats RPC call fails.
   */
  async getDashboardStats(doctorId: string): Promise<DoctorDashboardStats> {
    const doctor = await this.doctors.getById(doctorId);
    if (!doctor) throw new Error('Unable to load doctor for dashboard stats.');

    const { data, error } = await supabase.rpc('get_doctor_dashboard_stats', { p_doctor_id: doctorId });
    if (error) {
      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.appointments,
        operation: 'getDashboardStats',
        query: `rpc get_doctor_dashboard_stats doctor_id=${doctorId}`,
      }, error);
      throwIfError(error, 'Unable to load doctor dashboard stats.');
    }

    const stats = (Array.isArray(data) ? data[0] : data) as {
      todays_appointments: number;
      upcoming_appointments: number;
      completed_appointments: number;
      cancelled_appointments: number;
      total_patients: number;
      new_patients: number;
      monthly_consultations: number;
    } | null;

    return {
      todaysAppointments: stats?.todays_appointments ?? 0,
      upcomingAppointments: stats?.upcoming_appointments ?? 0,
      completedAppointments: stats?.completed_appointments ?? 0,
      cancelledAppointments: stats?.cancelled_appointments ?? 0,
      totalPatients: stats?.total_patients ?? 0,
      newPatients: stats?.new_patients ?? 0,
      monthlyConsultations: stats?.monthly_consultations ?? 0,
      averageRating: Number((doctor as DoctorProfile | null)?.rating ?? 0),
    };
  }
  /**
   * Lists all appointments for a specific doctor, including related pet and owner details.
   * @param doctorId The ID of the doctor.
   * @returns An array of appointment card data.
   * @throws {AppError} If the database query fails.
   */
  async listAppointments(doctorId: string) {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*, pet:pets(*), owner:profiles!appointments_owner_id_fkey(*)')
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.appointments,
        operation: 'listAppointments',
        query: 'select appointments with pet and owner relationships by doctor_id',
      }, error);
      throwIfError(error, 'Unable to load doctor appointments.');
    }

    return (data ?? []) as DoctorAppointmentCard[];
  }
  /**
   * Lists appointments scheduled for the current day for a specific doctor.
   * @param doctorId The ID of the doctor.
   * @returns An array of today's appointment card data.
   * @throws {AppError} If the database query fails.
   */
  async listTodaysAppointments(doctorId: string) {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*, pet:pets(*), owner:profiles!appointments_owner_id_fkey(*)')
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', startOfToday().toISOString())
      .lt('scheduled_at', startOfTomorrow().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      await logDatabaseFailure({
        module: 'DoctorService',
        table: TABLES.appointments,
        operation: 'listTodaysAppointments',
        query: 'select today appointments with pet and owner relationships by doctor_id',
      }, error);
      throwIfError(error, 'Unable to load today appointments.');
    }

    return (data ?? []) as DoctorAppointmentCard[];
  }
  /**
   * Updates the status of a single appointment.
   * @param id The ID of the appointment to update.
   * @param status The new status for the appointment.
   * @returns A promise that resolves with the updated appointment or an error.
   */
  updateAppointmentStatus(id: string, status: AppointmentRecord['status']) {
    return new SupabaseRepository<AppointmentRecord>(TABLES.appointments).update(id, { status });
  }

  /**
   * Compiles a unique list of patients (pets) from a doctor's appointment history.
   * @param doctorId The ID of the doctor.
   * @returns An array of unique patient profiles.
   */
  async listPatients(doctorId: string) {
    const appointments = await this.listAppointments(doctorId);
    const byPet = new Map<string, DoctorPatient>();

    appointments.forEach((appointment) => {
      if (!appointment.pet || byPet.has(appointment.pet.id)) return;
      byPet.set(appointment.pet.id, {
        ...appointment.pet,
        owner: appointment.owner ?? null,
        last_appointment_at: appointment.scheduled_at,
      });
    });

    return [...byPet.values()];
  }

  /**
   * Updates a doctor's availability schedule and their general availability status.
   * @param id The ID of the doctor to update.
   * @param availability The new availability data (e.g., a JSON object with schedule).
   * @param isAvailable The doctor's general availability status.
   * @returns The updated doctor profile.
   * @throws {AppError} If the update fails.
   */
  async updateAvailability(id: string, availability: unknown, isAvailable = true) {
    return this.updateDoctorById(id, { availability, is_available: isAvailable }, 'updateAvailability');
  }

  /**
   * Toggles a doctor's online status for immediate availability.
   * @param id The ID of the doctor to update.
   * @param isAvailable The new online status.
   * @returns The updated doctor profile.
   * @throws {AppError} If the update fails.
   */
  async updateOnlineStatus(id: string, isAvailable: boolean) {
    return this.updateDoctorById(id, { is_available: isAvailable }, 'updateOnlineStatus');
  }

  /**
   * Retrieves all medical records created by a specific doctor.
   * @param doctorId The ID of the doctor.
   * @returns A promise resolving to the list of medical records.
   */
  async listPatientRecords(doctorId: string) {
    return this.medicalRecords.list({ filters: { doctor_id: doctorId }, orderBy: 'created_at' });
  }

  /**
   * Creates a new medical record.
   * @param payload The data for the new medical record.
   * @returns The newly created medical record.
   */
  createMedicalRecord(payload: Partial<MedicalRecord>) {
    return this.medicalRecords.create(payload);
  }

  /**
   * Updates an existing medical record.
   * @param id The ID of the medical record to update.
   * @param payload The fields to update.
   * @returns A promise resolving to the updated record.
   */
  updateMedicalRecord(id: string, payload: Partial<MedicalRecord>) {
    return this.medicalRecords.update(id, payload);
  }

  /**
   * Uploads a new profile image for a doctor and updates their profile record.
   * @param profileId The doctor's profile ID, used as a prefix for the storage path.
   * @param file The file to upload, containing a local URI, file name, and MIME type.
   * @returns The public URL of the uploaded image.
   * @throws {AppError} If the upload or profile update fails.
   */
  async uploadDoctorImage(profileId: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return storageService.uploadFile(STORAGE_BUCKETS.doctorImages, profileId, file);
  }
}

export const doctorService = new DoctorService();
