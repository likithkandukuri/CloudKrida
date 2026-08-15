-- ─────────────────────────────────────────────────────────────────────────────
-- Fixes a real gap found while walking through the "a new team joins after
-- pools/schedule already exist" scenario: move_pickleball_entrant_to_pool
-- (013) required the entrant to already belong to a pool. A brand-new
-- entrant added via "+ Add Entrant" after pools were generated has
-- pool_id IS NULL, so it hit "Entrant is not currently assigned to a pool"
-- and had no way to ever be placed into a pool short of "Reset Pools" (which
-- destroys every recorded score across ALL pools) followed by "Generate
-- Pools" again.
--
-- This CREATE OR REPLACEs the same function, only removing the
-- "v_old_pool_id IS NULL" precondition — the rest of the function already
-- behaves correctly for a NULL old pool without change: `pool_id = NULL`
-- and `v_old_pool_id = p_target_pool_id` both evaluate to NULL (falsy) in
-- SQL, so the "already in that pool" check and the "delete old unscored
-- matches" step are natural no-ops when there was no old pool. The new
-- entrant still gets round-robined against every other active entrant
-- already in the target pool, exactly like an inter-pool move does.
--
-- Not a Track B (008-012) file; not modifying 013's already-applied
-- behavior in place — relaxing one precondition via CREATE OR REPLACE in a
-- new migration, the same "ship a new file, don't edit an applied one"
-- convention this project already follows (017 alongside 013).
--
-- Rollback (manual, not auto-applied): re-apply 013_pickleball_pool_move.sql
-- verbatim to restore the original precondition.
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

  -- Drop this entrant's unscored pool matches in their old pool (no-op when
  -- v_old_pool_id IS NULL, i.e. the entrant had no pool yet)
  DELETE FROM pickleball_matches
    WHERE phase = 'pool' AND pool_id = v_old_pool_id
      AND (entrant1_id = p_entrant_id OR entrant2_id = p_entrant_id);

  UPDATE pickleball_entrants SET pool_id = p_target_pool_id, updated_at = now() WHERE id = p_entrant_id;

  -- Round-robin the moved/newly-assigned entrant against every other active
  -- entrant already in the target pool (withdrawn entrants are excluded,
  -- matching generatePoolAssignments' own convention).
  INSERT INTO pickleball_matches (tournament_id, pool_id, phase, round, slot, entrant1_id, entrant2_id, status, games)
  SELECT v_tournament_id, p_target_pool_id, 'pool', 0, row_number() OVER (), p_entrant_id, e.id, 'pending', '[]'::jsonb
  FROM pickleball_entrants e
  WHERE e.pool_id = p_target_pool_id AND e.id <> p_entrant_id AND e.status <> 'withdrawn';
END;
$$;

REVOKE EXECUTE ON FUNCTION move_pickleball_entrant_to_pool(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION move_pickleball_entrant_to_pool(UUID, UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION move_pickleball_entrant_to_pool(UUID, UUID) TO authenticated;
