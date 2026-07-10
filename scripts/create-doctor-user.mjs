import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const DOCTOR_EMAIL = process.env.DOCTOR_USER_EMAIL ?? 'doctor@petcare.com';
const DOCTOR_PASSWORD = process.env.DOCTOR_USER_PASSWORD ?? 'Doctor@123';
const DOCTOR_NAME = process.env.DOCTOR_USER_NAME ?? 'Dr. PetCare Demo';

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

let user = await findUserByEmail(supabaseAdmin, DOCTOR_EMAIL);
let createdAccount = false;

if (!user) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: DOCTOR_EMAIL,
    password: DOCTOR_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: DOCTOR_NAME,
      role: 'doctor',
    },
    app_metadata: {
      role: 'doctor',
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
    password: DOCTOR_PASSWORD,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      full_name: user.user_metadata?.full_name ?? DOCTOR_NAME,
      role: 'doctor',
    },
    app_metadata: {
      ...user.app_metadata,
      role: 'doctor',
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
  email: DOCTOR_EMAIL,
  full_name: user.user_metadata?.full_name ?? DOCTOR_NAME,
  role: 'doctor',
}, { onConflict: 'id' });

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

const { error: doctorError } = await supabaseAdmin.from('doctors').upsert({
  profile_id: user.id,
}, { onConflict: 'profile_id' });

if (doctorError) {
  console.error(doctorError.message);
  console.error('Make sure the base migration has created public.doctors before running this seed.');
  process.exit(1);
}

const optionalDoctorFields = {
  specialization: 'General Veterinary Care',
  qualification: 'BVSc & AH',
  experience_years: 8,
  consultation_fee: 499,
  is_available: true,
  availability: {
    monday: ['09:00', '12:00', '15:00', '18:00'],
    tuesday: ['09:00', '12:00', '15:00', '18:00'],
    wednesday: ['09:00', '12:00', '15:00', '18:00'],
    thursday: ['09:00', '12:00', '15:00', '18:00'],
    friday: ['09:00', '12:00', '15:00', '18:00'],
    saturday: ['10:00', '13:00'],
  },
  rating: 4.8,
  review_count: 24,
};

for (const [column, value] of Object.entries(optionalDoctorFields)) {
  const { error } = await supabaseAdmin
    .from('doctors')
    .update({ [column]: value })
    .eq('profile_id', user.id);

  if (error) {
    const message = error.message.toLowerCase();
    const missingColumn = message.includes(`'${column}' column`) || message.includes(`column "${column}"`) || message.includes('schema cache');
    if (!missingColumn) {
      console.warn(`Could not update doctors.${column}: ${error.message}`);
    }
  }
}

console.log(createdAccount ? 'Doctor account created.' : 'Doctor account already existed; credentials and role updated.');
console.log(`Email: ${DOCTOR_EMAIL}`);
console.log(`Password: ${DOCTOR_PASSWORD}`);