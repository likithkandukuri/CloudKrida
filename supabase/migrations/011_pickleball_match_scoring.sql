-- ─────────────────────────────────────────────────────────────────────────────
-- Track B Phase 4 — Live score entry, plus the elimination-bracket
-- advancement that Phase 5 needs on top of it.
--
-- Recording a score is, by itself, a single-row UPDATE (already atomic at
-- the row level) — no RPC would be strictly required for that alone. But
-- once a phase='elimination' match completes, its winner also needs to be
-- placed into the next round's match (a second, dependent row write), and
-- that pair of writes must succeed or fail together — the same reasoning
-- that put pool generation behind an RPC in migration 009. Pool-phase
-- matches simply skip the advancement step (a no-op), so one function
-- serves both Phase 4 (pools) and Phase 5 (bracket) scoring.
--
-- Business logic (what counts as a completed game/match under the
-- tournament's gamesTo/winBy2/bestOf) lives in pickleballScoring.js, not
-- here — this function only applies an already-computed result and re-checks
-- authorization explicitly (SECURITY INVOKER + RLS still applies to the
-- UPDATEs themselves, but a plain UPDATE gives a silent 0-row no-op for an
-- unauthorized caller rather than a clear error, so an explicit
-- is_superadmin() check up front gives a real error instead).
--
-- SECURITY INVOKER, EXECUTE restricted to `authenticated` only (not anon,
-- not PUBLIC) — same pattern as migrations 009/010, learned from the anon
-- grant gap found during Phase 2's live verification.
--
-- Rollback (manual, not auto-applied):
--   DROP FUNCTION IF EXISTS record_pickleball_match_score(UUID, JSONB, TEXT, UUID);
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_pickleball_match_score(
  p_match_id           UUID,
  p_games              JSONB,
  p_status             TEXT,
  p_winner_entrant_id  UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tournament_id UUID;
  v_phase         TEXT;
  v_round         INTEGER;
  v_slot          INTEGER;
  v_parent_id     UUID;
  v_parent_games  JSONB;
  v_parent_status TEXT;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to record match scores';
  END IF;

  SELECT tournament_id, phase, round, slot INTO v_tournament_id, v_phase, v_round, v_slot
    FROM pickleball_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % not found', p_match_id;
  END IF;

  UPDATE pickleball_matches
    SET games             = p_games,
        status            = p_status,
        winner_entrant_id = p_winner_entrant_id,
        completed_at      = CASE WHEN p_status = 'complete' THEN now() ELSE NULL END,
        updated_at        = now()
    WHERE id = p_match_id;

  -- Elimination advancement: place the winner into the parent match's seat.
  -- Blocked if the parent has already started, so correcting an earlier
  -- round's result (scores stay always-editable by design) can never
  -- silently overwrite an already-decided later round.
  IF v_phase = 'elimination' AND p_status = 'complete' THEN
    SELECT id, games, status INTO v_parent_id, v_parent_games, v_parent_status
      FROM pickleball_matches
      WHERE tournament_id = v_tournament_id AND phase = 'elimination'
        AND round = v_round + 1 AND slot = v_slot / 2;

    IF v_parent_id IS NOT NULL THEN
      IF v_parent_games <> '[]'::jsonb OR v_parent_status = 'complete' THEN
        RAISE EXCEPTION 'Cannot advance winner: the next-round match has already started';
      END IF;

      IF v_slot % 2 = 0 THEN
        UPDATE pickleball_matches SET entrant1_id = p_winner_entrant_id, updated_at = now() WHERE id = v_parent_id;
      ELSE
        UPDATE pickleball_matches SET entrant2_id = p_winner_entrant_id, updated_at = now() WHERE id = v_parent_id;
      END IF;
    END IF;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION record_pickleball_match_score(UUID, JSONB, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_pickleball_match_score(UUID, JSONB, TEXT, UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION record_pickleball_match_score(UUID, JSONB, TEXT, UUID) TO authenticated;
