-- ============================================================================
-- 0005 — PLATFORM-WIDE ANNOUNCEMENTS (admin broadcasting)
-- ============================================================================
-- Satisfies the "announcement broadcasting" requirement of the admin console:
--   1) `announcements` table — admins publish targeted messages.
--   2) Audience-aware RLS  — students/alumni/businesses only see the
--      announcements aimed at their role (or 'all').
--   3) Realtime          — the table streams so screens update live.
--   4) Broadcast trigger — a new announcement inserts a notification row for
--      every *active* user in the target audience (real-time bell).
-- ============================================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  -- 'all' | 'students' (students + alumni) | 'alumni' | 'business' | 'admins'
  audience text not null default 'all'
    check (audience in ('all', 'students', 'alumni', 'business', 'admins')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_created_idx
  on public.announcements (created_at desc);

-- True when the announcement audience includes the current signed-in user.
create or replace function public.announcement_visible_for(audience text)
returns boolean
language sql security definer stable
as $$
  select case
    when audience is null or audience = 'all' then true
    when audience = 'students' then exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('student', 'alumni')
    )
    when audience = 'alumni' then exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'alumni'
    )
    when audience = 'business' then exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'business'
    )
    when audience = 'admins' then exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    else true
  end;
$$;

alter table public.announcements enable row level security;

-- Everyone signed-in reads announcements targeted at their role.
create policy "announcements_select" on public.announcements
  for select to authenticated
  using (public.announcement_visible_for(audience));

-- Only administrators publish / edit / delete announcements.
create policy "announcements_insert_admin" on public.announcements
  for insert to authenticated
  with check (public.is_admin() and (select auth.uid()) = admin_id);

create policy "announcements_update_admin" on public.announcements
  for update to authenticated
  using (public.is_admin());

create policy "announcements_delete_admin" on public.announcements
  for delete to authenticated
  using (public.is_admin());

-- Set updated_at on edits.
drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- REALTIME: stream announcement rows to connected clients.
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- BROADCAST: a new announcement notifies every active user in the audience.
-- ----------------------------------------------------------------------------
create or replace function public.notify_announcement_created()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select p.id,
         'announcement',
         new.title,
         left(coalesce(new.body, ''), 180),
         '/announcements'
  from public.profiles p
  where p.status = 'active'
    and (
      new.audience = 'all'
      or (new.audience = 'students' and p.role in ('student', 'alumni'))
      or (new.audience = 'alumni' and p.role = 'alumni')
      or (new.audience = 'business' and p.role = 'business')
      or (new.audience = 'admins' and p.role = 'admin')
    );
  return new;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
after insert on public.announcements
for each row execute function public.notify_announcement_created();