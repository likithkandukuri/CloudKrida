-- ─────────────────────────────────────────────────────────────────────────────
-- Pickleball PDF Importer — Tournament Timing & Schedule
--
-- Five new nullable columns on pickleball_tournaments, additive (covered by
-- the existing "pb_tournaments_*" RLS from 005 — no policy changes needed,
-- same as advancement_mapping/imported_rules in 017):
--   start_at, end_at, check_in_at, registration_deadline_at — TIMESTAMPTZ,
--     absolute instants (already zone-resolved at import time; see
--     pickleballTime.js / pickleballImportMapping.js). Match/round-level
--     timing already exists (pickleball_matches.scheduled_at, migration
--     005) — no new match-table column is needed; "round" timing is
--     derived client-side by grouping matches on identical scheduled_at.
--   time_zone — IANA name (e.g. "America/Los_Angeles"), the single zone the
--     whole tournament runs in. Only set when the document actually states
--     it; every timing field is stored NULL when the source PDF doesn't
--     mention it (never invented).
--
-- venue is NOT a new column — pickleball_tournaments.location (007) already
-- serves that purpose and the importer already maps into it.
--
-- import_pickleball_tournament(...) keeps its existing 6-parameter
-- signature (no caller needs to change) — this CREATE OR REPLACEs the body
-- only to also read 5 new *optional* keys off the same p_tournament JSONB
-- object, defaulting to NULL exactly like pool_size/skill_division already
-- do. 017/018 are not edited, per this project's established convention of
-- shipping a new migration file rather than modifying an already-applied
-- one.
--
-- Rollback (manual, not auto-applied):
--   ALTER TABLE pickleball_tournaments
--     DROP COLUMN IF EXISTS start_at,
--     DROP COLUMN IF EXISTS end_at,
--     DROP COLUMN IF EXISTS check_in_at,
--     DROP COLUMN IF EXISTS registration_deadline_at,
--     DROP COLUMN IF EXISTS time_zone;
--   (then re-apply 017_pickleball_import.sql's CREATE OR REPLACE verbatim
--    to restore the function's prior body)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pickleball_tournaments
  ADD COLUMN IF NOT EXISTS start_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at                   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_deadline_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_zone                 TEXT;

CREATE OR REPLACE FUNCTION import_pickleball_tournament(
  p_tournament  JSONB,  -- {..., start_at, end_at, check_in_at, registration_deadline_at, time_zone}
  p_players     JSONB,
  p_entrants    JSONB,
  p_courts      JSONB,
  p_pools       JSONB,
  p_matches     JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tournament_id UUID;
  v_player        RECORD;
  v_player_id     UUID;
  v_player_map    JSONB := '{}'::jsonb;
  v_entrant       RECORD;
  v_entrant_id    UUID;
  v_entrant_map   JSONB := '{}'::jsonb;
  v_court         RECORD;
  v_court_id      UUID;
  v_court_map     JSONB := '{}'::jsonb;
  v_pool          RECORD;
  v_pool_id       UUID;
  v_pool_map      JSONB := '{}'::jsonb;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Not authorized to import a tournament';
  END IF;

  IF p_tournament->>'name' IS NULL OR trim(p_tournament->>'name') = '' THEN
    RAISE EXCEPTION 'Tournament name is required';
  END IF;
  IF jsonb_array_length(COALESCE(p_entrants, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one entrant is required to import a tournament';
  END IF;

  -- 1. Tournament — 'registration_closed' rather than the table's own default
  -- ('registration_open'): an imported tournament already has its full roster
  -- and schedule from the document, it isn't accepting new signups. The
  -- superadmin can change status afterward through the normal edit form
  -- exactly like any other tournament.
  INSERT INTO pickleball_tournaments (
    name, event_type, format, status, date, location, description,
    games_to, win_by_2, best_of, pool_size, court_count, skill_division, age_band,
    advancement_mapping, imported_rules,
    start_at, end_at, check_in_at, registration_deadline_at, time_zone
  ) VALUES (
    trim(p_tournament->>'name'),
    p_tournament->>'event_type',
    COALESCE(p_tournament->>'format', 'pool_to_single_elim'),
    'registration_closed',
    NULLIF(p_tournament->>'date', '')::date,
    p_tournament->>'location',
    p_tournament->>'description',
    COALESCE((p_tournament->>'games_to')::int, 11),
    COALESCE((p_tournament->>'win_by_2')::boolean, true),
    COALESCE((p_tournament->>'best_of')::int, 3),
    NULLIF(p_tournament->>'pool_size', '')::int,
    NULLIF(p_tournament->>'court_count', '')::int,
    p_tournament->>'skill_division',
    p_tournament->>'age_band',
    p_tournament->'advancement_mapping',
    p_tournament->'imported_rules',
    NULLIF(p_tournament->>'start_at', '')::timestamptz,
    NULLIF(p_tournament->>'end_at', '')::timestamptz,
    NULLIF(p_tournament->>'check_in_at', '')::timestamptz,
    NULLIF(p_tournament->>'registration_deadline_at', '')::timestamptz,
    NULLIF(p_tournament->>'time_zone', '')
  ) RETURNING id INTO v_tournament_id;

  -- 2. Players — exact trimmed-name match reuses an existing player; otherwise create one.
  FOR v_player IN SELECT * FROM jsonb_to_recordset(COALESCE(p_players, '[]'::jsonb)) AS x(temp_id TEXT, name TEXT)
  LOOP
    SELECT id INTO v_player_id FROM pickleball_players
      WHERE lower(trim(name)) = lower(trim(v_player.name)) LIMIT 1;
    IF v_player_id IS NULL THEN
      INSERT INTO pickleball_players (name) VALUES (trim(v_player.name)) RETURNING id INTO v_player_id;
    END IF;
    v_player_map := v_player_map || jsonb_build_object(v_player.temp_id, v_player_id);
  END LOOP;

  -- 3. Entrants + their member(s) — seat number is the 1-based position within member_temp_ids.
  FOR v_entrant IN
    SELECT * FROM jsonb_to_recordset(p_entrants)
      AS x(temp_id TEXT, display_name TEXT, seed_order INT, member_temp_ids JSONB)
  LOOP
    INSERT INTO pickleball_entrants (tournament_id, display_name, seed_order)
      VALUES (v_tournament_id, v_entrant.display_name, COALESCE(v_entrant.seed_order, 0))
      RETURNING id INTO v_entrant_id;
    v_entrant_map := v_entrant_map || jsonb_build_object(v_entrant.temp_id, v_entrant_id);

    INSERT INTO pickleball_entrant_members (entrant_id, player_id, seat)
      SELECT v_entrant_id, (v_player_map ->> elem)::uuid, ord
      FROM jsonb_array_elements_text(COALESCE(v_entrant.member_temp_ids, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord);
  END LOOP;

  -- 4. Courts (tournament-scoped, always freshly created for a new import).
  FOR v_court IN SELECT * FROM jsonb_to_recordset(COALESCE(p_courts, '[]'::jsonb)) AS x(temp_id TEXT, label TEXT)
  LOOP
    INSERT INTO pickleball_courts (tournament_id, label) VALUES (v_tournament_id, v_court.label)
      RETURNING id INTO v_court_id;
    v_court_map := v_court_map || jsonb_build_object(v_court.temp_id, v_court_id);
  END LOOP;

  -- 5. Pools, and assign each pool's entrants to it.
  FOR v_pool IN SELECT * FROM jsonb_to_recordset(COALESCE(p_pools, '[]'::jsonb)) AS x(temp_id TEXT, label TEXT, entrant_temp_ids JSONB)
  LOOP
    INSERT INTO pickleball_pools (tournament_id, label) VALUES (v_tournament_id, v_pool.label)
      RETURNING id INTO v_pool_id;
    v_pool_map := v_pool_map || jsonb_build_object(v_pool.temp_id, v_pool_id);

    UPDATE pickleball_entrants SET pool_id = v_pool_id
      WHERE id IN (
        SELECT (v_entrant_map ->> elem)::uuid
        FROM jsonb_array_elements_text(COALESCE(v_pool.entrant_temp_ids, '[]'::jsonb)) AS elem
      );
  END LOOP;

  -- 6. Matches — exactly as printed in the document: real court + real
  -- scheduled_at per match, not auto-generated round-robin pairing.
  INSERT INTO pickleball_matches (tournament_id, pool_id, phase, round, slot, entrant1_id, entrant2_id, court_id, scheduled_at, status, games)
  SELECT
    v_tournament_id,
    (v_pool_map ->> (m->>'pool_temp_id'))::uuid,
    'pool', 0,
    row_number() OVER () - 1,
    (v_entrant_map ->> (m->>'entrant1_temp_id'))::uuid,
    (v_entrant_map ->> (m->>'entrant2_temp_id'))::uuid,
    (v_court_map ->> (m->>'court_temp_id'))::uuid,
    NULLIF(m->>'scheduled_at', '')::timestamptz,
    'pending', '[]'::jsonb
  FROM jsonb_array_elements(COALESCE(p_matches, '[]'::jsonb)) AS m;

  RETURN v_tournament_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION import_pickleball_tournament(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION import_pickleball_tournament(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB) FROM anon;
GRANT  EXECUTE ON FUNCTION import_pickleball_tournament(JSONB, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;
