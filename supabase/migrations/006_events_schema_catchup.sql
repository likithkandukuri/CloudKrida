-- ── Schema-drift catch-up: events table + tournaments.event_id/event_order ───
-- Run this entire file in Supabase → SQL Editor → New query → Run
--
-- Purpose: supabase/migrations/001-004 never captured the "events" table or
-- the tournaments.event_id/event_order columns — they were added directly via
-- the Supabase dashboard SQL editor at some point and never committed as a
-- migration. This file brings the committed migration history back in sync
-- with the live, intended schema.
--
-- Every value below (column types, nullability, defaults, RLS policy text,
-- Realtime registration, and the FK's ON DELETE CASCADE behavior) was read
-- directly from the live database via a full schema audit — nothing here is
-- inferred or guessed.
--
-- This migration is a deliberate no-op against the CURRENT live database:
-- every object it creates already exists there. Its only real effect is on a
-- hypothetical fresh database that doesn't have these objects yet — this is
-- what running 001 through 006 in order would now produce, matching what's
-- actually live today.

-- ─────────────────────────────────────────────────────────────────────────────
-- events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  date        DATE,
  location    TEXT        DEFAULT '',
  description TEXT        DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Live RLS on "events" uses a different shape than Chess's other tables (two
-- policies, not four separate _select/_insert/_update/_delete) — reproduced
-- exactly as confirmed by the audit, not normalized to match the other tables.
DROP POLICY IF EXISTS "public read events" ON events;
CREATE POLICY "public read events" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "superadmin manage events" ON events;
CREATE POLICY "superadmin manage events" ON events
  FOR ALL USING (is_superadmin());

-- Realtime — guarded: the audit confirmed "events" is already registered live,
-- so on the current database this block finds the row and does nothing. It
-- only actually runs ALTER PUBLICATION against a database where "events"
-- genuinely isn't registered yet (e.g. a fresh environment built from these
-- migrations). ALTER PUBLICATION ... ADD TABLE has no IF NOT EXISTS form and
-- errors if the table is already a member, which is exactly why this needs
-- the guard rather than a bare statement.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- tournaments — drifted columns (event grouping, added after 001_schema.sql)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS event_order SMALLINT DEFAULT 0;
