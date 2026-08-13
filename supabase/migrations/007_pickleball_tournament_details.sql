-- ── Pickleball tournaments — add date/location/description ───────────────────
-- Run this entire file in Supabase → SQL Editor → New query → Run
--
-- Track B Phase 1 (Tournament Administration) needs these fields on the
-- tournament creation/edit form. Additive only — nullable/defaulted columns
-- on a table that currently has zero rows, so there is no data to migrate or
-- risk of loss. Mirrors the column shape Chess's own "events" table already
-- uses for the same concept (date/location/description).

ALTER TABLE pickleball_tournaments
  ADD COLUMN IF NOT EXISTS date        DATE,
  ADD COLUMN IF NOT EXISTS location    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
