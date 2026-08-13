-- ─────────────────────────────────────────────────────────────────────────────
-- New work (post-Track-B) — create the `pickleball-gallery` Storage bucket.
--
-- Migration 005 already defined the RLS policies referencing this bucket
-- (pb_gallery_storage_upload/delete) on the assumption it would be created
-- manually via the dashboard, same as Chess's own `gallery` bucket. Verified
-- live during this session's browser testing that the bucket was never
-- actually created (uploads failed with "Bucket not found"; a direct query
-- against storage.buckets confirmed only `gallery` and `score-records`
-- exist). Creating it here as code, rather than a manual dashboard step,
-- so it's captured and reproducible.
--
-- This does not touch any Track B migration or RLS policy — it only creates
-- the bucket migration 005's policies were already written to expect.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('pickleball-gallery', 'pickleball-gallery', true)
ON CONFLICT (id) DO NOTHING;
