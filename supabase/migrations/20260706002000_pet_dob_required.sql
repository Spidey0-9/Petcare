-- Require date of birth for newly created or updated pet records.
-- NOT VALID keeps existing incomplete rows from blocking deployment while enforcing future writes.

alter table public.pets
  drop constraint if exists pets_date_of_birth_required_check;

alter table public.pets
  add constraint pets_date_of_birth_required_check
  check (date_of_birth is not null)
  not valid;

notify pgrst, 'reload schema';