-- Sprint 6C - Profile contact fields consistency.
-- The app writes these nullable fields from Complete Profile and Edit Profile.
-- Safe to run repeatedly.

alter table if exists public.profiles
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists emergency_contact text;

notify pgrst, 'reload schema';
