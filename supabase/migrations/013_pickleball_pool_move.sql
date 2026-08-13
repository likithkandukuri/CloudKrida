-- ─────────────────────────────────────────────────────────────────────────────
-- New work (post-Track-B) — move a single entrant into a different
-- already-generated pool, without a full pool regenerate. Regenerate
-- recomputes every entrant's placement from scratch; this fills the gap of
-- correcting one entrant's placement in isolation.
--
-- This is a brand-new function in a brand-new migration file — Track B's
-- migrations (008-012) and the functions they define are not modified,
-- edited, or replaced by this file, per the explicit instruction to keep
-- Track B frozen.
--
-- SECURITY INVOKER + explicit is_superadmin() check + EXECUTE restricted to
-- `authenticated` only (not PUBLIC, not anon) — same pattern as migrations
-- 009-012, including the anon-exclusion fix learned during Track B.
--
-- Rollback (manual, not auto-applied):
--   DROP FUNCTION IF EXISTS move_pickleball_entrant_to_pool(UUID, UUID);
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION move_pickleball_entrant_to_pool(
  p_entrant_id     UUID,
  p_target_pool_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tournament_id UUID;
  v_old_pool_id   UUID;
  v_scored_old    INTEGER;
  v_scored_target INTEGER;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to move entrants between pools';
  END IF;

  SELECT tournament_id, pool_id INTO v_tournament_id, v_old_pool_id
    FROM pickleball_entrants WHERE id = p_entrant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrant % not found', p_entrant_id;
  END IF;
  IF v_old_pool_id IS NULL THEN
    RAISE EXCEPTION 'Entrant is not currently assigned to a pool';
  END IF;
  IF v_old_pool_id = p_target_pool_id THEN
    RAISE EXCEPTION 'Entrant is already in that pool';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pickleball_pools WHERE id = p_target_pool_id AND tournament_id = v_tournament_id) THEN
    RAISE EXCEPTION 'Target pool does not belong to this entrant''s tournament';
  END IF;

  SELECT count(*) INTO v_scored_old FROM pickleball_matches
    WHERE phase = 'pool' AND pool_id = v_old_pool_id
      AND (entrant1_id = p_entrant_id OR entrant2_id = p_entrant_id)
      AND (games <> '[]'::jsonb OR status = 'complete');
  IF v_scored_old > 0 THEN
    RAISE EXCEPTION 'Cannot move: this entrant already has a scored match in their current pool';
  END IF;

  SELECT count(*) INTO v_scored_target FROM pickleball_matches
    WHERE phase = 'pool' AND pool_id = p_target_pool_id
      AND (games <> '[]'::jsonb OR status = 'complete');
  IF v_scored_target > 0 THEN
    RAISE EXCEPTION 'Cannot move: the target pool already has scored matches';
  END IF;

  -- Drop this entrant's unscored pool matches in their old pool
  DELETE FROM pickleball_matches
    WHERE phase = 'pool' AND pool_id = v_old_pool_id
      AND (entrant1_id = p_entrant_id OR entrant2_id = p_entrant_id);

  UPDATE pickleball_entrants SET pool_id = p_target_pool_id, updated_at = now() WHERE id = p_entrant_id;

  -- Round-robin the moved entrant against every other active entrant already
  -- in the target pool (withdrawn entrants are excluded, matching
  -- generatePoolAssignments' own convention).
  INSERT INTO pickleball_matches (tournament_id, pool_id, phase, round, slot, entrant1_id, entrant2_id, status, games)
  SELECT v_tournament_id, p_target_pool_id, 'pool', 0, row_number() OVER (), p_entrant_id, e.id, 'pending', '[]'::jsonb
  FROM pickleball_entrants e
  WHERE e.pool_id = p_target_pool_id AND e.id <> p_entrant_id AND e.status <> 'withdrawn';
END;
$$;

REVOKE EXECUTE ON FUNCTION move_pickleball_entrant_to_pool(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION move_pickleball_entrant_to_pool(UUID, UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION move_pickleball_entrant_to_pool(UUID, UUID) TO authenticated;
