import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';
import type { AppointmentRecord, CommunityPost, MedicalRecord, PetRecord, ProductRecord, ProfileRecord } from '../../types';
import { authService } from '../../services/auth';
import { petService, type PetListItem } from '../../services/pets';
import { reminderService } from '../../services/reminders';
import type { ReminderListItem } from '../../services/reminders/reminderService';
import { communityService } from '../../services/community';
import { medicalRecordService } from '../../services/medicalRecords';
import { vaccinationService, type VaccinationRecord } from '../../services/vaccinations';
import { healthService, type PetHealthLog } from '../../services/health/healthService';
import { aiService, type AiPredictionRecord } from '../../services/ai';
import { shopService } from '../../services/shop';
import { classifySupabaseError } from '../../services/errors';
import { logDatabaseFailure } from '../../services/database/databaseDiagnostics';

export type HomePetSummary = PetListItem & {
  healthScore: number;
};

export type HomeAppointmentSummary = {
  id: string;
  petId: string;
  petName: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  scheduledAt: string;
  status: string;
};

export type HomeReminderSummary = ReminderListItem & {
  displayTime: string;
};

export type HomeActivity = {
  id: string;
  day: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  bgColor: string;
  done: boolean;
};

export type HomeHealthMetric = {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendUp: boolean;
  progress: number;
  icon: string;
  color: string;
  bgColor: string;
};

export type HomeWeeklyStat = {
  id: string;
  label: string;
  percent: number;
  change: string;
  icon: string;
  color: string;
  bgColor: string;
};

export type HomeMembershipStatus = {
  label: string;
  status: string;
  plan: string | null;
  expiresAt: string | null;
};

export type HomeClinic = {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  isOpen: boolean;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type HomeOffer = {
  id: string;
  discount: string;
  title: string;
  subtitle: string;
  cta: string;
  bgFrom: string;
  bgTo: string;
  icon: string;
  iconColor: string;
  targetType: 'shop' | 'appointment' | 'ai' | 'vaccination';
};

export type HomeAchievement = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  color: string;
  bgColor: string;
  isNew?: boolean;
};

export type HomeCommunityPost = {
  id: string;
  type: 'lost' | 'adoption' | 'tip' | 'general';
  avatar: string;
  avatarColor: string;
  avatarBg: string;
  user: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  tag: string;
  tagColor: string;
  tagBg: string;
};

export type HomeRecommendedService = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  badge?: string;
};

export type HomeCareTip = {
  id: string;
  icon: string;
  title: string;
  text: string;
  color: string;
  bgColor: string;
};

export type HomeLocationStatus = 'granted' | 'denied' | 'unavailable';

export type HomeDashboardData = {
  profile: ProfileRecord | null;
  pets: HomePetSummary[];
  selectedPet: HomePetSummary | null;
  nextAppointment: HomeAppointmentSummary | null;
  reminders: HomeReminderSummary[];
  activities: HomeActivity[];
  healthMetrics: HomeHealthMetric[];
  weeklyStats: HomeWeeklyStat[];
  weeklyOverall: number;
  membership: HomeMembershipStatus;
  nearbyClinics: HomeClinic[];
  offers: HomeOffer[];
  achievements: HomeAchievement[];
  communityPosts: HomeCommunityPost[];
  recommendedServices: HomeRecommendedService[];
  careTips: HomeCareTip[];
  latestPrediction: AiPredictionRecord | null;
  locationStatus: HomeLocationStatus;
};

function compactDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatTime(value?: string | null) {
  const date = compactDate(value);
  if (!date) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function dayLabel(value?: string | null) {
  const date = compactDate(value);
  if (!date) return 'Recent';
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startDate - startToday) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDate(date.toISOString());
}

function isMissingSchemaObject(error: unknown) {
  const category = classifySupabaseError(error);
  return category === 'table_not_found' || category === 'schema_mismatch';
}

function distanceInKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function ageInMonths(value?: string | null) {
  const dob = compactDate(value);
  if (!dob) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth());
}

function ageLabel(value?: string | null) {
  const months = ageInMonths(value);
  if (months === null) return null;
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

function sameLocalDay(left?: string | null, right = new Date()) {
  const date = compactDate(left);
  if (!date) return false;
  return date.getFullYear() === right.getFullYear()
    && date.getMonth() === right.getMonth()
    && date.getDate() === right.getDate();
}

function logDashboardError(scope: string, error: unknown, table?: string, operation = 'load') {
  void logDatabaseFailure({
    module: 'HomeDashboardService',
    table,
    operation,
    query: scope,
  }, error);

  const category = classifySupabaseError(error);
  if (isMissingSchemaObject(error)) {
    console.error('[HomeDashboardService] ' + scope + ': ' + category);
    return;
  }

  console.error('[HomeDashboardService] ' + scope + ':', error);
}

async function safeLoad<T>(scope: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    logDashboardError(scope, error);
    return fallback;
  }
}

function calculatePetHealthScore(
  pet: PetRecord | PetListItem,
  records: MedicalRecord[] = [],
  vaccinations: VaccinationRecord[] = [],
  logs: PetHealthLog[] = [],
) {
  const checks = [
    pet.name,
    pet.species,
    pet.breed,
    pet.gender,
    pet.date_of_birth,
    pet.weight,
    pet.image_url,
    vaccinations.length > 0,
    records.length > 0,
    logs.length > 0,
  ];
  const profileScore = Math.round((checks.filter(value => value !== null && value !== undefined && value !== '' && value !== false).length / checks.length) * 100);
  const latestLogScore = logs
    .map(log => typeof log.health_score === 'number' ? log.health_score : null)
    .find((score): score is number => score !== null);
  return Math.max(0, Math.min(100, latestLogScore ?? profileScore));
}

function normalizePets(
  pets: PetListItem[],
  records: MedicalRecord[],
  vaccinations: VaccinationRecord[],
  logs: PetHealthLog[],
): HomePetSummary[] {
  return pets.map(pet => ({
    ...pet,
    healthScore: calculatePetHealthScore(
      pet,
      records.filter(record => record.pet_id === pet.id),
      vaccinations.filter(vaccine => vaccine.pet_id === pet.id || vaccine.pet_name === pet.name),
      logs.filter(log => log.pet_id === pet.id),
    ),
  }));
}

function percentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function buildHealthMetrics(
  pets: HomePetSummary[],
  reminders: HomeReminderSummary[],
  records: MedicalRecord[],
  vaccinations: VaccinationRecord[],
  logs: PetHealthLog[],
): HomeHealthMetric[] {
  if (!pets.length) return [];

  const petIds = new Set(pets.map(pet => pet.id));
  const petCount = pets.length;
  const avgScore = Math.round(pets.reduce((sum, pet) => sum + pet.healthScore, 0) / petCount);
  const weightTracked = percentage(pets.filter(pet => pet.weight || logs.some(log => log.pet_id === pet.id && log.weight)).length, petCount);
  const vaccinated = percentage(pets.filter(pet => vaccinations.some(vaccine => vaccine.pet_id === pet.id || vaccine.pet_name === pet.name)).length, petCount);
  const medicalComplete = percentage(pets.filter(pet => records.some(record => record.pet_id === pet.id)).length, petCount);
  const activeReminders = reminders.filter(reminder => reminder.is_active !== false).length;
  const linkedRecords = records.filter(record => petIds.has(record.pet_id)).length;

  return [
    { id: 'pets', icon: 'paw', label: 'Pets', value: String(petCount), unit: 'total', trend: `${petCount} profile${petCount === 1 ? '' : 's'}`, trendUp: true, progress: Math.min(1, petCount / Math.max(petCount, 1)), color: '#6C63FF', bgColor: '#F0EEFF' },
    { id: 'health', icon: 'heart-pulse', label: 'Health', value: String(avgScore), unit: 'score', trend: avgScore >= 80 ? 'Healthy' : avgScore >= 60 ? 'Review' : 'Needs data', trendUp: avgScore >= 60, progress: avgScore / 100, color: '#EF4444', bgColor: '#FEE2E2' },
    { id: 'weight', icon: 'scale-bathroom', label: 'Weight', value: String(weightTracked), unit: '% tracked', trend: `${logs.length} log${logs.length === 1 ? '' : 's'}`, trendUp: weightTracked > 0, progress: weightTracked / 100, color: '#0EA5E9', bgColor: '#E0F2FE' },
    { id: 'vaccines', icon: 'needle', label: 'Vaccines', value: String(vaccinated), unit: '%', trend: `${vaccinations.length} record${vaccinations.length === 1 ? '' : 's'}`, trendUp: vaccinated > 0, progress: vaccinated / 100, color: '#22C55E', bgColor: '#DCFCE7' },
    { id: 'medical', icon: 'file-document-edit', label: 'Medical', value: String(medicalComplete), unit: '%', trend: `${linkedRecords} file${linkedRecords === 1 ? '' : 's'}`, trendUp: medicalComplete > 0, progress: medicalComplete / 100, color: '#8B5CF6', bgColor: '#F3E8FF' },
    { id: 'reminders', icon: 'bell-ring', label: 'Reminders', value: String(activeReminders), unit: 'active', trend: activeReminders ? 'Scheduled' : 'None', trendUp: activeReminders > 0, progress: Math.min(1, activeReminders / Math.max(activeReminders, 1)), color: '#FF8F00', bgColor: '#FFF3E0' },
  ];
}

function buildWeeklyStats(
  pets: HomePetSummary[],
  reminders: HomeReminderSummary[],
  records: MedicalRecord[],
  vaccinations: VaccinationRecord[],
  logs: PetHealthLog[],
): HomeWeeklyStat[] {
  if (!pets.length) return [];

  const petCount = pets.length;
  const avgScore = Math.round(pets.reduce((sum, pet) => sum + pet.healthScore, 0) / petCount);
  const vaccination = percentage(pets.filter(pet => vaccinations.some(vaccine => vaccine.pet_id === pet.id || vaccine.pet_name === pet.name)).length, petCount);
  const medical = percentage(pets.filter(pet => records.some(record => record.pet_id === pet.id)).length, petCount);
  const weight = percentage(pets.filter(pet => pet.weight || logs.some(log => log.pet_id === pet.id && log.weight)).length, petCount);
  const remindersPercent = reminders.length ? percentage(reminders.filter(reminder => reminder.is_active !== false).length, reminders.length) : 0;

  return [
    { id: 'health', icon: 'heart-pulse', label: 'Health', percent: avgScore, change: avgScore >= 80 ? 'Healthy' : 'Needs review', color: '#EF4444', bgColor: '#FEE2E2' },
    { id: 'vacc', icon: 'needle', label: 'Vaccination', percent: vaccination, change: vaccination ? 'Tracked' : 'No records', color: '#0EA5E9', bgColor: '#E0F2FE' },
    { id: 'medical', icon: 'file-document', label: 'Medical Records', percent: medical, change: records.length ? 'Available' : 'None', color: '#8B5CF6', bgColor: '#F3E8FF' },
    { id: 'weight', icon: 'scale-bathroom', label: 'Weight', percent: weight, change: logs.length ? 'Logged' : 'No logs', color: '#22C55E', bgColor: '#DCFCE7' },
    { id: 'reminders', icon: 'pill', label: 'Reminders', percent: remindersPercent, change: reminders.length ? 'Active' : 'None', color: '#FF8F00', bgColor: '#FFF3E0' },
  ];
}

function buildActivities(
  pets: HomePetSummary[],
  appointment: HomeAppointmentSummary | null,
  reminders: HomeReminderSummary[],
  vaccinations: VaccinationRecord[],
  records: MedicalRecord[],
): HomeActivity[] {
  const activities: Array<HomeActivity & { sortAt?: string | null }> = [];

  pets.forEach(pet => {
    const sortAt = pet.updated_at ?? pet.created_at ?? null;
    activities.push({
      id: `pet-${pet.id}`,
      day: dayLabel(sortAt),
      title: `${pet.name} pet profile added`,
      time: formatTime(sortAt),
      icon: 'paw',
      color: '#6C63FF',
      bgColor: '#F0EEFF',
      done: true,
      sortAt,
    });
  });

  if (appointment) {
    activities.push({
      id: `appointment-${appointment.id}`,
      day: dayLabel(appointment.scheduledAt),
      title: `Appointment ${appointment.status} for ${appointment.petName}`,
      time: formatTime(appointment.scheduledAt),
      icon: 'doctor',
      color: '#0EA5E9',
      bgColor: '#E0F2FE',
      done: false,
      sortAt: appointment.scheduledAt,
    });
  }

  reminders.forEach(reminder => {
    const sortAt = reminder.created_at ?? reminder.scheduled_at;
    activities.push({
      id: `reminder-${reminder.id}`,
      day: dayLabel(sortAt),
      title: `${reminder.title} reminder created`,
      time: formatTime(sortAt),
      icon: reminder.type === 'vaccination' ? 'needle' : reminder.type === 'medicine' ? 'pill' : 'bell-ring',
      color: reminder.type === 'vaccination' ? '#22C55E' : '#FF8F00',
      bgColor: reminder.type === 'vaccination' ? '#DCFCE7' : '#FFF3E0',
      done: false,
      sortAt,
    });
  });

  vaccinations.forEach(vaccine => {
    const sortAt = vaccine.created_at ?? vaccine.given_date ?? null;
    activities.push({
      id: `vaccination-${vaccine.id}`,
      day: dayLabel(sortAt),
      title: `${vaccine.vaccine_name} vaccination added`,
      time: formatTime(sortAt),
      icon: 'needle',
      color: '#22C55E',
      bgColor: '#DCFCE7',
      done: vaccine.status === 'completed',
      sortAt,
    });
  });

  records.forEach(record => {
    activities.push({
      id: `record-${record.id}`,
      day: dayLabel(record.created_at),
      title: `${record.title} medical record uploaded`,
      time: formatTime(record.created_at),
      icon: 'file-document',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      done: true,
      sortAt: record.created_at,
    });
  });

  return activities
    .sort((a, b) => (compactDate(b.sortAt)?.getTime() ?? 0) - (compactDate(a.sortAt)?.getTime() ?? 0))
    .slice(0, 5)
    .map(({ sortAt, ...activity }) => activity);
}
async function getNextAppointment(ownerId: string, pets: HomePetSummary[]): Promise<HomeAppointmentSummary | null> {
  try {
    const { data, error } = await supabase
      .from(TABLES.appointments)
      .select('*')
      .eq('owner_id', ownerId)
      .gte('scheduled_at', new Date().toISOString())
      .not('status', 'in', '(cancelled,rejected,completed)')
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const appointment = data as AppointmentRecord;
    const pet = pets.find(item => item.id === appointment.pet_id);
    let doctorName = 'Assigned doctor pending';
    let specialty = 'Veterinary care';
    let clinic = 'Clinic not assigned';

    if (appointment.doctor_id) {
      const doctorResult = await supabase
        .from(TABLES.doctors)
        .select('specialization, profile:profiles(full_name)')
        .eq('id', appointment.doctor_id)
        .maybeSingle();
      if (!doctorResult.error && doctorResult.data) {
        const doctor = doctorResult.data as any;
        doctorName = doctor.profile?.full_name || doctorName;
        specialty = doctor.specialization || specialty;
      } else if (doctorResult.error) {
        logDashboardError('Failed to load appointment doctor', doctorResult.error);
      }
    }

    if (appointment.clinic_id) {
      const clinicResult = await supabase
        .from(TABLES.clinics)
        .select('name')
        .eq('id', appointment.clinic_id)
        .maybeSingle();
      if (!clinicResult.error && clinicResult.data?.name) clinic = clinicResult.data.name;
      else if (clinicResult.error) logDashboardError('Failed to load appointment clinic', clinicResult.error);
    }

    return {
      id: appointment.id,
      petId: appointment.pet_id,
      petName: pet?.name ?? 'Pet profile unavailable',
      doctorName,
      specialty,
      clinic,
      scheduledAt: appointment.scheduled_at,
      status: appointment.status,
    };
  } catch (error) {
    logDashboardError('Failed to load next appointment', error);
    return null;
  }
}

async function getMembership(userId: string): Promise<HomeMembershipStatus> {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('plan,status,expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { label: 'No active membership', status: 'none', plan: null, expiresAt: null };
    const expiresAt = typeof data.expires_at === 'string' ? data.expires_at : null;
    const active = data.status === 'active' && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
    return {
      label: active ? `${data.plan ?? 'Membership'} active` : `${data.status ?? 'Membership'} membership`,
      status: active ? 'active' : String(data.status ?? 'inactive'),
      plan: typeof data.plan === 'string' ? data.plan : null,
      expiresAt,
    };
  } catch (error) {
    logDashboardError('Failed to load membership', error);
    return { label: 'Membership unavailable', status: 'unavailable', plan: null, expiresAt: null };
  }
}

async function getReminders(userId: string): Promise<HomeReminderSummary[]> {
  const reminders = await reminderService.listByUser(userId);
  return reminders
    .filter(reminder => reminder.is_active !== false && sameLocalDay(reminder.scheduled_at))
    .sort((a, b) => {
      const left = compactDate(a.scheduled_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const right = compactDate(b.scheduled_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    })
    .map(reminder => ({ ...reminder, displayTime: formatTime(reminder.scheduled_at) }));
}

async function getNearbyClinics(coords?: { latitude: number; longitude: number } | null): Promise<HomeClinic[]> {
  if (!coords) return [];

  try {
    const { data, error } = await supabase
      .from(TABLES.clinics)
      .select('id,name,phone,address,latitude,longitude,rating,is_24x7');

    if (error) throw error;

    return (data ?? [])
      .map((clinic: any) => {
        const hasCoords = typeof clinic.latitude === 'number' && typeof clinic.longitude === 'number';
        const distanceKm = hasCoords
          ? distanceInKm(coords, { latitude: clinic.latitude, longitude: clinic.longitude })
          : Number.POSITIVE_INFINITY;

        return {
          id: clinic.id,
          name: clinic.name,
          address: clinic.address || 'Address unavailable',
          distance: Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km` : 'Distance unavailable',
          rating: clinic.rating ? Number(clinic.rating) : 0,
          isOpen: clinic.is_24x7 || false,
          phone: clinic.phone,
          latitude: clinic.latitude,
          longitude: clinic.longitude,
          distanceKm,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(({ distanceKm, ...clinic }) => clinic);
  } catch (error) {
    logDashboardError('Failed to load clinics from Supabase', error);
    return [];
  }
}

function productIsFeatured(product: ProductRecord & Record<string, unknown>) {
  if ('featured' in product) return product.featured === true;
  if ('is_featured' in product) return product.is_featured === true;
  return false;
}

async function getOffers(): Promise<HomeOffer[]> {
  try {
    const products = await shopService.listProducts(1, 20) as Array<ProductRecord & Record<string, unknown>>;
    return products
      .filter(productIsFeatured)
      .slice(0, 4)
      .map(product => ({
        id: product.id,
        discount: product.stock && product.stock > 0 ? `${product.stock} available` : 'Stock unavailable',
        title: product.name,
        subtitle: `INR ${Number(product.price ?? 0).toFixed(0)}`,
        cta: 'Shop Now',
        bgFrom: '#6C63FF',
        bgTo: '#8B5CF6',
        icon: 'shopping',
        iconColor: '#fff',
        targetType: 'shop',
      }));
  } catch (error) {
    logDashboardError('Failed to load featured products for offers', error);
    return [];
  }
}

async function getCommunityFeed(): Promise<HomeCommunityPost[]> {
  try {
    const posts = await communityService.listFeed(1, 4) as CommunityPost[];
    return posts.map(post => {
      const contentLower = String(post.content ?? '').toLowerCase();
      let type: 'lost' | 'adoption' | 'tip' | 'general' = 'general';
      let tag = 'General';
      let tagColor = '#0EA5E9';
      let tagBg = '#E0F2FE';

      if (contentLower.includes('lost') || contentLower.includes('missing') || contentLower.includes('find')) {
        type = 'lost';
        tag = 'Lost Pet';
        tagColor = '#EF4444';
        tagBg = '#FEE2E2';
      } else if (contentLower.includes('adopt') || contentLower.includes('kitten') || contentLower.includes('puppy')) {
        type = 'adoption';
        tag = 'Adoption';
        tagColor = '#22C55E';
        tagBg = '#DCFCE7';
      } else if (contentLower.includes('tip') || contentLower.includes('help') || contentLower.includes('care')) {
        type = 'tip';
        tag = 'Pet Tips';
        tagColor = '#6C63FF';
        tagBg = '#F0EEFF';
      }

      return {
        id: post.id,
        type,
        avatar: 'account-circle',
        avatarColor: tagColor,
        avatarBg: tagBg,
        user: 'Community member',
        time: dayLabel(post.created_at),
        content: post.content,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        tag,
        tagColor,
        tagBg,
      };
    });
  } catch (error) {
    logDashboardError('Failed to load community feed from Supabase', error);
    return [];
  }
}

function buildAchievements(
  pets: HomePetSummary[],
  vaccinations: VaccinationRecord[],
  appointments: HomeAppointmentSummary | null,
): HomeAchievement[] {
  const achievements: HomeAchievement[] = [];
  if (pets.length > 0) achievements.push({ id: 'first-pet', emoji: '1ST', title: 'First Pet', desc: `${pets.length} pet profile${pets.length === 1 ? '' : 's'} saved`, color: '#0EA5E9', bgColor: '#E0F2FE', isNew: true });
  if (pets.length > 0 && pets.every(pet => vaccinations.some(vaccine => vaccine.pet_id === pet.id || vaccine.pet_name === pet.name))) achievements.push({ id: 'vaccination-complete', emoji: 'VAC', title: 'Vaccination Complete', desc: 'All saved pets have vaccination records', color: '#22C55E', bgColor: '#DCFCE7', isNew: true });
  if (appointments) achievements.push({ id: 'appointment-ready', emoji: 'VET', title: 'Care Visit Scheduled', desc: 'Upcoming appointment is on the calendar', color: '#6C63FF', bgColor: '#F0EEFF', isNew: true });
  if (pets.some(pet => pet.healthScore >= 80)) achievements.push({ id: 'healthy-pet', emoji: 'HP', title: 'Healthy Pet', desc: 'A pet has a health score above 80', color: '#FF8F00', bgColor: '#FFF3E0', isNew: true });
  return achievements;
}

function buildRecommendedServices(
  pets: HomePetSummary[],
  vaccinations: VaccinationRecord[],
  appointment: HomeAppointmentSummary | null,
  records: MedicalRecord[],
): HomeRecommendedService[] {
  const services: HomeRecommendedService[] = [];
  const firstPet = pets[0];
  if (!firstPet) return services;

  const hasVaccination = vaccinations.some(vaccine => vaccine.pet_id === firstPet.id || vaccine.pet_name === firstPet.name);
  if (!hasVaccination) services.push({ id: `vaccination-${firstPet.id}`, icon: 'needle', label: `${firstPet.name} vaccination`, desc: 'No vaccination record found', color: '#0EA5E9', bgColor: '#E0F2FE', badge: 'vaccination' });
  if (!appointment) services.push({ id: `appointment-${firstPet.id}`, icon: 'calendar-plus', label: 'Book veterinary visit', desc: `${firstPet.name} has no upcoming appointment`, color: '#6C63FF', bgColor: '#F0EEFF', badge: 'appointment' });
  if (!records.some(record => record.pet_id === firstPet.id)) services.push({ id: `medical-${firstPet.id}`, icon: 'file-document', label: 'Upload medical record', desc: `${firstPet.name} has no medical file saved`, color: '#8B5CF6', bgColor: '#F3E8FF', badge: 'medical' });
  if ((ageInMonths(firstPet.date_of_birth) ?? 0) < 12) services.push({ id: `young-${firstPet.id}`, icon: 'baby-face-outline', label: 'Young pet checkup', desc: `${firstPet.name} is ${ageLabel(firstPet.date_of_birth) ?? 'young'}`, color: '#EC4899', bgColor: '#FDF2F8', badge: 'age' });
  return services.slice(0, 6);
}

function buildCareTips(
  pets: HomePetSummary[],
  vaccinations: VaccinationRecord[],
  records: MedicalRecord[],
): HomeCareTip[] {
  const pet = pets[0];
  if (!pet) return [];
  const tips: HomeCareTip[] = [];
  const petAge = ageLabel(pet.date_of_birth);
  if (petAge) tips.push({ id: 'age', icon: 'calendar-heart', title: `${pet.name} age care`, text: `${pet.name} is ${petAge}; keep care routines aligned with this life stage.`, color: '#6C63FF', bgColor: '#F0EEFF' });
  if (pet.breed) tips.push({ id: 'breed', icon: 'paw', title: `${pet.breed} care`, text: `Review breed-specific exercise, grooming, and nutrition with your veterinarian.`, color: '#0EA5E9', bgColor: '#E0F2FE' });
  if (!vaccinations.some(vaccine => vaccine.pet_id === pet.id || vaccine.pet_name === pet.name)) tips.push({ id: 'vaccination', icon: 'needle', title: 'Vaccination review', text: `${pet.name} has no saved vaccination record yet.`, color: '#22C55E', bgColor: '#DCFCE7' });
  if (!records.some(record => record.pet_id === pet.id)) tips.push({ id: 'records', icon: 'file-document', title: 'Medical history', text: `Upload ${pet.name}'s reports to improve dashboard health calculations.`, color: '#8B5CF6', bgColor: '#F3E8FF' });
  if (pet.healthScore < 70) tips.push({ id: 'health-score', icon: 'heart-pulse', title: 'Health score needs data', text: `Complete ${pet.name}'s profile and logs to improve the health score.`, color: '#EF4444', bgColor: '#FEE2E2' });
  return tips.slice(0, 4);
}

async function getPetHealthLogs(pets: HomePetSummary[] | PetListItem[]): Promise<PetHealthLog[]> {
  const rows = await Promise.all(pets.map(pet => safeLoad(`Failed to load health logs for pet ${pet.id}`, () => healthService.listPetLogs(pet.id), [] as PetHealthLog[])));
  return rows.flat();
}
export class HomeDashboardService {
  async getDashboardData(coords?: { latitude: number; longitude: number } | null, locationStatus: HomeLocationStatus = 'unavailable'): Promise<HomeDashboardData> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Login required.');

    const profilePromise = supabase
      .from(TABLES.profiles)
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const [profileResult, petRows, reminders, membership, medicalRecords, vaccinations, aiPredictions] = await Promise.all([
      profilePromise,
      safeLoad('Failed to load owner pets', () => petService.listByOwner(user.id), [] as PetListItem[]),
      safeLoad('Failed to load reminders', () => getReminders(user.id), [] as HomeReminderSummary[]),
      getMembership(user.id),
      safeLoad('Failed to load medical records', () => medicalRecordService.listByOwner(user.id), [] as MedicalRecord[]),
      safeLoad('Failed to load vaccinations', () => vaccinationService.listVaccinations(), [] as VaccinationRecord[]),
      safeLoad('Failed to load AI predictions', () => aiService.listPredictionHistory(user.id), [] as AiPredictionRecord[]),
    ]);

    if (profileResult.error) logDashboardError('Failed to load profile', profileResult.error);
    const profile = profileResult.error ? null : profileResult.data as ProfileRecord | null;
    const ownerPetIds = new Set(petRows.map(pet => pet.id));
    const ownerVaccinations = vaccinations.filter(vaccine => !vaccine.pet_id || ownerPetIds.has(vaccine.pet_id) || petRows.some(pet => pet.name === vaccine.pet_name));
    const healthLogs = await getPetHealthLogs(petRows);
    const pets = normalizePets(petRows, medicalRecords, ownerVaccinations, healthLogs);
    const selectedPet = pets[0] ?? null;

    const [nextAppointment, nearbyClinics, offers, communityPosts] = await Promise.all([
      getNextAppointment(user.id, pets),
      getNearbyClinics(coords),
      getOffers(),
      getCommunityFeed(),
    ]);

    const latestPrediction = aiPredictions
      .slice()
      .sort((a, b) => (compactDate(b.created_at)?.getTime() ?? 0) - (compactDate(a.created_at)?.getTime() ?? 0))[0] ?? null;
    const healthMetrics = buildHealthMetrics(pets, reminders, medicalRecords, ownerVaccinations, healthLogs);
    const weeklyStats = buildWeeklyStats(pets, reminders, medicalRecords, ownerVaccinations, healthLogs);
    const weeklyOverall = weeklyStats.length
      ? Math.round(weeklyStats.reduce((sum, stat) => sum + stat.percent, 0) / weeklyStats.length)
      : 0;
    const achievements = buildAchievements(pets, ownerVaccinations, nextAppointment);
    const recommendedServices = buildRecommendedServices(pets, ownerVaccinations, nextAppointment, medicalRecords);
    const careTips = buildCareTips(pets, ownerVaccinations, medicalRecords);

    return {
      profile,
      pets,
      selectedPet,
      nextAppointment,
      reminders,
      activities: buildActivities(pets, nextAppointment, reminders, ownerVaccinations, medicalRecords),
      healthMetrics,
      weeklyStats,
      weeklyOverall,
      membership,
      nearbyClinics,
      offers,
      achievements,
      communityPosts,
      recommendedServices,
      careTips,
      latestPrediction,
      locationStatus,
    };
  }
}
export const homeDashboardService = new HomeDashboardService();
















