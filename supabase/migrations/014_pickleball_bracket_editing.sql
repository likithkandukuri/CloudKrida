-- ─────────────────────────────────────────────────────────────────────────────
-- New work (post-Track-B) — granular bracket-editing capabilities matching
-- the level of control Chess's pairing editor offers (swap, lock, bye
-- assign/remove), built as brand-new functions for Pickleball's own match
-- shape. None of these functions modify, replace, or call
-- record_pickleball_match_score (migration 011) or any other Track B
-- function — each duplicates the small "advance winner into parent seat"
-- block it needs rather than touching the existing frozen function, per the
-- explicit instruction to keep every Track B migration untouched.
--
-- Lock/unlock itself needs no RPC — `locked` is a plain boolean column
-- already covered by the existing pb_matches_update RLS policy
-- (is_superadmin()) from migration 005, so the client can update it directly.
--
-- SECURITY INVOKER + explicit is_superadmin() check + EXECUTE restricted to
-- `authenticated` only (not PUBLIC, not anon) — same pattern as every prior
-- Pickleball RPC.
--
-- Rollback (manual, not auto-applied):
--   DROP FUNCTION IF EXISTS swap_pickleball_bracket_entrants(UUID, INTEGER, UUID, INTEGER);
--   DROP FUNCTION IF EXISTS assign_pickleball_match_bye(UUID, UUID);
--   DROP FUNCTION IF EXISTS remove_pickleball_match_bye(UUID);
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Swap two entrants between two pending, unlocked bracket matches ────────
CREATE OR REPLACE FUNCTION swap_pickleball_bracket_entrants(
  p_match1_id UUID,
  p_seat1     INTEGER,  -- 1 or 2
  p_match2_id UUID,
  p_seat2     INTEGER   -- 1 or 2
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v1 RECORD;
  v2 RECORD;
  v_entrant1 UUID;
  v_entrant2 UUID;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to edit the bracket';
  END IF;
  IF p_seat1 NOT IN (1, 2) OR p_seat2 NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Seat must be 1 or 2';
  END IF;
  IF p_match1_id = p_match2_id THEN
    RAISE EXCEPTION 'Cannot swap a match with itself';
  END IF;

  SELECT * INTO v1 FROM pickleball_matches WHERE id = p_match1_id;
  SELECT * INTO v2 FROM pickleball_matches WHERE id = p_match2_id;
  IF v1.id IS NULL OR v2.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v1.phase <> 'elimination' OR v2.phase <> 'elimination' THEN
    RAISE EXCEPTION 'Both matches must be part of the bracket';
  END IF;
  IF v1.status <> 'pending' OR v2.status <> 'pending' THEN
    RAISE EXCEPTION 'Both matches must be unscored to swap entrants';
  END IF;
  IF v1.locked OR v2.locked THEN
    RAISE EXCEPTION 'Both matches must be unlocked to swap entrants';
  END IF;

  v_entrant1 := CASE WHEN p_seat1 = 1 THEN v1.entrant1_id ELSE v1.entrant2_id END;
  v_entrant2 := CASE WHEN p_seat2 = 1 THEN v2.entrant1_id ELSE v2.entrant2_id END;

  IF p_seat1 = 1 THEN
    UPDATE pickleball_matches SET entrant1_id = v_entrant2, updated_at = now() WHERE id = p_match1_id;
  ELSE
    UPDATE pickleball_matches SET entrant2_id = v_entrant2, updated_at = now() WHERE id = p_match1_id;
  END IF;

  IF p_seat2 = 1 THEN
    UPDATE pickleball_matches SET entrant1_id = v_entrant1, updated_at = now() WHERE id = p_match2_id;
  ELSE
    UPDATE pickleball_matches SET entrant2_id = v_entrant1, updated_at = now() WHERE id = p_match2_id;
  END IF;
END;
$$;

-- ── Manually force a bye win on a pending, unlocked bracket match ─────────
CREATE OR REPLACE FUNCTION assign_pickleball_match_bye(
  p_match_id          UUID,
  p_winner_entrant_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_match         RECORD;
  v_parent_id     UUID;
  v_parent_games  JSONB;
  v_parent_status TEXT;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to edit the bracket';
  END IF;

  SELECT * INTO v_match FROM pickleball_matches WHERE id = p_match_id;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.phase <> 'elimination' THEN
    RAISE EXCEPTION 'Byes can only be assigned on bracket matches';
  END IF;
  IF v_match.status <> 'pending' THEN
    RAISE EXCEPTION 'This match already has a result';
  END IF;
  IF v_match.locked THEN
    RAISE EXCEPTION 'This match is locked';
  END IF;
  IF p_winner_entrant_id IS DISTINCT FROM v_match.entrant1_id AND p_winner_entrant_id IS DISTINCT FROM v_match.entrant2_id THEN
    RAISE EXCEPTION 'The chosen winner is not seated in this match';
  END IF;

  UPDATE pickleball_matches
    SET status = 'bye', winner_entrant_id = p_winner_entrant_id, games = '[]'::jsonb,
        completed_at = now(), updated_at = now()
    WHERE id = p_match_id;

  -- Advance into the parent match, same rule as record_pickleball_match_score
  -- (011): blocked if the parent has already started.
  SELECT id, games, status INTO v_parent_id, v_parent_games, v_parent_status
    FROM pickleball_matches
    WHERE tournament_id = v_match.tournament_id AND phase = 'elimination'
      AND round = v_match.round + 1 AND slot = v_match.slot / 2;

  IF v_parent_id IS NOT NULL THEN
    IF v_parent_games <> '[]'::jsonb OR v_parent_status = 'complete' THEN
      RAISE EXCEPTION 'Cannot advance winner: the next-round match has already started';
    END IF;
    IF v_match.slot % 2 = 0 THEN
      UPDATE pickleball_matches SET entrant1_id = p_winner_entrant_id, updated_at = now() WHERE id = v_parent_id;
    ELSE
      UPDATE pickleball_matches SET entrant2_id = p_winner_entrant_id, updated_at = now() WHERE id = v_parent_id;
    END IF;
  END IF;
END;
$$;

-- ── Revert a manually- or generation-assigned bye back to pending ─────────
CREATE OR REPLACE FUNCTION remove_pickleball_match_bye(
  p_match_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_match         RECORD;
  v_parent_id     UUID;
  v_parent_games  JSONB;
  v_parent_status TEXT;
  v_parent_seat_entrant UUID;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to edit the bracket';
  END IF;

  SELECT * INTO v_match FROM pickleball_matches WHERE id = p_match_id;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'bye' THEN
    RAISE EXCEPTION 'This match is not currently a bye';
  END IF;

  SELECT id, games, status,
         CASE WHEN v_match.slot % 2 = 0 THEN entrant1_id ELSE entrant2_id END
    INTO v_parent_id, v_parent_games, v_parent_status, v_parent_seat_entrant
    FROM pickleball_matches
    WHERE tournament_id = v_match.tournament_id AND phase = 'elimination'
      AND round = v_match.round + 1 AND slot = v_match.slot / 2;

  IF v_parent_id IS NOT NULL THEN
    IF v_parent_games <> '[]'::jsonb OR v_parent_status = 'complete' THEN
      RAISE EXCEPTION 'Cannot undo bye: the next-round match has already started';
    END IF;
    -- Only clear the parent seat if it still holds the winner this bye placed there
    IF v_parent_seat_entrant = v_match.winner_entrant_id THEN
      IF v_match.slot % 2 = 0 THEN
        UPDATE pickleball_matches SET entrant1_id = NULL, updated_at = now() WHERE id = v_parent_id;
      ELSE
        UPDATE pickleball_matches SET entrant2_id = NULL, updated_at = now() WHERE id = v_parent_id;
      END IF;
    END IF;
  END IF;

  UPDATE pickleball_matches
    SET status = 'pending', winner_entrant_id = NULL, completed_at = NULL, updated_at = now()
    WHERE id = p_match_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION swap_pickleball_bracket_entrants(UUID, INTEGER, UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION swap_pickleball_bracket_entrants(UUID, INTEGER, UUID, INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION swap_pickleball_bracket_entrants(UUID, INTEGER, UUID, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION assign_pickleball_match_bye(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION assign_pickleball_match_bye(UUID, UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION assign_pickleball_match_bye(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION remove_pickleball_match_bye(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION remove_pickleball_match_bye(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION remove_pickleball_match_bye(UUID) TO authenticated;
