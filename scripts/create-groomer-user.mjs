import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const GROOMER_EMAIL = process.env.GROOMER_USER_EMAIL ?? 'groomer@petcare.com';
const GROOMER_PASSWORD = process.env.GROOMER_USER_PASSWORD ?? 'Groomer@123';
const GROOMER_NAME = process.env.GROOMER_USER_NAME ?? 'Priya Grooming Specialist';
const GROOMER_PHONE = process.env.GROOMER_USER_PHONE ?? '9000000002';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function findUserByEmail(supabaseAdmin, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find(item => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function upsertByLookup({ supabaseAdmin, table, lookup, payload }) {
  const query = supabaseAdmin.from(table).select('id').limit(1);
  for (const [column, value] of Object.entries(lookup)) {
    query.eq(column, value);
  }

  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

loadEnvFile(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL in .env.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your local .env or pass it in the terminal.');
  console.error('Never commit or expose the service-role key in the Expo app.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let user = await findUserByEmail(supabaseAdmin, GROOMER_EMAIL);
let createdAccount = false;

if (!user) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: GROOMER_EMAIL,
    password: GROOMER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: GROOMER_NAME,
      phone: GROOMER_PHONE,
      role: 'groomer',
    },
    app_metadata: {
      role: 'groomer',
    },
  });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  user = data.user;
  createdAccount = true;
} else {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: GROOMER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      full_name: user.user_metadata?.full_name ?? GROOMER_NAME,
      phone: user.user_metadata?.phone ?? GROOMER_PHONE,
      role: 'groomer',
    },
    app_metadata: {
      ...user.app_metadata,
      role: 'groomer',
    },
  });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  user = data.user;
}

const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
  id: user.id,
  email: GROOMER_EMAIL,
  full_name: user.user_metadata?.full_name ?? GROOMER_NAME,
  phone: user.user_metadata?.phone ?? GROOMER_PHONE,
  role: 'groomer',
}, { onConflict: 'id' });

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

const clinic = await upsertByLookup({
  supabaseAdmin,
  table: 'grooming_clinics',
  lookup: { owner_profile_id: user.id, name: 'PetCare+ Grooming Studio' },
  payload: {
    owner_profile_id: user.id,
    name: 'PetCare+ Grooming Studio',
    phone: GROOMER_PHONE,
    email: GROOMER_EMAIL,
    address: 'Road No. 12, Banjara Hills, Hyderabad',
    area: 'Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    latitude: 17.4148,
    longitude: 78.4347,
    description: 'Approved demo grooming clinic for PetCare+ production testing.',
    approval_status: 'approved',
    is_active: true,
    average_rating: 4.8,
    review_count: 86,
    opening_time: '09:00',
    closing_time: '20:00',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    pickup_available: true,
    dropoff_available: true,
    emergency_grooming: true,
  },
});

const availability = {
  monday: ['09:00', '10:30', '12:00', '16:00', '18:00'],
  tuesday: ['09:00', '10:30', '12:00', '16:00', '18:00'],
  wednesday: ['09:00', '10:30', '12:00', '16:00', '18:00'],
  thursday: ['09:00', '10:30', '12:00', '16:00', '18:00'],
  friday: ['09:00', '10:30', '12:00', '16:00', '18:00'],
  saturday: ['10:00', '11:30', '15:30', '17:00'],
  sunday: ['10:00', '11:30'],
};

const { data: groomer, error: groomerError } = await supabaseAdmin.from('groomers').upsert({
  profile_id: user.id,
  clinic_id: clinic.id,
  full_name: user.user_metadata?.full_name ?? GROOMER_NAME,
  phone: user.user_metadata?.phone ?? GROOMER_PHONE,
  email: GROOMER_EMAIL,
  specializations: ['Full Grooming', 'Breed Styling', 'Spa Bath', 'Nail Care', 'De-shedding'],
  experience_years: 7,
  bio: 'Certified pet groomer specializing in low-stress grooming, coat care, and breed-specific styling.',
  profile_image_url: 'https://xvgddddslgynglledskj.supabase.co/storage/v1/object/public/grooming-images/demo/groomer-default.webp',
  rating: 4.8,
  review_count: 86,
  is_available: true,
  approval_status: 'approved',
  availability,
}, { onConflict: 'profile_id' }).select('*').single();

if (groomerError) {
  console.error(groomerError.message);
  process.exit(1);
}

const services = [
  { name: 'Full Grooming Package', description: 'Bath, blow dry, haircut, nail trim, ear cleaning and finishing spray.', pet_species: 'dog', price: 1299, duration_minutes: 120 },
  { name: 'Spa Bath & Brush', description: 'Gentle shampoo bath, conditioning, blow dry and coat brushing.', pet_species: 'dog', price: 699, duration_minutes: 60 },
  { name: 'Cat Grooming', description: 'Low-stress brushing, nail trim, hygiene clean and coat care.', pet_species: 'cat', price: 999, duration_minutes: 90 },
  { name: 'Nail Trim & Paw Care', description: 'Nail trimming, paw balm and pad cleaning.', pet_species: 'all', price: 299, duration_minutes: 25 },
];

for (const service of services) {
  await upsertByLookup({
    supabaseAdmin,
    table: 'grooming_services',
    lookup: { clinic_id: clinic.id, name: service.name },
    payload: {
      clinic_id: clinic.id,
      groomer_id: groomer.id,
      ...service,
      is_active: true,
    },
  });
}

console.log(createdAccount ? 'Groomer account created.' : 'Groomer account already existed; credentials and role updated.');
console.log(`Email: ${GROOMER_EMAIL}`);
console.log(`Password: ${GROOMER_PASSWORD}`);
console.log(`Profile ID: ${user.id}`);
console.log(`Groomer ID: ${groomer.id}`);
console.log(`Clinic ID: ${clinic.id}`);
