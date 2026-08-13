-- ── Pickleball Tournament Section — Database Schema ───────────────────────────
-- Run this entire file in Supabase → SQL Editor → New query → Run
--
-- Design notes (see the Phase 1 audit for full reasoning):
--  • New, parallel tables — nothing about Chess's tournaments/players/matches
--    changes. is_superadmin()/is_admin_or_above() already exist (001_schema.sql)
--    and are reused unmodified; no new roles, no new SQL helper functions.
--  • Team model: medium normalization, approved by the user — pickleball_players
--    is a reusable identity (supports player history/rankings across
--    tournaments), pickleball_entrants is one roster slot in one tournament
--    (singles or a doubles pair), pickleball_entrant_members joins the two.
--    Explicitly NOT building persistent cross-tournament teams — a doubles
--    pairing exists only for the tournament it was entered in.
--  • No contact_email/contact_phone columns yet — there is no registration
--    flow populating them in this phase, and adding them now would mean
--    shipping unused, privacy-sensitive columns without a resolved RLS design.
--    Add them in the registration-phase migration, with real RLS, when they're
--    actually needed.
--  • entrants.status is 'active'/'withdrawn' only (mirrors Chess's own
--    players.status convention exactly) — no pending/approved/waitlisted states,
--    since there is no registration workflow to produce them yet.
--  • RLS mirrors Chess's exact pattern: public SELECT (guests browse without
--    login), INSERT/UPDATE/DELETE restricted to is_superadmin(), except gallery
--    photos which follow Chess's current (post-004) admin-or-above rule for
--    both insert and delete.

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_tournaments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_tournaments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  event_type     TEXT        NOT NULL
                   CHECK (event_type IN ('singles', 'doubles', 'mixed_doubles')),
  format         TEXT        NOT NULL DEFAULT 'pool_to_single_elim'
                   CHECK (format IN ('pool_to_single_elim', 'single_elimination', 'double_elimination', 'round_robin_only')),
  status         TEXT        NOT NULL DEFAULT 'registration_open'
                   CHECK (status IN ('registration_open', 'registration_closed', 'in_progress', 'complete')),
  skill_division TEXT,                                    -- e.g. "3.5", "4.0+", "Open"
  age_band       TEXT,                                     -- e.g. "Open", "35+", "50+"
  games_to       INTEGER     NOT NULL DEFAULT 11
                   CHECK (games_to IN (11, 15, 21)),
  win_by_2       BOOLEAN     NOT NULL DEFAULT true,
  best_of        INTEGER     NOT NULL DEFAULT 3
                   CHECK (best_of IN (1, 3, 5)),
  pool_size      INTEGER     CHECK (pool_size IS NULL OR pool_size >= 2),
  court_count    INTEGER     CHECK (court_count IS NULL OR court_count >= 1),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pickleball_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_tournaments_select" ON pickleball_tournaments
  FOR SELECT USING (true);

CREATE POLICY "pb_tournaments_insert" ON pickleball_tournaments
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_tournaments_update" ON pickleball_tournaments
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_tournaments_delete" ON pickleball_tournaments
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_players
-- Canonical player identity — reused across tournaments and across different
-- doubles partners. Not scoped to any one tournament.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_players (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  skill_rating NUMERIC,                                    -- self-reported, e.g. 3.5
  dupr_id      TEXT,                                        -- optional, unverified
  age_group    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pickleball_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_players_select" ON pickleball_players
  FOR SELECT USING (true);

CREATE POLICY "pb_players_insert" ON pickleball_players
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_players_update" ON pickleball_players
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_players_delete" ON pickleball_players
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_entrants
-- One roster slot in one tournament — a single player (singles) or a specific
-- two-player pairing (doubles/mixed), for that tournament only.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_entrants (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID        NOT NULL REFERENCES pickleball_tournaments(id) ON DELETE CASCADE,
  display_name      TEXT        NOT NULL,                 -- "Jane Doe" or "Doe/Smith", set once
  status            TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'withdrawn')),
  seed_order        INTEGER     DEFAULT 0,
  points_adjustment NUMERIC     NOT NULL DEFAULT 0,        -- manual director correction, mirrors Chess's pattern
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pb_entrants_tournament ON pickleball_entrants(tournament_id);

ALTER TABLE pickleball_entrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_entrants_select" ON pickleball_entrants
  FOR SELECT USING (true);

CREATE POLICY "pb_entrants_insert" ON pickleball_entrants
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_entrants_update" ON pickleball_entrants
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_entrants_delete" ON pickleball_entrants
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_entrant_members
-- Joins an entrant to the real player(s) behind it — 1 row for singles,
-- 2 for doubles/mixed (seat 1 and seat 2). This is what makes player history
-- and future rankings a simple join instead of name-string matching.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_entrant_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entrant_id UUID        NOT NULL REFERENCES pickleball_entrants(id) ON DELETE CASCADE,
  player_id  UUID        NOT NULL REFERENCES pickleball_players(id),
  seat       INTEGER     NOT NULL DEFAULT 1 CHECK (seat IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entrant_id, seat),
  UNIQUE (entrant_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_pb_entrant_members_entrant ON pickleball_entrant_members(entrant_id);
CREATE INDEX IF NOT EXISTS idx_pb_entrant_members_player  ON pickleball_entrant_members(player_id);

ALTER TABLE pickleball_entrant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_entrant_members_select" ON pickleball_entrant_members
  FOR SELECT USING (true);

CREATE POLICY "pb_entrant_members_insert" ON pickleball_entrant_members
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_entrant_members_update" ON pickleball_entrant_members
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_entrant_members_delete" ON pickleball_entrant_members
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_pools
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_pools (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES pickleball_tournaments(id) ON DELETE CASCADE,
  label         TEXT        NOT NULL,                     -- "Pool A"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, label)
);

CREATE INDEX IF NOT EXISTS idx_pb_pools_tournament ON pickleball_pools(tournament_id);

ALTER TABLE pickleball_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_pools_select" ON pickleball_pools
  FOR SELECT USING (true);

CREATE POLICY "pb_pools_insert" ON pickleball_pools
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_pools_update" ON pickleball_pools
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_pools_delete" ON pickleball_pools
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_courts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_courts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES pickleball_tournaments(id) ON DELETE CASCADE,
  label         TEXT        NOT NULL,                     -- "Court 3"
  status        TEXT        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, label)
);

CREATE INDEX IF NOT EXISTS idx_pb_courts_tournament ON pickleball_courts(tournament_id);

ALTER TABLE pickleball_courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_courts_select" ON pickleball_courts
  FOR SELECT USING (true);

CREATE POLICY "pb_courts_insert" ON pickleball_courts
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_courts_update" ON pickleball_courts
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_courts_delete" ON pickleball_courts
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_matches
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_matches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id     UUID        NOT NULL REFERENCES pickleball_tournaments(id) ON DELETE CASCADE,
  pool_id           UUID        REFERENCES pickleball_pools(id) ON DELETE SET NULL,   -- NULL once in elimination bracket
  phase             TEXT        NOT NULL DEFAULT 'pool'
                      CHECK (phase IN ('pool', 'elimination')),
  round             INTEGER     NOT NULL DEFAULT 0,
  slot              INTEGER     NOT NULL DEFAULT 0,
  entrant1_id       UUID        REFERENCES pickleball_entrants(id) ON DELETE SET NULL,
  entrant2_id       UUID        REFERENCES pickleball_entrants(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'live', 'complete', 'bye')),
  games             JSONB       NOT NULL DEFAULT '[]',     -- [{game, score_a, score_b}, ...]
  winner_entrant_id UUID        REFERENCES pickleball_entrants(id) ON DELETE SET NULL,
  court_id          UUID        REFERENCES pickleball_courts(id) ON DELETE SET NULL,
  scheduled_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  record_url        TEXT,                                 -- Supabase Storage URL, score-sheet photo
  locked            BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pb_matches_distinct_entrants
    CHECK (entrant1_id IS NULL OR entrant2_id IS NULL OR entrant1_id <> entrant2_id)
);

CREATE INDEX IF NOT EXISTS idx_pb_matches_tournament ON pickleball_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_pb_matches_pool        ON pickleball_matches(pool_id);
CREATE INDEX IF NOT EXISTS idx_pb_matches_court        ON pickleball_matches(court_id);
CREATE INDEX IF NOT EXISTS idx_pb_matches_entrant1      ON pickleball_matches(entrant1_id);
CREATE INDEX IF NOT EXISTS idx_pb_matches_entrant2      ON pickleball_matches(entrant2_id);

ALTER TABLE pickleball_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_matches_select" ON pickleball_matches
  FOR SELECT USING (true);

CREATE POLICY "pb_matches_insert" ON pickleball_matches
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_matches_update" ON pickleball_matches
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_matches_delete" ON pickleball_matches
  FOR DELETE TO authenticated
  USING (is_superadmin());

-- ─────────────────────────────────────────────────────────────────────────────
-- pickleball_gallery_photos
-- Kept as its own table (not a polymorphic extension of gallery_photos) so a
-- single tournament_id FK always points at exactly one sport's tournaments
-- table — the same kind of ad-hoc shortcut that produced the events-table
-- drift this project is already cleaning up.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_gallery_photos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES pickleball_tournaments(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,
  public_url    TEXT        NOT NULL,
  file_name     TEXT        NOT NULL,
  uploaded_by   UUID        REFERENCES auth.users(id),
  media_type    TEXT        NOT NULL DEFAULT 'image'
                  CHECK (media_type IN ('image', 'video')),
  uploader_role TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pb_gallery_tournament ON pickleball_gallery_photos(tournament_id);

ALTER TABLE pickleball_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_gallery_select" ON pickleball_gallery_photos
  FOR SELECT USING (true);

-- Matches Chess's CURRENT rule (post-004_simplify_gallery_delete.sql), not the
-- superseded superadmin-only rule from 001 — both superadmin and admin can
-- upload and delete.
CREATE POLICY "pb_gallery_insert" ON pickleball_gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_above());

CREATE POLICY "pb_gallery_delete" ON pickleball_gallery_photos
  FOR DELETE TO authenticated
  USING (is_admin_or_above());

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: RLS policies for the pickleball-gallery bucket
-- NOTE: create a PUBLIC bucket named "pickleball-gallery" manually in
-- Supabase → Storage before this section takes effect (same manual step
-- SUPABASE_SETUP.md already documents for Chess's "gallery"/"score-records").
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "pb_gallery_storage_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pickleball-gallery' AND is_admin_or_above());

CREATE POLICY "pb_gallery_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pickleball-gallery' AND is_admin_or_above());

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_entrants;
ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_entrant_members;
ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_courts;
ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_gallery_photos;
