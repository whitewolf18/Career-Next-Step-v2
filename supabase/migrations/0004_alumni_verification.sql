-- ============================================================================
-- 0004 — ALUMNI VERIFICATION PIPELINE (brief 2.1: alternate identity verification)
-- ============================================================================
-- Alumni register with any email, then submit proof (programme, graduation
-- year, alumni/student number, optional document). An admin reviews it:
--   approve -> profiles.is_verified = true (trigger notifies the alumni)
--   reject  -> verifications.status = 'rejected' (+ note)
-- ============================================================================

create table if not exists public.alumni_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  programme text,
  graduation_year integer,
  alumni_number text,
  document_url text,
  -- 'pending' | 'approved' | 'rejected'
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alumni_verifications_user_idx
  on public.alumni_verifications (user_id);
create index if not exists alumni_verifications_status_idx
  on public.alumni_verifications (status);

alter table public.alumni_verifications enable row level security;

-- Alumni submit and see their own request; admins see all.
create policy "alumni_verifications_select" on public.alumni_verifications
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- An alumnus submits a request for themselves.
create policy "alumni_verifications_insert" on public.alumni_verifications
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Only admins review (approve / reject).
create policy "alumni_verifications_update_admin" on public.alumni_verifications
  for update to authenticated
  using (public.is_admin());

create policy "alumni_verifications_delete_admin" on public.alumni_verifications
  for delete to authenticated
  using (public.is_admin());

-- Admins review in one place: when an alumnus updates their own profile they
-- may NOT touch is_verified (already protected) — verification only happens
-- through this table by an admin.

-- Notify all admins when a verification request arrives (realtime bell).
create or replace function public.notify_alumni_request()
returns trigger
language plpgsql security definer
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id,
           'alumni_request',
           'New alumni verification request',
           'An alumnus submitted their details for identity verification.',
           '/admin-approvals'
    from public.profiles p
    where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists alumni_verifications_notify on public.alumni_verifications;
create trigger alumni_verifications_notify
after insert on public.alumni_verifications
for each row execute function public.notify_alumni_request();

-- Stream the table so admin screens update live.
do $$
begin
  alter publication supabase_realtime add table public.alumni_verifications;
exception
  when duplicate_object then null;
end $$;
