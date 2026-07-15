import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

function loadEnv() {
  const env = {};
  const raw = fs.readFileSync('.env', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEFAULT_PASSWORD = 'Doctor@12345';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MORNING_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const EVENING_SLOTS = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
const ALL_SLOTS = [...MORNING_SLOTS, ...EVENING_SLOTS];

const requestedExamples = {
  'Government Super Speciality Veterinary Hospital': [
    ['Dr. Arjun Reddy', 'General Veterinary Medicine'],
    ['Dr. Priya Sharma', 'Veterinary Surgery'],
    ['Dr. Naveen Kumar', 'Orthopedics'],
    ['Dr. Sneha Rao', 'Dermatology'],
  ],
  'Mr. VET Animal Hospital': [
    ['Dr. Rahul Verma', 'Emergency & Critical Care'],
    ['Dr. Meghana Iyer', 'Internal Medicine'],
    ['Dr. Ajay Reddy', 'Cardiology'],
    ['Dr. Nikhil Rao', 'Veterinary Surgery'],
  ],
  'Dr. Dog Super Speciality Pet Hospital': [
    ['Dr. Vikram Reddy', 'Neurology'],
    ['Dr. Ananya Rao', 'Dentistry'],
    ['Dr. Sai Krishna', 'Emergency & Critical Care'],
    ['Dr. Pooja Mehta', 'Veterinary Surgery'],
  ],
};

const doctorPool = [
  ['Dr. Kavya Menon', 'Small Animal Medicine'],
  ['Dr. Rohit Nair', 'General Veterinary Medicine'],
  ['Dr. Sandeep Reddy', 'Veterinary Surgery'],
  ['Dr. Aishwarya Rao', 'Dermatology'],
  ['Dr. Kiran Kumar', 'Dentistry'],
  ['Dr. Meera Iyer', 'Ophthalmology'],
  ['Dr. Varun Sharma', 'Emergency & Critical Care'],
  ['Dr. Neha Kapoor', 'Internal Medicine'],
  ['Dr. Aditya Verma', 'Cardiology'],
  ['Dr. Rhea Thomas', 'Exotic Animal Medicine'],
  ['Dr. Harsha Vardhan', 'Orthopedics'],
  ['Dr. Divya Nair', 'Neurology'],
  ['Dr. Manish Rao', 'Veterinary Surgery'],
  ['Dr. Swathi Krishna', 'Small Animal Medicine'],
  ['Dr. Pranav Gupta', 'General Veterinary Medicine'],
  ['Dr. Keerthi Reddy', 'Dermatology'],
  ['Dr. Siddharth Jain', 'Dentistry'],
  ['Dr. Lavanya Sharma', 'Ophthalmology'],
  ['Dr. Tarun Mehta', 'Emergency & Critical Care'],
  ['Dr. Nisha Iyer', 'Internal Medicine'],
  ['Dr. Abhinav Reddy', 'Cardiology'],
  ['Dr. Charu Menon', 'Exotic Animal Medicine'],
  ['Dr. Rakesh Kumar', 'Orthopedics'],
  ['Dr. Samaira Rao', 'Neurology'],
  ['Dr. Vivek Varma', 'Veterinary Surgery'],
  ['Dr. Tanvi Kapoor', 'Small Animal Medicine'],
  ['Dr. Aravind Nair', 'General Veterinary Medicine'],
  ['Dr. Ishita Sharma', 'Dermatology'],
  ['Dr. Dev Patel', 'Dentistry'],
  ['Dr. Mounika Reddy', 'Ophthalmology'],
  ['Dr. Rohan Iyer', 'Emergency & Critical Care'],
  ['Dr. Sanjana Rao', 'Internal Medicine'],
  ['Dr. Gautam Krishna', 'Cardiology'],
  ['Dr. Pallavi Menon', 'Exotic Animal Medicine'],
  ['Dr. Prakash Reddy', 'Orthopedics'],
  ['Dr. Esha Verma', 'Neurology'],
  ['Dr. Ritu Sharma', 'Veterinary Surgery'],
  ['Dr. Akhil Rao', 'Small Animal Medicine'],
  ['Dr. Shruthi Nair', 'General Veterinary Medicine'],
  ['Dr. Mohan Kumar', 'Dermatology'],
  ['Dr. Gayathri Iyer', 'Dentistry'],
  ['Dr. Yash Mehta', 'Ophthalmology'],
  ['Dr. Ramesh Naidu', 'Emergency & Critical Care'],
  ['Dr. Leela Thomas', 'Internal Medicine'],
  ['Dr. Saurabh Jain', 'Cardiology'],
  ['Dr. Prisha Rao', 'Exotic Animal Medicine'],
  ['Dr. Mahesh Reddy', 'Orthopedics'],
  ['Dr. Kalyani Sharma', 'Neurology'],
  ['Dr. Armaan Kapoor', 'Veterinary Surgery'],
  ['Dr. Siya Menon', 'Small Animal Medicine'],
  ['Dr. Hrithik Varma', 'General Veterinary Medicine'],
  ['Dr. Pavan Kumar', 'Dermatology'],
  ['Dr. Reena Iyer', 'Dentistry'],
  ['Dr. Omkar Rao', 'Ophthalmology'],
  ['Dr. Bhavana Reddy', 'Emergency & Critical Care'],
  ['Dr. Nitin Sharma', 'Internal Medicine'],
  ['Dr. Amrita Nair', 'Cardiology'],
  ['Dr. Krish Mehta', 'Exotic Animal Medicine'],
  ['Dr. Tejas Kumar', 'Orthopedics'],
  ['Dr. Malini Rao', 'Neurology'],
  ['Dr. Shreya Reddy', 'Veterinary Surgery'],
  ['Dr. Chetan Iyer', 'Small Animal Medicine'],
  ['Dr. Payal Verma', 'General Veterinary Medicine'],
  ['Dr. Kartik Menon', 'Dermatology'],
  ['Dr. Anika Sharma', 'Dentistry'],
  ['Dr. Sumanth Rao', 'Ophthalmology'],
  ['Dr. Hema Kapoor', 'Emergency & Critical Care'],
  ['Dr. Deepak Nair', 'Internal Medicine'],
  ['Dr. Ishaan Reddy', 'Cardiology'],
  ['Dr. Amulya Krishna', 'Exotic Animal Medicine'],
  ['Dr. Nandini Rao', 'Orthopedics'],
  ['Dr. Kabir Sharma', 'Neurology'],
  ['Dr. Madhuri Iyer', 'Veterinary Surgery'],
  ['Dr. Lokesh Kumar', 'Small Animal Medicine'],
  ['Dr. Trisha Verma', 'General Veterinary Medicine'],
  ['Dr. Raghav Menon', 'Dermatology'],
  ['Dr. Aparna Reddy', 'Dentistry'],
  ['Dr. Suresh Rao', 'Ophthalmology'],
  ['Dr. Riya Jain', 'Emergency & Critical Care'],
  ['Dr. Vinay Sharma', 'Internal Medicine'],
  ['Dr. Karthika Nair', 'Cardiology'],
  ['Dr. Arjun Menon', 'Exotic Animal Medicine'],
  ['Dr. Snehal Reddy', 'Orthopedics'],
  ['Dr. Nikhita Rao', 'Neurology'],
];

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function phoneFor(index) {
  return String(9000000000 + index).slice(0, 10);
}

function ratingFor(index) {
  return Number((4.2 + ((index * 7) % 9) / 10).toFixed(1));
}

function feeFor(clinic, index) {
  const base = Number(clinic.consultation_fee ?? 500) || 500;
  const fee = Math.min(1000, Math.max(300, base + ((index % 4) - 1) * 50));
  return fee;
}

function doctorsForClinic(clinic, offset) {
  const exact = requestedExamples[clinic.hospital_name ?? clinic.name];
  if (exact) return exact;
  return doctorPool.slice(offset, offset + 4);
}

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find(item => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function ensureAuthUser({ email, password, fullName, phone }) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return { user: existing, created: false };

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone_confirm: false,
    user_metadata: {
      full_name: fullName,
      phone,
      role: 'doctor',
    },
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`Auth user creation returned no user for ${email}`);
  return { user: data.user, created: true };
}

async function main() {
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('*')
    .eq('city', 'Hyderabad')
    .neq('is_active', false)
    .order('hospital_name', { ascending: true });
  if (clinicsError) throw clinicsError;
  if (!clinics?.length) throw new Error('No active Hyderabad clinics found. Run Sprint 12A hospital seed first.');

  console.log(`[SeedDoctors] Active Hyderabad hospitals: ${clinics.length}`);

  let doctorIndex = 1;
  let createdAuthUsers = 0;
  let insertedDoctors = 0;
  let updatedDoctors = 0;
  const report = [];

  for (const [clinicIndex, clinic] of clinics.entries()) {
    const clinicName = clinic.hospital_name ?? clinic.name;
    const selectedDoctors = doctorsForClinic(clinic, clinicIndex * 4);
    let availableCount = 0;

    for (const [slotIndex, [fullName, specialization]] of selectedDoctors.entries()) {
      const uniqueSlug = `${slug(fullName)}-${slug(clinicName).slice(0, 24)}`;
      const email = `dr.${uniqueSlug}@petcare.example`;
      const phone = phoneFor(doctorIndex);
      const image = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0EA5E9&color=fff&size=256&bold=true`;
      const experience = 2 + ((doctorIndex * 3) % 19);
      const rating = ratingFor(doctorIndex);
      const reviewCount = 35 + ((doctorIndex * 17) % 420);
      const consultationFee = feeFor(clinic, doctorIndex);
      const licenseNumber = `TSVC-${String(20260000 + doctorIndex).padStart(8, '0')}`;
      const languages = slotIndex % 2 === 0 ? ['English', 'Telugu', 'Hindi'] : ['English', 'Hindi'];
      const qualification = specialization.includes('Surgery') || specialization.includes('Neurology')
        ? 'BVSc & AH, MVSc'
        : 'BVSc & AH';
      const bio = `${fullName} is a ${specialization.toLowerCase()} veterinarian at ${clinicName}, ${clinic.area ?? 'Hyderabad'}, with ${experience} years of clinical experience.`;
      const availability = {
        timezone: 'Asia/Kolkata',
        days: DAYS,
        morning: MORNING_SLOTS,
        evening: EVENING_SLOTS,
        slots: ALL_SLOTS,
      };

      const { user, created } = await ensureAuthUser({ email, password: DEFAULT_PASSWORD, fullName, phone });
      if (created) createdAuthUsers += 1;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        email,
        phone,
        role: 'doctor',
        avatar_url: image,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profileError) throw profileError;

      const doctorPayload = {
        profile_id: user.id,
        specialization,
        qualification,
        experience,
        experience_years: experience,
        consultation_fee: consultationFee,
        clinic_name: clinicName,
        clinic_address: clinic.address,
        phone,
        email,
        profile_image: image,
        bio,
        languages,
        certificate_urls: [],
        license_number: licenseNumber,
        is_available: true,
        rating,
        total_reviews: reviewCount,
        review_count: reviewCount,
        availability,
        clinic_id: clinic.id,
        updated_at: new Date().toISOString(),
      };

      const { data: existingRows, error: findDoctorError } = await supabase
        .from('doctors')
        .select('id, profile_id, clinic_id')
        .eq('profile_id', user.id);
      if (findDoctorError) throw findDoctorError;

      if (existingRows?.length) {
        const { error: updateError } = await supabase
          .from('doctors')
          .update(doctorPayload)
          .eq('id', existingRows[0].id);
        if (updateError) throw updateError;
        updatedDoctors += 1;
      } else {
        const { error: insertError } = await supabase
          .from('doctors')
          .insert({ ...doctorPayload, created_at: new Date().toISOString() });
        if (insertError) throw insertError;
        insertedDoctors += 1;
      }

      availableCount += 1;
      doctorIndex += 1;
    }

    const { error: clinicUpdateError } = await supabase
      .from('clinics')
      .update({ total_doctors: availableCount, available_doctors: availableCount, updated_at: new Date().toISOString() })
      .eq('id', clinic.id);
    if (clinicUpdateError) throw clinicUpdateError;

    report.push({ clinic: clinicName, area: clinic.area, doctors: availableCount });
  }

  const { data: perClinic, error: verifyError } = await supabase
    .from('clinics')
    .select('id,hospital_name,area,doctors(id,profile_id,is_available,profiles(id,role,email,full_name))')
    .eq('city', 'Hyderabad')
    .neq('is_active', false)
    .order('hospital_name', { ascending: true });
  if (verifyError) throw verifyError;

  const failures = [];
  for (const clinic of perClinic ?? []) {
    const assigned = clinic.doctors ?? [];
    const available = assigned.filter(doctor => doctor.is_available === true);
    const badProfiles = assigned.filter(doctor => doctor.profiles?.role !== 'doctor');
    if (available.length < 3 || available.length > 4 || badProfiles.length > 0) {
      failures.push({ clinic: clinic.hospital_name, assigned: assigned.length, available: available.length, badProfiles: badProfiles.length });
    }
  }

  console.log('[SeedDoctors] Auth users created:', createdAuthUsers);
  console.log('[SeedDoctors] Doctors inserted:', insertedDoctors);
  console.log('[SeedDoctors] Doctors updated:', updatedDoctors);
  console.log('[SeedDoctors] Per hospital:', JSON.stringify(report, null, 2));
  console.log('[SeedDoctors] Verification failures:', JSON.stringify(failures, null, 2));
  console.log('[SeedDoctors] Default doctor password:', DEFAULT_PASSWORD);

  if (failures.length) {
    throw new Error('Doctor seed verification failed. See failures above.');
  }
}

main().catch(error => {
  console.error('[SeedDoctors] FAILED', error);
  process.exit(1);
});



