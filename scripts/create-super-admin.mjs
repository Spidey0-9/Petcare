import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'admin@petcare.com';
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@123';
const ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'PetCare+ Super Admin';

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

let user = await findUserByEmail(supabaseAdmin, ADMIN_EMAIL);
let createdAccount = false;

if (!user) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: ADMIN_NAME,
      role: 'super_admin',
    },
    app_metadata: {
      role: 'super_admin',
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
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      full_name: user.user_metadata?.full_name ?? ADMIN_NAME,
      role: 'super_admin',
    },
    app_metadata: {
      ...user.app_metadata,
      role: 'super_admin',
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
  email: ADMIN_EMAIL,
  full_name: user.user_metadata?.full_name ?? ADMIN_NAME,
  role: 'super_admin',
}, { onConflict: 'id' });

if (profileError) {
  console.error(profileError.message);
  console.error('If this mentions profiles_role_check, run the super_admin role migration first.');
  process.exit(1);
}

console.log(createdAccount ? 'Super admin account created.' : 'Super admin account already existed; credentials and role updated.');
console.log(`Email: ${ADMIN_EMAIL}`);
console.log(`Password: ${ADMIN_PASSWORD}`);