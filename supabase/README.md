# PetCare+ Supabase Backend

## Migrations

Apply the migrations in order:

1. `supabase/migrations/20260704000000_petcare_backend.sql`
2. `supabase/migrations/20260704001000_petcare_production_extensions.sql`

Use one of these approaches:

1. Supabase Dashboard -> SQL Editor -> paste each migration -> Run.
2. Supabase CLI, if installed and linked:

```bash
supabase db push
```

The migrations create:

- Core tables for profiles, doctors, pets, appointments, medical records, reminders, posts, comments, likes, notifications, clinics, shop, messages, AI predictions, and vaccinations.
- Production extensions for payments, invoices, reviews, favorites, saved clinics, pet health logs, and offline sync queue.
- Storage buckets for profile images, pet images, doctor images, medical reports, community posts, and product images.
- Foreign keys, indexes, no-double-booking appointment constraint, updated_at triggers, auth profile trigger, and RLS policies.

## Required Environment Variables

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_OPENWEATHER_API_KEY=
EXPO_PUBLIC_AI_API_URL=
```

## Verification Queries

Run after applying the migrations:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select name, public
from storage.buckets
where id in (
  'profile-images',
  'pet-images',
  'doctor-images',
  'medical-reports',
  'community-posts',
  'product-images'
);

select schemaname, tablename, policyname
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, policyname;
```

## Important Notes

- Keep RLS enabled in production.
- The app currently supports a compatibility `community_posts` table while the service layer also supports normalized `posts`, `comments`, and `likes`.
- Payment rows are application records only. A real payment gateway integration is still required before collecting card/UPI/wallet payments.
