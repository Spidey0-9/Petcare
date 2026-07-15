-- Sprint 19 schema gap repair for Groomer Shop, inventory, reviews, analytics, notifications, and media.
-- This migration reuses existing PetCare+ tables and buckets. It does not create duplicate shop tables.
-- Safe to run repeatedly: every schema change is additive and idempotent.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.products add column if not exists sku text;
alter table if exists public.products add column if not exists brand text;
alter table if exists public.products add column if not exists review_count integer not null default 0;
alter table if exists public.products add column if not exists is_active boolean not null default true;
alter table if exists public.products add column if not exists is_featured boolean not null default false;
alter table if exists public.products add column if not exists low_stock_threshold integer not null default 5;
alter table if exists public.products add column if not exists gallery_images text[] not null default '{}'::text[];
alter table if exists public.products add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public.orders add column if not exists payment_status text not null default 'pending';
alter table if exists public.orders add column if not exists fulfillment_status text not null default 'pending';
alter table if exists public.orders add column if not exists tracking_number text;
alter table if exists public.orders add column if not exists notes text;

alter table if exists public.notifications add column if not exists reference_table text;

alter table if exists public.reviews add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table if exists public.reviews add column if not exists grooming_booking_id uuid references public.grooming_bookings(id) on delete set null;
alter table if exists public.reviews add column if not exists grooming_service_id uuid references public.grooming_services(id) on delete set null;
alter table if exists public.reviews add column if not exists grooming_clinic_id uuid references public.grooming_clinics(id) on delete set null;
alter table if exists public.reviews add column if not exists groomer_id uuid references public.groomers(id) on delete set null;
alter table if exists public.reviews add column if not exists media_urls text[] not null default '{}'::text[];
alter table if exists public.reviews add column if not exists response text;
alter table if exists public.reviews add column if not exists response_at timestamptz;
alter table if exists public.reviews add column if not exists is_verified boolean not null default false;

create index if not exists products_active_category_idx on public.products(is_active, category_id);
create index if not exists products_featured_idx on public.products(is_featured) where is_featured = true;
create index if not exists products_low_stock_idx on public.products(stock, low_stock_threshold) where is_active = true;
create index if not exists products_sku_idx on public.products(sku) where sku is not null;
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_fulfillment_status_idx on public.orders(fulfillment_status);
create index if not exists notifications_reference_idx on public.notifications(reference_table, reference_id);
create index if not exists reviews_product_id_idx on public.reviews(product_id);
create index if not exists reviews_grooming_booking_id_idx on public.reviews(grooming_booking_id);
create index if not exists reviews_grooming_service_id_idx on public.reviews(grooming_service_id);
create index if not exists reviews_grooming_clinic_id_idx on public.reviews(grooming_clinic_id);
create index if not exists reviews_groomer_id_idx on public.reviews(groomer_id);

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('grooming-images', 'grooming-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
