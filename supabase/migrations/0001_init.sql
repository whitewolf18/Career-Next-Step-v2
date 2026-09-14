-- ============================================================================
-- CAREER NEXT STEP — SUPABASE SCHEMA v1
-- ============================================================================
-- Run this in the Supabase Dashboard (SQL Editor) or with:
--   supabase db push          (after `supabase link`)
--
-- This migration implements (against the 2026 Richfield Hackathon brief):
--   2.1  Four user types + backend-enforced RBAC (Row Level Security)
--   2.2  Admin provisioning + platform analytics data model
--   2.3  Digital-portfolio profiles + endorsements
--   2.4  Connections, posts, comments, reactions, direct messages
--   2.5  Opportunities (business) with ADMIN APPROVAL + student applications
--   2.6  (App) onboarding / chatbot — see SETUP.md
--   2.7  Data model behind the three analytics dashboards
--   2.8  Real-time notifications + smart job matching logic
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. HELPERS
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES  (one row per auth.users row — created automatically on signup)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  -- 'student' | 'alumni' | 'business' | 'admin'
  role text not null default 'student'
    check (role in ('student', 'alumni', 'business', 'admin')),
  -- 'pending' (business awaiting admin approval) | 'active' | 'suspended'
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended')),

  full_name text,
  headline text,
  summary text,
  avatar_url text,
  location text,

  -- Student / alumni section
  programme text,
  campus text,
  year_of_enrolment integer,
  year_of_graduation integer,
  skills jsonb not null default '[]'::jsonb,
  work_experience jsonb not null default '[]'::jsonb,
  entrepreneurial_experience jsonb not null default '[]'::jsonb,
  github_url text,
  linkedin_url text,
  credly_url text,
  portfolio jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  leadership jsonb not null default '[]'::jsonb,
  activities jsonb not null default '[]'::jsonb,
  career_interests jsonb not null default '[]'::jsonb,

  -- Business section
  company_name text,
  industry text,
  company_description text,
  company_website text,
  contact_details jsonb not null default '{}'::jsonb,
  talent_needs jsonb not null default '[]'::jsonb,

  -- Privacy / visibility controls (2.3) + flags
  visibility jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  onboarding_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx    on public.profiles (email);
create index if not exists profiles_role_idx     on public.profiles (role);
create index if not exists profiles_programme_idx on public.profiles (programme);

alter table public.profiles enable row level security;

-- Returns true when the current user is an administrator. NOTE: this SQL
-- function is SECURITY DEFINER, so PostgreSQL validates its body at creation
-- time - which is why it must be defined AFTER the profiles table above.
create or replace function public.is_admin()
returns boolean
language sql security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Populates the profiles row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  v_consent boolean := coalesce((new.raw_user_meta_data ->> 'popia_consent')::boolean, false);
begin
  insert into public.profiles (id, email, role, full_name, status, popia_consent, popia_consent_at)
  values (
    new.id,
    new.email,
    case
      when v_role in ('student', 'alumni', 'business', 'admin') then v_role
      else 'student'
    end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when v_role = 'business' then 'pending' else 'active' end,
    v_consent,
    case when v_consent then now() else null end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Students may only sign up with official institutional email domains (brief 2.1).
create or replace function public.enforce_student_domain()
returns trigger
language plpgsql security definer
as $$
begin
  if new.role = 'student' then
    if not (
      lower(new.email) like '%@my.richfield.ac.za'
      or lower(new.email) like '%@richfield.ac.za'
      or lower(new.email) like '%@my.aaa.ac.za'
      or lower(new.email) like '%@aaa.ac.za'
    ) then
      raise exception
        'Students must register with an @my.richfield.ac.za, @richfield.ac.za, @my.aaa.ac.za or @aaa.ac.za email address.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_student_domain on public.profiles;
create trigger profiles_enforce_student_domain
before insert or update on public.profiles
for each row execute function public.enforce_student_domain();

-- Nobody may self-assign a role or set their own admin status (backend RBAC).
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql security definer
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'User roles can only be changed by an administrator.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_freeze on public.profiles;
create trigger profiles_role_freeze
before update on public.profiles
for each row execute function public.prevent_self_role_escalation();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS: profiles are a digital portfolio - viewable by all signed-in users.
-- Updates are restricted to the owner; admin functions are admin-only.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_system" on public.profiles
  for insert to authenticated with check (false);

create policy "profiles_update_owner" on public.profiles
  for update to authenticated using ((select auth.uid()) = id);

create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. CONNECTIONS  (2.4 — send / accept / decline, with notification)
-- ----------------------------------------------------------------------------
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_distinct_users check (requester_id <> addressee_id),
  constraint connections_unique_pair unique (requester_id, addressee_id)
);

alter table public.connections enable row level security;

create policy "connections_select_participants" on public.connections
  for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "connections_insert_self_request" on public.connections
  for insert to authenticated
  with check ((select auth.uid()) = requester_id);

create policy "connections_update_participants" on public.connections
  for update to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop trigger if exists connections_updated_at on public.connections;
create trigger connections_updated_at
before update on public.connections
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. POSTS / COMMENTS / REACTIONS  (2.4 feed)
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  media_type text not null default 'none'
    check (media_type in ('none', 'image', 'video')),
  media_url text,
  flagged boolean not null default false,   -- content-moderation queue
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

-- All signed-in users see the feed (role-specific ranking is app-side logic).
create policy "posts_select"    on public.posts    for select to authenticated using (true);
create policy "posts_insert"    on public.posts    for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "posts_update_author" on public.posts for update to authenticated using ((select auth.uid()) = author_id);
create policy "posts_update_admin"  on public.posts for update to authenticated using (public.is_admin());
create policy "posts_delete"    on public.posts    for delete to authenticated using ((select auth.uid()) = author_id or public.is_admin());

create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert" on public.comments for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "comments_delete" on public.comments for delete to authenticated using ((select auth.uid()) = author_id or public.is_admin());

create policy "reactions_select" on public.reactions for select to authenticated using (true);
create policy "reactions_insert" on public.reactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reactions_delete" on public.reactions for delete to authenticated using ((select auth.uid()) = user_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. MESSAGES  (2.4 direct messaging)
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_distinct_users check (sender_id <> recipient_id)
);

create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

create policy "messages_select_participants" on public.messages
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "messages_insert_participants" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

-- ----------------------------------------------------------------------------
-- 5. ENDORSEMENTS / RECOMMENDATIONS  (2.3)
-- ----------------------------------------------------------------------------
create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  endorser_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint endorsements_distinct_users check (recipient_id <> endorser_id),
  constraint endorsements_unique unique (recipient_id, endorser_id, skill)
);

alter table public.endorsements enable row level security;

create policy "endorsements_select" on public.endorsements for select to authenticated using (true);
create policy "endorsements_insert" on public.endorsements for insert to authenticated with check ((select auth.uid()) = endorser_id);
create policy "endorsements_delete" on public.endorsements for delete to authenticated using ((select auth.uid()) = endorser_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. OPPORTUNITIES / JOBS  (2.5 — business posts, admin approval required)
-- ----------------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null default '',
  industry text,
  location text,
  employment_type text not null default 'Full-time'
    check (employment_type in ('Internship', 'Learnership', 'Part-time', 'Full-time', 'Graduate')),
  salary text,
  description text not null default '',
  requirements text,
  skills jsonb not null default '[]'::jsonb,
  -- 'pending' -> hidden until admin approves (brief 2.2 / 2.5)
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_status_idx on public.opportunities (status);
create index if not exists opportunities_business_idx on public.opportunities (business_id);

alter table public.opportunities enable row level security;

-- Only approved jobs are visible to everyone; owner + admin see their own rows.
create policy "opportunities_select" on public.opportunities
  for select to authenticated
  using (
    status = 'approved'
    or business_id = (select auth.uid())
    or public.is_admin()
  );

-- Active business accounts create jobs, but always as 'pending' (approval gate).
create policy "opportunities_insert" on public.opportunities
  for insert to authenticated
  with check (
    status = 'pending'
    and (select auth.uid()) = business_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'business'
        and p.status = 'active'
    )
  );

-- Owners may edit their own (still pending) listing; admins approve / reject.
create policy "opportunities_update_owner" on public.opportunities
  for update to authenticated
  using ((select auth.uid()) = business_id and status = 'pending');

create policy "opportunities_update_admin" on public.opportunities
  for update to authenticated
  using (public.is_admin());

create policy "opportunities_delete_admin" on public.opportunities
  for delete to authenticated
  using (public.is_admin());

-- Extra safety: force status 'pending' on insert, and only admins may change
-- the approval status afterwards (insurance on top of RLS).
create or replace function public.enforce_opportunity_approval()
returns trigger
language plpgsql security definer
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
  elsif not public.is_admin() and old.status is distinct from new.status then
    raise exception 'Only administrators may approve or reject opportunities.';
  end if;
  return new;
end;
$$;

drop trigger if exists opportunities_approval_gate on public.opportunities;
create trigger opportunities_approval_gate
before insert or update on public.opportunities
for each row execute function public.enforce_opportunity_approval();

drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. APPLICATIONS  (2.5)
-- ----------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'applied'
    check (status in ('applied', 'shortlisted', 'interview', 'hired', 'rejected', 'withdrawn')),
  match_score integer not null default 0,
  cover_note text,
  created_at timestamptz not null default now(),
  constraint applications_unique unique (opportunity_id, applicant_id)
);

create index if not exists applications_opportunity_idx on public.applications (opportunity_id);

alter table public.applications enable row level security;

create policy "applications_select" on public.applications
  for select to authenticated
  using (
    (select auth.uid()) = applicant_id
    or public.is_admin()
    or exists (
      select 1 from public.opportunities o
      where o.id = applications.opportunity_id
        and o.business_id = (select auth.uid())
    )
  );

-- Only students / alumni may apply, and only to approved opportunities.
create policy "applications_insert" on public.applications
  for insert to authenticated
  with check (
    (select auth.uid()) = applicant_id
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.status = 'approved'
    )
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('student', 'alumni')
        and p.status = 'active'
    )
  );

-- Applicant may withdraw; opportunity owner drives the pipeline; admin overrides.
create policy "applications_update" on public.applications
  for update to authenticated
  using (
    (select auth.uid()) = applicant_id
    or public.is_admin()
    or exists (
      select 1 from public.opportunities o
      where o.id = applications.opportunity_id
        and o.business_id = (select auth.uid())
    )
  );

create policy "applications_delete_admin" on public.applications
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. EVENTS  (2.2 — created only by administrators, visible to everyone)
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_select" on public.events for select to authenticated using (true);
create policy "events_insert" on public.events for insert to authenticated with check (public.is_admin());
create policy "events_update" on public.events for update to authenticated using (public.is_admin());
create policy "events_delete" on public.events for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS  (2.8 — real-time via Realtime)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'general',
  title text,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id);

-- (System triggers below insert notifications via security-definer functions.)

-- ----------------------------------------------------------------------------
-- 10. SMART JOB MATCHING  (2.8 — matching logic, not a broadcast)
-- ----------------------------------------------------------------------------
create or replace function public.notify_opportunity_approved()
returns trigger
language plpgsql security definer
as $$
declare
  v_student record;
begin
  if new.status = 'approved' and (old.status is null or old.status = 'pending') then
    for v_student in
      select p.id
      from public.profiles p
      where p.role in ('student', 'alumni')
        and p.status = 'active'
        and p.skills ?| (
          select coalesce(array_agg(s), '{}'::text[])
          from jsonb_array_elements_text(new.skills) s
        )
    loop
      insert into public.notifications (user_id, type, title, body, link)
      values (v_student.id, 'opportunity_match', 'A new opportunity matches your skills',
              new.title, '/jobs');
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists opportunities_match_students on public.opportunities;
create trigger opportunities_match_students
after update on public.opportunities
for each row execute function public.notify_opportunity_approved();

-- New application -> notify the business.
create or replace function public.notify_new_application()
returns trigger
language plpgsql security definer
as $$
declare
  v_business uuid;
begin
  select business_id into v_business
  from public.opportunities where id = new.opportunity_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (v_business, 'application', 'New application received',
          'A student just applied to one of your opportunities.', '/applications');
  return new;
end;
$$;

drop trigger if exists applications_notify_business on public.applications;
create trigger applications_notify_business
after insert on public.applications
for each row execute function public.notify_new_application();

-- New connection request -> notify the recipient.
create or replace function public.notify_connection_request()
returns trigger
language plpgsql security definer
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.addressee_id, 'connection', 'New connection request',
            'Someone wants to connect with you.', '/network');
  end if;
  return new;
end;
$$;

drop trigger if exists connections_notify_recipient on public.connections;
create trigger connections_notify_recipient
after insert on public.connections
for each row execute function public.notify_connection_request();

-- New comment -> notify the post author.
create or replace function public.notify_new_comment()
returns trigger
language plpgsql security definer
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author <> new.author_id then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_author, 'comment', 'New comment on your post',
            left(new.content, 120), '/feed');
  end if;
  return new;
end;
$$;

drop trigger if exists comments_notify_author on public.comments;
create trigger comments_notify_author
after insert on public.comments
for each row execute function public.notify_new_comment();