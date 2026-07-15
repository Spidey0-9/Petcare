export const STORAGE_BUCKETS = {
  profileImages: 'profile-images',
  petImages: 'pet-images',
  doctorImages: 'doctor-images',
  medicalReports: 'medical-reports',
  communityPosts: 'community-posts',
  productImages: 'product-images',
  groomingImages: 'grooming-images',
} as const;

export const TABLES = {
  profiles: 'profiles',
  doctors: 'doctors',
  pets: 'pets',
  appointments: 'appointments',
  medicalRecords: 'medical_records',
  vaccinations: 'vaccinations',
  reminders: 'reminders',
  posts: 'posts',
  communityPosts: 'community_posts',
  comments: 'comments',
  likes: 'likes',
  notifications: 'notifications',
  clinics: 'clinics',
  products: 'products',
  categories: 'categories',
  wishlist: 'wishlist',
  cart: 'cart',
  orders: 'orders',
  payments: 'payments',
  invoices: 'invoices',
  reviews: 'reviews',
  favorites: 'favorites',
  savedClinics: 'saved_clinics',
  petHealthLogs: 'pet_health_logs',
  aiPredictions: 'ai_predictions',
  memberships: 'memberships',
  offlineSyncQueue: 'offline_sync_queue',
  messages: 'messages',
  groomingClinics: 'grooming_clinics',
  groomers: 'groomers',
  groomingServices: 'grooming_services',
  groomingBookings: 'grooming_bookings',
  userSecuritySettings: 'user_security_settings',
  authDevices: 'auth_devices',
  authLoginHistory: 'auth_login_history',
  auditLogs: 'audit_logs',
} as const;

export const DEFAULT_PAGE_SIZE = 20;



