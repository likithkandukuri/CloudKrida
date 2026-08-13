-- ─────────────────────────────────────────────────────────────────────────────
-- Track B, Phase 2 — Pools: atomic generate/reset RPC functions
--
-- Pool generation is four logically-dependent writes (clear old state if
-- regenerating -> create pools -> assign entrants -> create matches). Doing
-- this as sequential client-side calls (Phase 1's createPickleballEntrant
-- pattern) can't cover every partial-failure case, so both operations here
-- run as a single Postgres function call instead — one transaction, and any
-- RAISE EXCEPTION rolls back everything the function did, automatically.
--
-- SECURITY INVOKER (the default, stated explicitly): these functions carry no
-- elevated privileges of their own. Every INSERT/UPDATE/DELETE inside still
-- runs as the calling user and is still checked against the exact same
-- is_superadmin()-gated RLS policies from 005_pickleball_schema.sql
-- (pb_pools_insert/delete, pb_entrants_update, pb_matches_insert/delete) — a
-- non-superadmin calling these RPCs gets rejected exactly as if they'd called
-- the tables directly. EXECUTE is additionally restricted to `authenticated`
-- below, mirroring the `TO authenticated` scoping already used on every
-- write policy in 005 — anon is refused before RLS even has to filter rows.
--
-- Rollback (manual, not auto-applied):
--   DROP FUNCTION IF EXISTS generate_pickleball_pools(UUID, INTEGER, JSONB, JSONB, BOOLEAN);
--   DROP FUNCTION IF EXISTS reset_pickleball_pools(UUID);
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_pickleball_pools(
  p_tournament_id     UUID,
  p_pool_size         INTEGER,
  p_pools             JSONB,              -- [{label, entrant_ids: [uuid, ...]}, ...]
  p_matches           JSONB,              -- [{pool_label, entrant1_id, entrant2_id}, ...]
  p_force_regenerate  BOOLEAN DEFAULT false
) RETURNS SETOF pickleball_pools
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_configured_size INTEGER;
  v_scored_count    INTEGER;
  v_pool            RECORD;
  v_new_pool_id     UUID;
  v_label_to_id     JSONB := '{}'::jsonb;
  v_slot            INTEGER := 0;
BEGIN
  -- tournament.pool_size is authoritative — re-checked here, not trusted from the client
  SELECT pool_size INTO v_configured_size FROM pickleball_tournaments WHERE id = p_tournament_id;
  IF v_configured_size IS DISTINCT FROM p_pool_size THEN
    RAISE EXCEPTION 'pool_size mismatch: tournament is configured as %, generation requested %',
      v_configured_size, p_pool_size;
  END IF;

  -- Block if any pool match already has results
  SELECT count(*) INTO v_scored_count FROM pickleball_matches
    WHERE tournament_id = p_tournament_id AND phase = 'pool'
      AND (games <> '[]'::jsonb OR status = 'complete');
  IF v_scored_count > 0 THEN
    RAISE EXCEPTION 'Cannot generate pools: % pool match(es) already have results', v_scored_count;
  END IF;

  -- Regenerating an unscored, already-existing configuration requires the explicit flag
  IF EXISTS (SELECT 1 FROM pickleball_pools WHERE tournament_id = p_tournament_id) AND NOT p_force_regenerate THEN
    RAISE EXCEPTION 'Pools already exist for this tournament; pass force_regenerate to replace them';
  END IF;

  -- Clear any existing (already confirmed unscored) configuration before rebuilding.
  -- Entrant pool_id is cleared for every entrant in the tournament, including withdrawn
  -- ones — regeneration only ever reaches this point pre-scoring, so there is no
  -- meaningful "history" being lost (see pickleballPools.js header comment).
  DELETE FROM pickleball_matches WHERE tournament_id = p_tournament_id AND phase = 'pool';
  UPDATE pickleball_entrants SET pool_id = NULL WHERE tournament_id = p_tournament_id;
  DELETE FROM pickleball_pools WHERE tournament_id = p_tournament_id;

  FOR v_pool IN SELECT * FROM jsonb_to_recordset(p_pools) AS x(label TEXT, entrant_ids UUID[])
  LOOP
    INSERT INTO pickleball_pools (tournament_id, label) VALUES (p_tournament_id, v_pool.label)
      RETURNING id INTO v_new_pool_id;
    v_label_to_id := v_label_to_id || jsonb_build_object(v_pool.label, v_new_pool_id);
    UPDATE pickleball_entrants SET pool_id = v_new_pool_id WHERE id = ANY(v_pool.entrant_ids);
  END LOOP;

  INSERT INTO pickleball_matches (tournament_id, pool_id, phase, round, slot, entrant1_id, entrant2_id, status, games)
  SELECT p_tournament_id, (v_label_to_id ->> (m->>'pool_label'))::uuid, 'pool', 0,
         row_number() OVER () - 1,
         (m->>'entrant1_id')::uuid, (m->>'entrant2_id')::uuid, 'pending', '[]'::jsonb
  FROM jsonb_array_elements(p_matches) AS m;

  RETURN QUERY SELECT * FROM pickleball_pools WHERE tournament_id = p_tournament_id;
END;
$$;

CREATE OR REPLACE FUNCTION reset_pickleball_pools(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM pickleball_matches WHERE tournament_id = p_tournament_id AND phase = 'pool';
  UPDATE pickleball_entrants SET pool_id = NULL WHERE tournament_id = p_tournament_id;
  DELETE FROM pickleball_pools WHERE tournament_id = p_tournament_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_pickleball_pools(UUID, INTEGER, JSONB, JSONB, BOOLEAN) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION generate_pickleball_pools(UUID, INTEGER, JSONB, JSONB, BOOLEAN) TO authenticated;

REVOKE EXECUTE ON FUNCTION reset_pickleball_pools(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION reset_pickleball_pools(UUID) TO authenticated;
