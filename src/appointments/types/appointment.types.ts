export enum AppointmentType {
  GENERAL_CHECKUP = 'GENERAL_CHECKUP',
  VACCINATION = 'VACCINATION',
  EMERGENCY = 'EMERGENCY',
  SURGERY = 'SURGERY',
  DENTAL = 'DENTAL',
  GROOMING = 'GROOMING',
  NUTRITION = 'NUTRITION',
  BEHAVIOUR = 'BEHAVIOUR',
  HOME_VISIT = 'HOME_VISIT',
  VIDEO_CONSULTATION = 'VIDEO_CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  LAB_TEST = 'LAB_TEST',
  AI_HEALTH = 'AI_HEALTH',
}

export enum AppointmentStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  CONFIRMED = 'CONFIRMED',
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  REJECTED = 'REJECTED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  NOT_REQUIRED = 'NOT_REQUIRED',
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
}

export interface AppointmentTypeInfo {
  label: string;
  icon: string;
  color: string;
}

export const APPOINTMENT_TYPE_INFO: Record<AppointmentType, AppointmentTypeInfo> = {
  [AppointmentType.GENERAL_CHECKUP]: { label: 'General Health Check-up', icon: '🏥', color: '#4CAF50' },
  [AppointmentType.VACCINATION]: { label: 'Vaccination', icon: '💉', color: '#2196F3' },
  [AppointmentType.EMERGENCY]: { label: 'Emergency Consultation', icon: '🚨', color: '#EF4444' },
  [AppointmentType.SURGERY]: { label: 'Surgery Consultation', icon: '⚕️', color: '#9C27B0' },
  [AppointmentType.DENTAL]: { label: 'Dental Care', icon: '🦷', color: '#00BCD4' },
  [AppointmentType.GROOMING]: { label: 'Grooming', icon: '✂️', color: '#FF9800' },
  [AppointmentType.NUTRITION]: { label: 'Nutrition Consultation', icon: '🥗', color: '#8BC34A' },
  [AppointmentType.BEHAVIOUR]: { label: 'Behaviour Consultation', icon: '🧠', color: '#673AB7' },
  [AppointmentType.HOME_VISIT]: { label: 'Home Visit', icon: '🏠', color: '#795548' },
  [AppointmentType.VIDEO_CONSULTATION]: { label: 'Video Consultation', icon: '📹', color: '#3F51B5' },
  [AppointmentType.FOLLOW_UP]: { label: 'Follow-up Visit', icon: '🔄', color: '#009688' },
  [AppointmentType.LAB_TEST]: { label: 'Laboratory Test', icon: '🔬', color: '#607D8B' },
  [AppointmentType.AI_HEALTH]: { label: 'AI Health Consultation', icon: '🤖', color: '#6C63FF' },
};

export const APPOINTMENT_STATUS_INFO: Record<AppointmentStatus, { label: string; color: string; bgColor: string }> = {
  [AppointmentStatus.PENDING_APPROVAL]: { label: 'Pending Approval', color: '#FF8F00', bgColor: '#FFF3E0' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmed', color: '#0277BD', bgColor: '#E1F5FE' },
  [AppointmentStatus.UPCOMING]: { label: 'Upcoming', color: '#2E7D32', bgColor: '#E8F5E9' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'In Progress', color: '#7C3AED', bgColor: '#F3E8FF' },
  [AppointmentStatus.COMPLETED]: { label: 'Completed', color: '#16A34A', bgColor: '#DCFCE7' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelled', color: '#D32F2F', bgColor: '#FEE2E2' },
  [AppointmentStatus.RESCHEDULED]: { label: 'Rescheduled', color: '#FF6F00', bgColor: '#FFF8E1' },
  [AppointmentStatus.REJECTED]: { label: 'Rejected', color: '#D32F2F', bgColor: '#FEE2E2' },
};

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  doctorId: string;
  doctorName: string;
  doctorPhoto?: string;
  hospitalId: string;
  hospitalName: string;
  petId: string;
  petName: string;
  petPhoto?: string;
  type: AppointmentType;
  date: string; // ISO date string
  timeSlot: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  symptoms: string;
  medicalReports: string[];
  prescription?: string;
  diagnosis?: string;
  aiHealthScore?: number;
  fee?: number;
  createdAt: string;
  completedAt?: string;
  cancellationReason?: string;
  rating?: number;
  review?: string;
}

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: string;
  healthScore: number;
  photo?: string;
}

export interface Doctor {
  id: string;
  name: string;
  photo?: string;
  specialization: string;
  hospitalId: string;
  hospitalName: string;
  rating: number;
  experience: number;
  qualification: string;
  consultationFee: number;
  isAvailable: boolean;
  availableDays: string[];
  availableSlots: string[];
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  rating: number;
  photo?: string;
  services: string[];
  is24x7: boolean;
  distance: number;
}

export interface BookingFormData {
  type?: AppointmentType;
  petId?: string;
  hospitalId?: string;
  doctorId?: string;
  date?: string;
  timeSlot?: string;
  symptoms?: string;
}
