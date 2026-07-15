-- Sprint 23 - Cross-portal notification metadata.
-- Reuses the existing notifications table and adds only missing metadata columns required for portal synchronization.
-- Safe to run repeatedly.

alter table if exists public.notifications add column if not exists action text;
alter table if exists public.notifications add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table if exists public.notifications add column if not exists organization_id uuid;
alter table if exists public.notifications add column if not exists reference_table text;
alter table if exists public.notifications add column if not exists reference_id uuid;

create index if not exists notifications_action_idx on public.notifications(action, created_at desc);
create index if not exists notifications_actor_id_idx on public.notifications(actor_id, created_at desc);
create index if not exists notifications_organization_id_idx on public.notifications(organization_id, created_at desc);
create index if not exists notifications_reference_idx on public.notifications(reference_table, reference_id);

notify pgrst, 'reload schema';
