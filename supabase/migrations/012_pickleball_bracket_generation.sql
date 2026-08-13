-- ─────────────────────────────────────────────────────────────────────────────
-- Track B Phase 5 — elimination bracket generation from pool standings.
--
-- Same atomic-RPC shape as generate_pickleball_pools (migration 009): seed
-- placement/bye math is computed in JS (pickleballBracket.js, fully
-- unit-testable) and passed in as an already-fully-formed row plan; this
-- function only re-validates what only the database can see authoritatively
-- (pool play actually complete, no existing scored bracket) and applies the
-- plan atomically. No separate "brackets" table exists — elimination matches
-- are just phase='elimination' rows on the existing pickleball_matches table.
--
-- SECURITY INVOKER + explicit is_superadmin() check + EXECUTE restricted to
-- `authenticated` only (not PUBLIC, not anon) — same pattern established in
-- migrations 009-011.
--
-- Rollback (manual, not auto-applied):
--   DROP FUNCTION IF EXISTS generate_pickleball_bracket(UUID, JSONB, BOOLEAN);
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_pickleball_bracket(
  p_tournament_id     UUID,
  p_rows              JSONB,   -- [{round, slot, entrant1_id, entrant2_id, status, winner_entrant_id}, ...]
  p_force_regenerate  BOOLEAN DEFAULT false
) RETURNS SETOF pickleball_matches
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_incomplete_pools INTEGER;
  v_scored_elim      INTEGER;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to generate the bracket';
  END IF;

  -- Pool play must be finished before seeding off of it
  SELECT count(*) INTO v_incomplete_pools FROM pickleball_matches
    WHERE tournament_id = p_tournament_id AND phase = 'pool' AND status NOT IN ('complete', 'bye');
  IF v_incomplete_pools > 0 THEN
    RAISE EXCEPTION 'Cannot generate bracket: % pool match(es) still need a result', v_incomplete_pools;
  END IF;

  -- Block if any existing elimination match already has results
  SELECT count(*) INTO v_scored_elim FROM pickleball_matches
    WHERE tournament_id = p_tournament_id AND phase = 'elimination'
      AND (games <> '[]'::jsonb OR status = 'complete');
  IF v_scored_elim > 0 THEN
    RAISE EXCEPTION 'Cannot generate bracket: % elimination match(es) already have results', v_scored_elim;
  END IF;

  -- Regenerating an unscored, already-existing bracket requires the explicit flag
  IF EXISTS (SELECT 1 FROM pickleball_matches WHERE tournament_id = p_tournament_id AND phase = 'elimination')
     AND NOT p_force_regenerate THEN
    RAISE EXCEPTION 'A bracket already exists for this tournament; pass force_regenerate to replace it';
  END IF;

  DELETE FROM pickleball_matches WHERE tournament_id = p_tournament_id AND phase = 'elimination';

  INSERT INTO pickleball_matches
    (tournament_id, phase, round, slot, entrant1_id, entrant2_id, status, winner_entrant_id, games, completed_at)
  SELECT
    p_tournament_id, 'elimination',
    (r->>'round')::int, (r->>'slot')::int,
    (r->>'entrant1_id')::uuid, (r->>'entrant2_id')::uuid,
    r->>'status',
    (r->>'winner_entrant_id')::uuid,
    '[]'::jsonb,
    CASE WHEN r->>'status' = 'bye' THEN now() ELSE NULL END
  FROM jsonb_array_elements(p_rows) AS r;

  RETURN QUERY SELECT * FROM pickleball_matches
    WHERE tournament_id = p_tournament_id AND phase = 'elimination';
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_pickleball_bracket(UUID, JSONB, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_pickleball_bracket(UUID, JSONB, BOOLEAN) FROM anon;
GRANT  EXECUTE ON FUNCTION generate_pickleball_bracket(UUID, JSONB, BOOLEAN) TO authenticated;
