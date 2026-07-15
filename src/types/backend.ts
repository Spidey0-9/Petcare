export type UserRole = 'pet_owner' | 'doctor' | 'groomer' | 'admin' | 'super_admin';

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
  appointment_type?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  scheduled_at: string;
  status: AppointmentStatus;
  consultation_mode?: string | null;
  type?: string | null;
  reason?: string | null;
  symptoms?: string | null;
  notes?: string | null;
  report_urls?: string[] | null;
  diagnosis?: string | null;
  prescription?: string | null;
  video_url?: string | null;
  fee?: number | null;
  payment_status?: string | null;
  payment_id?: Id | null;
  invoice_id?: Id | null;
  meeting_url?: string | null;
  meeting_id?: string | null;
  meeting_provider?: string | null;
  meeting_password?: string | null;
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
  reference_table?: string | null;
  reference_id?: Id | null;
  action?: string | null;
  actor_id?: Id | null;
  organization_id?: Id | null;
  created_at?: string;
};

export type ClinicRecord = {
  id: Id;
  name: string;
  hospital_name?: string | null;
  category?: string | null;
  logo_url?: string | null;
  cover_image?: string | null;
  gallery_images?: string[] | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  average_rating?: number | null;
  review_count?: number | null;
  is_24x7?: boolean;
  open_24_hours?: boolean | null;
  emergency_available?: boolean | null;
  opening_time?: string | null;
  closing_time?: string | null;
  departments?: string[] | null;
  facilities?: string[] | null;
  consultation_fee?: number | null;
  total_doctors?: number | null;
  available_doctors?: number | null;
  total_beds?: number | null;
  parking_available?: boolean | null;
  wheelchair_accessible?: boolean | null;
  ambulance_service?: boolean | null;
  pharmacy_available?: boolean | null;
  laboratory_available?: boolean | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
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


export type GroomingApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type GroomingBookingStatus = 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'rescheduled';

export type GroomingClinicRecord = {
  id: Id;
  owner_profile_id?: Id | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  cover_image?: string | null;
  gallery_images?: string[] | null;
  description?: string | null;
  approval_status?: GroomingApprovalStatus;
  is_active?: boolean;
  average_rating?: number;
  review_count?: number;
  opening_time?: string | null;
  closing_time?: string | null;
  working_days?: string[] | null;
  pickup_available?: boolean;
  dropoff_available?: boolean;
  emergency_grooming?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type GroomerRecord = {
  id: Id;
  profile_id: Id;
  clinic_id?: Id | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  specializations?: string[] | null;
  experience_years?: number;
  bio?: string | null;
  profile_image_url?: string | null;
  rating?: number;
  review_count?: number;
  is_available?: boolean;
  approval_status?: GroomingApprovalStatus;
  availability?: Record<string, string[]> | null;
  created_at?: string;
  updated_at?: string;
};

export type GroomingServiceRecord = {
  id: Id;
  clinic_id: Id;
  groomer_id?: Id | null;
  name: string;
  description?: string | null;
  pet_species?: string | null;
  price: number;
  duration_minutes?: number;
  image_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type GroomingBookingRecord = {
  id: Id;
  owner_id: Id;
  pet_id: Id;
  groomer_id?: Id | null;
  clinic_id: Id;
  service_id: Id;
  scheduled_at: string;
  service_date: string;
  service_time: string;
  status: GroomingBookingStatus;
  pickup_required?: boolean;
  dropoff_required?: boolean;
  service_address?: string | null;
  symptoms?: string | null;
  medical_notes?: string | null;
  ai_safety_notes?: string | null;
  price?: number;
  payment_status?: string;
  payment_id?: Id | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
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

