-- ============================================================================
-- 0003 — EVENTS NOTIFICATIONS + ALUMNI VERIFICATION + VIDEO MEDIA SUPPORT
-- ============================================================================
-- 1) posts.thumbnail_url column (video posts carry a generated thumbnail)
-- 2) 'media' storage bucket + storage policies (photo/video uploads)
-- 3) Realtime publication: events table
-- 4) Trigger: new event -> notify all active students & alumni (realtime)
-- 5) Trigger: admin verifies alumni -> notify that user (realtime)
-- ============================================================================

alter table public.posts add column if not exists thumbnail_url text;

-- ----------------------------------------------------------------------------
-- EVENT RSVPs (brief 2.3 — students/alumni can RSVP to events)
-- ----------------------------------------------------------------------------
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_rsvps enable row level security;

create policy "event_rsvps_select" on public.event_rsvps
  for select to authenticated using (true);

create policy "event_rsvps_insert" on public.event_rsvps
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "event_rsvps_delete" on public.event_rsvps
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- POPIA: consent column on profiles (brief 2.8)
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists popia_consent boolean not null default false;
alter table public.profiles add column if not exists popia_consent_at timestamptz;

-- ----------------------------------------------------------------------------
-- STORAGE: public 'media' bucket. Users upload under their own uid folder.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "media_owner_upload" on storage.objects;
create policy "media_owner_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_owner_update" on storage.objects;
create policy "media_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media_owner_delete" on storage.objects;
create policy "media_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- REALTIME: stream events to connected clients
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- TRIGGER: a new institutional event -> notify all active students & alumni
-- ----------------------------------------------------------------------------
create or replace function public.notify_event_created()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select p.id,
         'event',
         'New event: ' || new.title,
         coalesce(new.description, ''),
         '/events'
  from public.profiles p
  where p.role in ('student', 'alumni')
    and p.status = 'active';
  return new;
end;
$$;

drop trigger if exists events_notify_all on public.events;
create trigger events_notify_all
after insert on public.events
for each row execute function public.notify_event_created();

-- ----------------------------------------------------------------------------
-- TRIGGER: alumni verified by admin -> notify that user
-- ----------------------------------------------------------------------------
create or replace function public.notify_alumni_verified()
returns trigger
language plpgsql security definer
as $$
begin
  if new.is_verified and not coalesce(old.is_verified, false) then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.id,
      'alumni_verified',
      'Alumni status verified',
      'Your alumni identity has been verified by an administrator. ' ||
        'Your profile is now badged as verified.',
      '/profile'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_alumni_verified on public.profiles;
create trigger profiles_alumni_verified
after update on public.profiles
for each row execute function public.notify_alumni_verified();
