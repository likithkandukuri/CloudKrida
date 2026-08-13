-- ─────────────────────────────────────────────────────────────────────────────
-- Track B, Phase 2 — Pools: entrant → pool assignment
--
-- Additive only. An entrant belongs to at most one pool at a time (matches
-- the medium-normalization approach already used for pickleball_entrant_members
-- — a join table only where an entrant genuinely has multiple related rows).
-- No new RLS policy is needed: pickleball_entrants already has an
-- is_superadmin()-gated UPDATE policy (pb_entrants_update, from 005) that
-- covers any column, including this new one.
--
-- Rollback (manual, not auto-applied):
--   ALTER TABLE pickleball_entrants DROP COLUMN IF EXISTS pool_id;
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pickleball_entrants
  ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES pickleball_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pb_entrants_pool ON pickleball_entrants(pool_id);
