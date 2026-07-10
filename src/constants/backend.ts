export const STORAGE_BUCKETS = {
  profileImages: 'profile-images',
  petImages: 'pet-images',
  doctorImages: 'doctor-images',
  medicalReports: 'medical-reports',
  communityPosts: 'community-posts',
  productImages: 'product-images',
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
} as const;

export const DEFAULT_PAGE_SIZE = 20;

