-- ============================================================================
-- 0002 — REALTIME FOR THE SOCIAL MODULE (brief 2.4 / 2.8)
-- ============================================================================
-- Adds the social + notification tables to the supabase_realtime publication
-- so the app's WebSocket subscriptions (Feed, Messages, NotificationBell)
-- receive INSERT/UPDATE/DELETE events.
--
-- 0001 already put `notifications` in the publication at setup time; this
-- migration makes it declarative (idempotent) and covers the social tables.
--
-- Realtime respects RLS: each subscriber only receives events for rows its
-- JWT is allowed to SELECT, so private messages stay private.
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'notifications',
    'posts',
    'comments',
    'reactions',
    'messages',
    'connections',
    'endorsements'
  ]
  loop
    -- add if not already a member (no error when duplicated)
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        t
      );
    end if;
  end loop;
end $$;