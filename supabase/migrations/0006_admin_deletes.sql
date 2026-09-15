-- ============================================================================
-- 0006 — ADMIN DELETE FIXES
-- ============================================================================
-- 1) events.created_by had NO on-delete action -> deleting a user who had
--    created an event failed with a foreign-key violation (admin "Delete"
--    button erroring). Now cascades.
-- 2) alumni_verifications.reviewed_by had NO on-delete action -> deleting an
--    admin who had reviewed verification requests failed the same way.
--    reviewed_by is informational -> SET NULL.
-- Run AFTER 0001..0005, in order.
-- ============================================================================

alter table public.events
  drop constraint if exists events_created_by_fkey;

alter table public.events
  add constraint events_created_by_fkey
  foreign key (created_by)
  references public.profiles(id)
  on delete cascade;

alter table public.alumni_verifications
  drop constraint if exists alumni_verifications_reviewed_by_fkey;

alter table public.alumni_verifications
  add constraint alumni_verifications_reviewed_by_fkey
  foreign key (reviewed_by)
  references public.profiles(id)
  on delete set null;