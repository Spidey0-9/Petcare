export type UserRole = 'pet_owner' | 'doctor' | 'admin' | 'super_admin';

export type Id = string;

export type ProfileRecord = {
  id: Id;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  address?: string | null;
  city?: string | null;
  emergency_contact?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DoctorRecord = {
  id?: Id;
  profile_id: Id;
  specialization?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  is_available?: boolean;
  availability?: unknown;
  license_number?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  languages?: string[] | null;
  bio?: string | null;
  certificate_urls?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export type PetRecord = {
  id: Id;
  owner_id: Id;
  name: string;
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  weight?: number | null;
  image_url?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed';

export type AppointmentRecord = {
  id: Id;
  owner_id: Id;
  doctor_id: Id;
  pet_id: Id;
  clinic_id?: Id | null;
  scheduled_at: string;
  status: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
  report_urls?: string[] | null;
  diagnosis?: string | null;
  prescription?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ReminderRecord = {
  id: Id;
  user_id: Id;
  pet_id?: Id | null;
  title: string;
  type: 'medicine' | 'vaccination' | 'feeding' | 'exercise' | 'water' | 'appointment' | 'grooming';
  scheduled_at: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  is_active?: boolean;
  notification_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MedicalRecord = {
  id: Id;
  owner_id: Id;
  pet_id: Id;
  doctor_id?: Id | null;
  appointment_id?: Id | null;
  type: 'prescription' | 'lab_report' | 'blood_report' | 'xray' | 'image' | 'pdf' | 'other';
  title: string;
  file_url?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type CommunityPost = {
  id: Id;
  user_id: Id;
  content: string;
  media_urls?: string[] | null;
  media_type?: 'image' | 'video' | 'mixed' | null;
  like_count?: number;
  comment_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type NotificationRecord = {
  id: Id;
  user_id: Id;
  title: string;
  body?: string | null;
  type: string;
  is_read?: boolean;
  data?: unknown;
  created_at?: string;
};

export type ClinicRecord = {
  id: Id;
  name: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  is_24x7?: boolean;
};

export type ProductRecord = {
  id: Id;
  name: string;
  category_id?: Id | null;
  price: number;
  stock?: number;
  image_url?: string | null;
  rating?: number | null;
  created_at?: string;
};

export type MessageRecord = {
  id: Id;
  conversation_id: Id;
  sender_id: Id;
  receiver_id: Id;
  body?: string | null;
  file_url?: string | null;
  is_read?: boolean;
  created_at?: string;
};

export type PaginatedQuery = {
  page?: number;
  pageSize?: number;
};

