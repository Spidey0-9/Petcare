import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';
import { SupabaseRepository } from '../../repositories';
import { throwIfError, toAppError } from '../errors';
import { logDatabaseFailure } from '../database/databaseDiagnostics';
import { authSecurityService } from '../security/authSecurityService';
import type {
  GroomerRecord,
  GroomingBookingRecord,
  GroomingBookingStatus,
  GroomingClinicRecord,
  GroomingServiceRecord,
  PetRecord,
  ProfileRecord,
} from '../../types';

export type GroomingDirectoryItem = GroomingClinicRecord & {
  services: GroomingServiceRecord[];
  groomers: GroomerRecord[];
};

export type GroomingBookingInput = {
  ownerId: string;
  petId: string;
  clinicId: string;
  serviceId: string;
  groomerId?: string | null;
  serviceDate: string;
  serviceTime: string;
  pickupRequired?: boolean;
  dropoffRequired?: boolean;
  serviceAddress?: string | null;
  symptoms?: string | null;
  medicalNotes?: string | null;
  notes?: string | null;
};

export type GroomingDashboardData = {
  groomer: GroomerRecord | null;
  profile: ProfileRecord | null;
  clinic: GroomingClinicRecord | null;
  bookings: GroomingBookingRecord[];
  services: GroomingServiceRecord[];
};

const ACTIVE_BOOKING_STATUSES: GroomingBookingStatus[] = ['requested', 'confirmed', 'in_progress', 'rescheduled'];

function assertRequired(value: string | null | undefined, label: string) {
  if (!value) throw new Error(`${label} is required before booking grooming.`);
}

function buildScheduledAt(date: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const scheduledAt = new Date(`${date}T${normalizedTime}`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error('Choose a valid grooming date and time.');
  }
  return scheduledAt.toISOString();
}

function isNotificationMetadataMissing(error: { code?: string; message?: string } | null) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /column .* does not exist/i.test(error?.message ?? '');
}

function groomingStatusCopy(status: GroomingBookingStatus) {
  if (status === 'confirmed') return { title: 'Grooming approved', body: 'Your grooming booking has been approved.', type: 'grooming_approved', action: 'grooming.approved' };
  if (status === 'rejected') return { title: 'Grooming rejected', body: 'Your grooming booking was rejected. You can choose another slot.', type: 'grooming_rejected', action: 'grooming.rejected' };
  if (status === 'rescheduled') return { title: 'Grooming rescheduled', body: 'Your grooming booking was marked for rescheduling.', type: 'grooming_rescheduled', action: 'grooming.rescheduled' };
  if (status === 'cancelled') return { title: 'Grooming cancelled', body: 'Your grooming booking was cancelled.', type: 'grooming_cancelled', action: 'grooming.cancelled' };
  if (status === 'completed') return { title: 'Grooming completed', body: 'Your grooming service has been completed.', type: 'grooming_completed', action: 'grooming.completed' };
  if (status === 'in_progress') return { title: 'Grooming started', body: 'Your grooming service has started.', type: 'grooming_started', action: 'grooming.started' };
  return { title: 'Grooming updated', body: 'Your grooming booking status was updated.', type: 'grooming_updated', action: 'grooming.updated' };
}

async function insertGroomingNotification(input: { userId?: string | null; title: string; body: string; type: string; bookingId?: string | null; data?: Record<string, unknown>; action?: string | null; actorId?: string | null; organizationId?: string | null }) {
  if (!input.userId) return;
  const payload = {
    user_id: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    data: input.data ?? {},
    reference_table: TABLES.groomingBookings,
    reference_id: input.bookingId ?? null,
    action: input.action ?? input.type,
    actor_id: input.actorId ?? null,
    organization_id: input.organizationId ?? null,
  };
  const { error } = await supabase.from(TABLES.notifications).insert(payload);
  if (isNotificationMetadataMissing(error)) {
    const { action, actor_id, organization_id, ...fallbackPayload } = payload;
    const retry = await supabase.from(TABLES.notifications).insert(fallbackPayload);
    if (retry.error) console.warn('[GroomingWorkflow] notification insert failed:', retry.error);
    return;
  }
  if (error) console.warn('[GroomingWorkflow] notification insert failed:', error);
}

async function notifyOwnerOfGroomingStatus(booking: GroomingBookingRecord, status: GroomingBookingStatus) {
  const copy = groomingStatusCopy(status);
  await insertGroomingNotification({
    userId: booking.owner_id,
    title: copy.title,
    body: copy.body,
    type: copy.type,
    bookingId: booking.id,
    data: { bookingId: booking.id, groomerId: booking.groomer_id, clinicId: booking.clinic_id, serviceId: booking.service_id, status },
  });
}

export class GroomingService {
  private readonly clinics = new SupabaseRepository<GroomingClinicRecord>(TABLES.groomingClinics);
  private readonly groomers = new SupabaseRepository<GroomerRecord>(TABLES.groomers);
  private readonly services = new SupabaseRepository<GroomingServiceRecord>(TABLES.groomingServices);
  private readonly bookings = new SupabaseRepository<GroomingBookingRecord>(TABLES.groomingBookings);

  async getCurrentUserId() {
    const { data, error } = await supabase.auth.getUser();
    throwIfError(error, 'Unable to verify your session.');
    if (!data.user?.id) throw new Error('Login required.');
    return data.user.id;
  }

  async listOwnerPets(ownerId: string) {
    const { data, error } = await supabase
      .from(TABLES.pets)
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    throwIfError(error, 'Unable to load pets for grooming.');
    return (data ?? []) as PetRecord[];
  }

  async listDirectory(): Promise<GroomingDirectoryItem[]> {
    const [clinics, services, groomers] = await Promise.all([
      this.clinics.list({ filters: { is_active: true, approval_status: 'approved' }, orderBy: 'average_rating' }),
      this.services.list({ filters: { is_active: true }, orderBy: 'price', ascending: true }),
      this.groomers.list({ filters: { is_available: true, approval_status: 'approved' }, orderBy: 'rating' }),
    ]);

    return clinics.map(clinic => ({
      ...clinic,
      services: services.filter(service => service.clinic_id === clinic.id),
      groomers: groomers.filter(groomer => groomer.clinic_id === clinic.id),
    })).filter(clinic => clinic.services.length > 0);
  }

  async listOwnerBookings(ownerId: string) {
    return this.bookings.list({ filters: { owner_id: ownerId }, orderBy: 'scheduled_at' });
  }

  async listGroomerBookings(groomerId: string) {
    return this.bookings.list({ filters: { groomer_id: groomerId }, orderBy: 'scheduled_at' });
  }

  async getCurrentGroomerDashboard(): Promise<GroomingDashboardData> {
    const userId = await this.getCurrentUserId();

    const { data: profile, error: profileError } = await supabase
      .from(TABLES.profiles)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    throwIfError(profileError, 'Unable to load groomer profile.');

    const { data: groomer, error: groomerError } = await supabase
      .from(TABLES.groomers)
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle();
    throwIfError(groomerError, 'Unable to load groomer record.');

    if (!groomer) {
      return { profile: profile as ProfileRecord | null, groomer: null, clinic: null, bookings: [], services: [] };
    }

    const [clinic, bookings, services] = await Promise.all([
      groomer.clinic_id ? this.clinics.getById(groomer.clinic_id) : Promise.resolve(null),
      this.listGroomerBookings(groomer.id),
      groomer.clinic_id ? this.services.list({ filters: { clinic_id: groomer.clinic_id }, orderBy: 'price', ascending: true }) : Promise.resolve([]),
    ]);

    return {
      profile: profile as ProfileRecord | null,
      groomer,
      clinic,
      bookings,
      services,
    };
  }

  async createBooking(input: GroomingBookingInput) {
    assertRequired(input.ownerId, 'Owner');
    assertRequired(input.petId, 'Pet');
    assertRequired(input.clinicId, 'Grooming clinic');
    assertRequired(input.serviceId, 'Grooming service');
    assertRequired(input.serviceDate, 'Date');
    assertRequired(input.serviceTime, 'Time');

    const { data: service, error: serviceError } = await supabase
      .from(TABLES.groomingServices)
      .select('*')
      .eq('id', input.serviceId)
      .single();
    throwIfError(serviceError, 'Unable to validate grooming service.');

    const scheduledAt = buildScheduledAt(input.serviceDate, input.serviceTime);
    const groomerId = input.groomerId ?? service.groomer_id ?? null;

    if (groomerId) {
      const { data: existing, error: slotError } = await supabase
        .from(TABLES.groomingBookings)
        .select('id,status')
        .eq('groomer_id', groomerId)
        .eq('scheduled_at', scheduledAt)
        .in('status', ACTIVE_BOOKING_STATUSES);
      throwIfError(slotError, 'Unable to verify grooming slot availability.');
      if ((existing ?? []).length > 0) throw new Error('This grooming slot is already booked. Please choose another time.');
    }

    const payload = {
      owner_id: input.ownerId,
      pet_id: input.petId,
      clinic_id: input.clinicId,
      service_id: input.serviceId,
      groomer_id: groomerId,
      scheduled_at: scheduledAt,
      service_date: input.serviceDate,
      service_time: input.serviceTime,
      pickup_required: input.pickupRequired ?? false,
      dropoff_required: input.dropoffRequired ?? false,
      service_address: input.serviceAddress ?? null,
      symptoms: input.symptoms ?? null,
      medical_notes: input.medicalNotes ?? null,
      notes: input.notes ?? null,
      price: Number(service.price ?? 0),
      payment_status: 'pending',
      status: 'requested' satisfies GroomingBookingStatus,
    };

    try {
      const booking = await this.bookings.create(payload);
      await this.notifyGroomer(booking);
      await authSecurityService.recordAudit({
        actorId: input.ownerId,
        actorRole: 'pet_owner',
        action: 'grooming.booked',
        entityType: TABLES.groomingBookings,
        entityId: booking.id,
        metadata: { groomer_id: groomerId, clinic_id: input.clinicId, service_id: input.serviceId, pet_id: input.petId, scheduled_at: scheduledAt },
      });
      return booking;
    } catch (error) {
      await logDatabaseFailure({
        module: 'GroomingService',
        table: TABLES.groomingBookings,
        operation: 'createBooking',
        query: 'insert grooming booking with owner/pet/clinic/service/groomer',
      }, error);
      throw toAppError(error, 'Unable to book grooming appointment.');
    }
  }

  async updateBookingStatus(bookingId: string, status: GroomingBookingStatus) {
    const booking = await this.bookings.update(bookingId, { status });
    await notifyOwnerOfGroomingStatus(booking, status);
    const { data: userData } = await supabase.auth.getUser();
    await authSecurityService.recordAudit({
      actorId: userData.user?.id ?? null,
      action: groomingStatusCopy(status).action,
      entityType: TABLES.groomingBookings,
      entityId: booking.id,
      metadata: { status, owner_id: booking.owner_id, groomer_id: booking.groomer_id, clinic_id: booking.clinic_id, service_id: booking.service_id },
      severity: status === 'rejected' || status === 'cancelled' ? 'warning' : 'info',
    });
    return booking;
  }

  async notifyGroomer(booking: GroomingBookingRecord) {
    if (!booking.groomer_id) return;

    const { data: groomer, error: groomerError } = await supabase
      .from(TABLES.groomers)
      .select('profile_id')
      .eq('id', booking.groomer_id)
      .maybeSingle();
    if (groomerError || !groomer?.profile_id) return;

    const payload = {
      user_id: groomer.profile_id,
      title: 'New grooming booking',
      body: 'A pet owner requested a grooming appointment.',
      type: 'grooming_booking',
      data: { booking_id: booking.id, clinic_id: booking.clinic_id, service_id: booking.service_id },
      reference_table: TABLES.groomingBookings,
      reference_id: booking.id,
      action: 'grooming.assigned',
      actor_id: booking.owner_id,
      organization_id: booking.clinic_id ?? null,
    };

    const { error } = await supabase.from(TABLES.notifications).insert(payload);
    if (isNotificationMetadataMissing(error)) {
      const { action, actor_id, organization_id, ...fallbackPayload } = payload;
      const retry = await supabase.from(TABLES.notifications).insert(fallbackPayload);
      if (retry.error) {
        await logDatabaseFailure({ module: 'GroomingService', table: TABLES.notifications, operation: 'notifyGroomer', query: 'insert grooming notification fallback' }, retry.error);
      }
      return;
    }

    if (error) {
      await logDatabaseFailure({ module: 'GroomingService', table: TABLES.notifications, operation: 'notifyGroomer', query: 'insert grooming notification' }, error);
    }
  }
}

export const groomingService = new GroomingService();



