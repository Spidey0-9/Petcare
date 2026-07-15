-- Sprint 12A - Hyderabad Veterinary Hospital Seed & Live Integration.
-- Uses the existing public.clinics table as the hospital source of truth.
-- Safe to run repeatedly: adds nullable/defaulted columns only and upserts by hospital name + area.

alter table if exists public.clinics add column if not exists hospital_name text;
alter table if exists public.clinics add column if not exists category text;
alter table if exists public.clinics add column if not exists logo_url text;
alter table if exists public.clinics add column if not exists cover_image text;
alter table if exists public.clinics add column if not exists gallery_images text[] default '{}'::text[];
alter table if exists public.clinics add column if not exists area text;
alter table if exists public.clinics add column if not exists city text;
alter table if exists public.clinics add column if not exists state text;
alter table if exists public.clinics add column if not exists pincode text;
alter table if exists public.clinics add column if not exists email text;
alter table if exists public.clinics add column if not exists website text;
alter table if exists public.clinics add column if not exists description text;
alter table if exists public.clinics add column if not exists emergency_available boolean default false;
alter table if exists public.clinics add column if not exists open_24_hours boolean default false;
alter table if exists public.clinics add column if not exists opening_time text;
alter table if exists public.clinics add column if not exists closing_time text;
alter table if exists public.clinics add column if not exists departments text[] default '{}'::text[];
alter table if exists public.clinics add column if not exists facilities text[] default '{}'::text[];
alter table if exists public.clinics add column if not exists consultation_fee numeric(10,2) default 0;
alter table if exists public.clinics add column if not exists average_rating numeric(3,2) default 0;
alter table if exists public.clinics add column if not exists review_count integer default 0;
alter table if exists public.clinics add column if not exists total_doctors integer default 0;
alter table if exists public.clinics add column if not exists available_doctors integer default 0;
alter table if exists public.clinics add column if not exists total_beds integer default 0;
alter table if exists public.clinics add column if not exists parking_available boolean default false;
alter table if exists public.clinics add column if not exists wheelchair_accessible boolean default false;
alter table if exists public.clinics add column if not exists ambulance_service boolean default false;
alter table if exists public.clinics add column if not exists pharmacy_available boolean default false;
alter table if exists public.clinics add column if not exists laboratory_available boolean default false;
alter table if exists public.clinics add column if not exists is_active boolean default true;

alter table if exists public.doctors add column if not exists clinic_id uuid references public.clinics(id) on delete set null;
create index if not exists doctors_clinic_id_idx on public.doctors(clinic_id);
create index if not exists clinics_city_area_idx on public.clinics(city, area);
create index if not exists clinics_rating_idx on public.clinics(average_rating desc);
create index if not exists clinics_active_idx on public.clinics(is_active);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hospital-images', 'hospital-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

with seed (
  hospital_name, category, area, address, pincode, latitude, longitude, phone,
  emergency_available, open_24_hours, opening_time, closing_time, consultation_fee,
  rating, review_count, total_doctors, available_doctors, departments, facilities,
  total_beds, description
) as (
  values
  ('Government Super Speciality Veterinary Hospital', 'Government', 'Narayanguda', 'Vittalwadi Lane, beside 33KV Electric Substation, Hari Vihar Colony, Bhawani Nagar, Narayanguda, Hyderabad, Telangana 500029', '500029', 17.3975, 78.4898, '+914023234567', true, true, '00:00', '23:59', 250, 4.5, 310, 18, 8, array['Multi-speciality','Diagnostics','Surgery','General Medicine'], array['Affordable','Diagnostics','Multi-speciality','Surgery','Emergency'], 40, 'Affordable government super speciality veterinary hospital with diagnostics and surgery support.'),
  ('Veterinary Clinical Complex', 'Government', 'Rajendranagar', 'PVNR Telangana Veterinary University Campus, Rajendranagar, Hyderabad 500030', '500030', 17.3206, 78.4021, '+914024010101', true, false, '09:00', '18:00', 300, 4.6, 265, 22, 10, array['Critical Care','Cardiology','Wildlife Emergency','Transfusion'], array['Animal Blood Transfusion Unit','Cardiology','Wildlife Emergency','Critical Care'], 36, 'University clinical complex with advanced veterinary departments and critical care.'),
  ('Government Veterinary Hospital', 'Government', 'Masab Tank', 'Vijay Nagar Colony Road, Shanthi Nagar, Masab Tank, Hyderabad 500028', '500028', 17.4037, 78.4536, '+914023354321', true, false, '09:00', '20:00', 200, 4.2, 180, 10, 5, array['General Medicine','Vaccination','Diagnostics'], array['Affordable','Diagnostics','Vaccinations'], 18, 'Government veterinary hospital serving Masab Tank and nearby areas.'),
  ('Government Veterinary Hospital', 'Government', 'Langar House', 'Near Kosaraju Hospital, Prashanth Nagar, Langar House, Hyderabad 500008', '500008', 17.3821, 78.4217, '+914023356789', true, false, '09:00', '20:00', 200, 4.1, 152, 8, 4, array['General Medicine','Vaccination','Emergency'], array['Affordable','Emergency','Vaccinations'], 14, 'Government veterinary care for Langar House and surrounding neighborhoods.'),
  ('Mr. VET Animal Hospital', 'Private Emergency', 'Gachibowli', '4-92 HIG, DLF Road, Jayabheri Enclave, Hyderabad 500032', '500032', 17.4473, 78.3549, '+919876510001', true, true, '00:00', '23:59', 1000, 4.8, 420, 20, 12, array['Emergency','ICU','Laboratory','Surgery'], array['Open 24 Hours','ICU','Emergency','Laboratory','Surgery'], 28, 'Private emergency animal hospital with ICU, lab and surgical services.'),
  ('Dr. Dog Super Speciality Pet Hospital', 'Private Emergency', 'Jubilee Hills', 'Jubilee Hills, Hyderabad 500033', '500033', 17.4239, 78.4128, '+919876510002', true, true, '00:00', '23:59', 950, 4.7, 388, 18, 9, array['Dialysis','ECG','Digital X-Ray','Emergency'], array['24x7','Dialysis','ECG','Digital X-Ray','Ambulance'], 24, 'Super speciality pet hospital with 24x7 emergency and advanced diagnostics.'),
  ('The Jupiter Pet Hospital', 'Private Emergency', 'Madhapur', 'Madhapur, Hyderabad 500081', '500081', 17.4483, 78.3915, '+919876510003', true, false, '08:00', '22:00', 850, 4.6, 240, 14, 7, array['Emergency','Pharmacy','Oxygen Support'], array['Emergency','Pharmacy','Oxygen Support'], 16, 'Pet hospital with emergency, pharmacy and oxygen support.'),
  ('The Jupiter Pet Hospital', 'Private Emergency', 'Kukatpally', 'Kukatpally, Hyderabad 500072', '500072', 17.4948, 78.3996, '+919876510004', true, false, '08:00', '22:00', 850, 4.5, 218, 12, 6, array['Emergency','Pharmacy','Oxygen Support'], array['Emergency','Pharmacy','Oxygen Support'], 14, 'Jupiter Pet Hospital branch serving Kukatpally.'),
  ('Seven Oaks Pet Hospital', 'Private Emergency', 'LB Nagar', 'LB Nagar, Hyderabad 500074', '500074', 17.3457, 78.5522, '+919876510005', true, false, '08:00', '22:00', 750, 4.5, 205, 12, 6, array['Trauma Care','Emergency','Preventive Care'], array['Trauma Care','Emergency','Health Packages'], 16, 'Emergency-focused pet hospital with trauma care and health packages.'),
  ('Ivy Paws Super Speciality Veterinary Hospital', 'Private Super Speciality', 'Sainikpuri', 'Sainikpuri, Hyderabad 500094', '500094', 17.4890, 78.5487, '+919876510006', true, false, '08:30', '22:00', 900, 4.7, 276, 16, 8, array['Rescue Support','Sterilization','Inpatient Care'], array['Rescue Support','Advanced Sterilization','Inpatient Care'], 22, 'Super speciality veterinary hospital with rescue support and inpatient care.'),
  ('Ivy Paws Super Speciality Veterinary Hospital', 'Private Super Speciality', 'Chanda Nagar', 'Chanda Nagar, Hyderabad 500050', '500050', 17.4931, 78.3323, '+919876510007', true, false, '08:30', '22:00', 900, 4.6, 231, 14, 7, array['Rescue Support','Sterilization','Inpatient Care'], array['Rescue Support','Advanced Sterilization','Inpatient Care'], 18, 'Ivy Paws branch for Chanda Nagar and surrounding areas.'),
  ('VETCARE Multispeciality Pet Hospital', 'Private Multispeciality', 'Shaikpet', 'Shaikpet, Hyderabad 500008', '500008', 17.4050, 78.3906, '+919876510008', true, false, '09:00', '21:00', 800, 4.5, 194, 11, 6, array['Vaccinations','Diagnostics','Surgery'], array['Vaccinations','Diagnostics','Multi-speciality Surgery'], 12, 'Multispeciality pet hospital for diagnostics, vaccines and surgery.'),
  ('Vetic Pet Clinics', 'Private Clinic Chain', 'Banjara Hills', 'Banjara Hills, Hyderabad 500034', '500034', 17.4148, 78.4347, '+919876510009', false, false, '09:00', '21:00', 700, 4.6, 302, 10, 6, array['Digital Health Records','Diagnostics','Blood Work'], array['Digital Health Records','Same Day Reports','Blood Work'], 8, 'Vetic clinic with digital health records and same day reports.'),
  ('Vetic Pet Clinics', 'Private Clinic Chain', 'Himayat Nagar', 'Himayat Nagar, Hyderabad 500029', '500029', 17.4008, 78.4873, '+919876510010', false, false, '09:00', '21:00', 700, 4.5, 250, 8, 5, array['Digital Health Records','Diagnostics','Blood Work'], array['Digital Health Records','Same Day Reports','Blood Work'], 8, 'Vetic clinic serving Himayat Nagar.'),
  ('Vetic Pet Clinics', 'Private Clinic Chain', 'Hitech City', 'Hitech City, Hyderabad 500081', '500081', 17.4474, 78.3762, '+919876510011', false, false, '09:00', '21:00', 750, 4.7, 340, 12, 7, array['Digital Health Records','Diagnostics','Blood Work'], array['Digital Health Records','Same Day Reports','Blood Work'], 10, 'Vetic Hitech City clinic for diagnostics and pet wellness.'),
  ('Vetic Pet Clinics', 'Private Clinic Chain', 'Kukatpally', 'Kukatpally, Hyderabad 500072', '500072', 17.4849, 78.4138, '+919876510012', false, false, '09:00', '21:00', 700, 4.5, 288, 10, 5, array['Digital Health Records','Diagnostics','Blood Work'], array['Digital Health Records','Same Day Reports','Blood Work'], 8, 'Vetic Kukatpally clinic.'),
  ('Vetic Pet Clinics', 'Private Clinic Chain', 'Manikonda', 'Manikonda, Hyderabad 500089', '500089', 17.4056, 78.3476, '+919876510013', false, false, '09:00', '21:00', 700, 4.4, 210, 8, 4, array['Digital Health Records','Diagnostics','Blood Work'], array['Digital Health Records','Same Day Reports','Blood Work'], 6, 'Vetic Manikonda clinic.'),
  ('Vetic Pet Clinics', 'Private Clinic Chain', 'Secunderabad', 'Secunderabad, Hyderabad 500003', '500003', 17.4420, 78.5019, '+919876510014', false, false, '09:00', '21:00', 700, 4.4, 205, 8, 4, array['Digital Health Records','Diagnostics','Blood Work'], array['Digital Health Records','Same Day Reports','Blood Work'], 6, 'Vetic Secunderabad clinic.'),
  ('SKS Veterinary Hospital', 'Private Hospital', 'Kavuri Hills', 'Kavuri Hills, Hyderabad 500033', '500033', 17.4392, 78.3986, '+919876510015', false, false, '09:00', '21:00', 750, 4.5, 178, 9, 5, array['Preventive Care','Dental','Imaging','Surgery'], array['Preventive Care','Dental','Imaging','Surgery'], 10, 'Veterinary hospital for preventive care, dental, imaging and surgery.'),
  ('PETPLANET Dog Clinic & Animal Diagnostics', 'Private Diagnostics', 'Kothapet', 'Kothapet, Hyderabad 500035', '500035', 17.3687, 78.5462, '+919876510016', false, false, '09:00', '21:00', 650, 4.4, 145, 7, 4, array['Diagnostics','Operation Theatre','Grooming'], array['Operation Theatre','Pharmacy','Diagnostics','Grooming'], 8, 'Dog clinic and animal diagnostics centre with OT and grooming.'),
  ('Claws & Paws Pet Clinic', 'Private Clinic', 'Banjara Hills', 'Banjara Hills, Hyderabad 500034', '500034', 17.4164, 78.4384, '+919876510017', false, false, '09:30', '20:30', 800, 4.6, 201, 8, 4, array['Surgery','Diagnostics','Recovery Care'], array['Experienced Surgeons','Diagnostics','Recovery Ward'], 8, 'Pet clinic with experienced surgeons, diagnostics and recovery ward.')
)
insert into public.clinics (
  name, hospital_name, category, logo_url, cover_image, gallery_images, address, area, city, state, pincode,
  latitude, longitude, phone, email, website, description, emergency_available, open_24_hours, is_24x7,
  opening_time, closing_time, departments, facilities, consultation_fee, average_rating, rating, review_count,
  total_doctors, available_doctors, total_beds, parking_available, wheelchair_accessible, ambulance_service,
  pharmacy_available, laboratory_available, is_active
)
select
  seed.hospital_name,
  seed.hospital_name,
  seed.category,
  'https://xvgddddslgynglledskj.supabase.co/storage/v1/object/public/hospital-images/hyderabad/logo-default.webp',
  'https://xvgddddslgynglledskj.supabase.co/storage/v1/object/public/hospital-images/hyderabad/cover-default.webp',
  array['https://xvgddddslgynglledskj.supabase.co/storage/v1/object/public/hospital-images/hyderabad/gallery-1.webp', 'https://xvgddddslgynglledskj.supabase.co/storage/v1/object/public/hospital-images/hyderabad/gallery-2.webp', 'https://xvgddddslgynglledskj.supabase.co/storage/v1/object/public/hospital-images/hyderabad/gallery-3.webp'],
  seed.address, seed.area, 'Hyderabad', 'Telangana', seed.pincode,
  seed.latitude, seed.longitude, seed.phone,
  lower(regexp_replace(seed.hospital_name || '-' || seed.area, '[^a-zA-Z0-9]+', '.', 'g')) || '@petcare.example',
  'https://petcare.example/hospitals/' || lower(regexp_replace(seed.hospital_name || '-' || seed.area, '[^a-zA-Z0-9]+', '-', 'g')),
  seed.description, seed.emergency_available, seed.open_24_hours, seed.open_24_hours,
  seed.opening_time, seed.closing_time, seed.departments, seed.facilities, seed.consultation_fee,
  seed.rating, seed.rating, seed.review_count, seed.total_doctors, seed.available_doctors,
  seed.total_beds, true, true, seed.emergency_available, true, true, true
from seed
where not exists (
  select 1 from public.clinics existing
  where existing.hospital_name = seed.hospital_name
    and coalesce(existing.area, '') = seed.area
);

notify pgrst, 'reload schema';
