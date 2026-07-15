import type { NavigatorScreenParams } from '@react-navigation/native';
import type { UserRole } from '../types';
import type { AppointmentStackParamList } from '../appointments';

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Permissions: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  RoleSelection: { role?: UserRole } | undefined;
  PhoneVerification: { phone: string; email: string; role: UserRole };
  EmailVerification: { email: string; role: UserRole };
  CompleteProfile: { role?: UserRole } | undefined;
  Tutorial: { role: UserRole };
  Terms: undefined;
  Privacy: undefined;
  MainTabs: undefined;
  DoctorDashboard: undefined;
  GroomerDashboard: undefined;
  SuperAdminDashboard: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Appointments: NavigatorScreenParams<AppointmentStackParamList> | undefined;
  Health: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Pets: undefined;
  Vaccination: undefined;
  Pharmacy: undefined;
  Reminders: undefined;
  Nutrition: undefined;
  Grooming: undefined;
  Community: undefined;
  Gps: undefined;
  Adoption: undefined;
  Emergency: undefined;
  Billing: undefined;
  Notifications: undefined;
  Reports: undefined;
  Admin: undefined;
  SymptomChecker: undefined;
  AiAssistant: undefined;
  FoodSafety: undefined;
  HealthReport: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  PremiumMembership: undefined;
  OrderHistory: undefined;
  PaymentMethods: undefined;
  ProfileSettings: undefined;
  HelpSupport: undefined;
};




