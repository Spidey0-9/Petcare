import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@petcare.local';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'Petcare@123';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
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
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your local .env temporarily or pass it in the terminal.');
  console.error('Never commit or expose the service-role key in the Expo app.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
  email: DEMO_EMAIL,
  password: DEMO_PASSWORD,
  email_confirm: true,
  user_metadata: {
    full_name: 'PetCare+ Demo User',
    role: 'pet_owner',
  },
});

let user = created?.user ?? null;

if (createError) {
  const alreadyExists = createError.message.toLowerCase().includes('already') || createError.status === 422;
  if (!alreadyExists) {
    console.error(createError.message);
    process.exit(1);
  }

  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    console.error(listError.message);
    process.exit(1);
  }

  user = users.users.find(item => item.email?.toLowerCase() === DEMO_EMAIL.toLowerCase()) ?? null;
  if (!user) {
    console.error('Demo user exists, but could not be found with admin.listUsers.');
    process.exit(1);
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: 'PetCare+ Demo User',
      role: 'pet_owner',
    },
  });

  if (updateError) {
    console.error(updateError.message);
    process.exit(1);
  }
}

const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
  id: user.id,
  email: DEMO_EMAIL,
  full_name: 'PetCare+ Demo User',
  role: 'pet_owner',
});

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

console.log(`Demo user ready: ${DEMO_EMAIL}`);
console.log(`Password: ${DEMO_PASSWORD}`);
