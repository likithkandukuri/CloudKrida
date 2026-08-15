-- ─────────────────────────────────────────────────────────────────────────────
-- Manual 15-minute match timer — separate from the scheduled_at/start_at
-- tournament timing system (019). That system says when a match is
-- *expected* to happen; this is the tournament director's actual running
-- clock for the match currently being played, started/paused/reset by
-- hand. The two are deliberately independent: nothing here reads or writes
-- scheduled_at, and nothing in 019 reads or writes this table.
--
-- One row per match (match_id is the primary key, 1:1). Modeled to avoid
-- ever needing a per-second write: the countdown is derived client-side
-- from `remaining_seconds` (the banked/remaining time as of the last
-- pause/reset) and `started_at` (when the current running segment began,
-- NULL when not running) — see pickleballMatchTimer.js. A write only
-- happens on an explicit Start/Resume/Pause/Reset click, a handful of
-- writes over a match's whole lifetime, not hundreds.
--
-- duration_seconds defaults to 900 (15:00) but is a real per-row column,
-- not a hardcoded constant, so a different default or a per-match override
-- can be added later without a schema change.
--
-- tournament_id is denormalized from the match (rather than requiring a
-- join through pickleball_matches for RLS/Realtime filtering) — the same
-- convention pickleball_gallery_photos and every other pickleball_* table
-- already uses for its own tournament_id column.
--
-- RLS mirrors every other pickleball_* table exactly: public read (guests
-- watch the timer live, read-only), superadmin-only write — this is the
-- actual enforcement of "Guests cannot modify timer state"; the UI also
-- hides the Start/Pause/Reset controls from non-superadmins, but that's a
-- convenience, not the security boundary.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pickleball_match_timers (
  match_id          UUID        PRIMARY KEY REFERENCES pickleball_matches(id) ON DELETE CASCADE,
  tournament_id     UUID        NOT NULL REFERENCES pickleball_tournaments(id) ON DELETE CASCADE,
  duration_seconds  INTEGER     NOT NULL DEFAULT 900 CHECK (duration_seconds > 0),
  status            TEXT        NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused')),
  started_at        TIMESTAMPTZ,
  remaining_seconds INTEGER     NOT NULL DEFAULT 900 CHECK (remaining_seconds >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pb_match_timers_tournament ON pickleball_match_timers(tournament_id);

ALTER TABLE pickleball_match_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_match_timers_select" ON pickleball_match_timers
  FOR SELECT USING (true);

CREATE POLICY "pb_match_timers_insert" ON pickleball_match_timers
  FOR INSERT TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "pb_match_timers_update" ON pickleball_match_timers
  FOR UPDATE TO authenticated
  USING (is_superadmin());

CREATE POLICY "pb_match_timers_delete" ON pickleball_match_timers
  FOR DELETE TO authenticated
  USING (is_superadmin());

ALTER PUBLICATION supabase_realtime ADD TABLE pickleball_match_timers;
