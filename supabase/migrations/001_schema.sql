-- ── Arena Tournament Platform — Database Schema ───────────────────────────────
-- Run this entire file in Supabase → SQL Editor → New query → Run

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions (defined first — used in RLS policies below)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin')
      AND status = 'active'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- user_profiles
-- Extends Supabase Auth users with role + status.
-- One row per auth user. Created by the manage-user Edge Function.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username   TEXT        UNIQUE NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'guest'
               CHECK (role IN ('superadmin', 'admin', 'guest')),
  status     TEXT        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all profiles (needed for superadmin user list)
CREATE POLICY "profiles_select" ON user_profiles
  FOR SELECT TO authenticated USING (true);

-- Superadmin can update role/status directly (promote/demote/enable/disable)
CREATE POLICY "profiles_update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- INSERT and DELETE are handled exclusively by the manage-user Edge Function
-- (which runs with the service role key and bypasses RLS)

-- ─────────────────────────────────────────────────────────────────────────────
-- tournaments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tournaments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  format        TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'active',
  total_rounds  INTEGER     NOT NULL DEFAULT 1,
  current_round INTEGER     NOT NULL DEFAULT 0,
  player_fields TEXT[]      NOT NULL DEFAULT ARRAY['name', 'elo'],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated guests) can read tournaments
CREATE POLICY "tournaments_select" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "tournaments_insert" ON tournaments
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "tournaments_update" ON tournaments
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "tournaments_delete" ON tournaments
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- players
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS players (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  data          JSONB       NOT NULL DEFAULT '{}',   -- elo, grade, age, etc.
  seed_order    INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select" ON players
  FOR SELECT USING (true);

CREATE POLICY "players_insert" ON players
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "players_update" ON players
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "players_delete" ON players
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- matches
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round         INTEGER     NOT NULL DEFAULT 0,
  slot          INTEGER     NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'live', 'complete', 'bye')),
  p1_name       TEXT,
  p2_name       TEXT,                              -- 'BYE' for bye matches
  winner_name   TEXT,
  score1        NUMERIC,
  score2        NUMERIC,
  completed_at  TIMESTAMPTZ,
  record_url    TEXT,                              -- Supabase Storage URL
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (true);

CREATE POLICY "matches_insert" ON matches
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "matches_update" ON matches
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "matches_delete" ON matches
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- gallery_photos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gallery_photos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,
  public_url    TEXT        NOT NULL,
  file_name     TEXT        NOT NULL,
  uploaded_by   UUID        REFERENCES auth.users(id),
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_select" ON gallery_photos
  FOR SELECT USING (true);

-- Both superadmin and admin can upload photos
CREATE POLICY "gallery_insert" ON gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_above());

-- Only superadmin can delete photos
CREATE POLICY "gallery_delete" ON gallery_photos
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- quick_matches
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quick_matches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quick_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_matches_select" ON quick_matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quick_matches_insert" ON quick_matches
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: RLS policies for gallery + score-records buckets
-- Run AFTER creating the buckets in Supabase Storage dashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- NOTE: Create two PUBLIC buckets manually in Supabase → Storage:
--   1. "gallery"        (public)
--   2. "score-records"  (public)
-- Then run the policies below.

CREATE POLICY "gallery_storage_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND is_admin_or_above());

CREATE POLICY "gallery_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND is_superadmin());

CREATE POLICY "score_records_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'score-records' AND is_superadmin());

CREATE POLICY "score_records_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'score-records' AND is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: enable for key tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE gallery_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE quick_matches;
