-- Migration 003: Re-assert gallery delete RLS policies
-- Run in Supabase → SQL Editor → New query → Run
-- Safe to run multiple times (DROP IF EXISTS + CREATE).

-- ── gallery_photos table ──────────────────────────────────────────────────────
-- Superadmin: can delete any row.
-- Admin:      can delete only rows they uploaded (uploaded_by = auth.uid()).

DROP POLICY IF EXISTS "gallery_delete" ON gallery_photos;

CREATE POLICY "gallery_delete" ON gallery_photos
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR (is_admin_or_above() AND uploaded_by = auth.uid())
  );

-- ── storage.objects (gallery bucket) ─────────────────────────────────────────
-- Supabase Storage sets owner = auth.uid() automatically on authenticated upload.
-- Superadmin: can delete any file in the gallery bucket.
-- Admin:      can delete only files they own.

DROP POLICY IF EXISTS "gallery_storage_delete" ON storage.objects;

CREATE POLICY "gallery_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gallery'
    AND (
      is_superadmin()
      OR (is_admin_or_above() AND owner = auth.uid())
    )
  );

-- ── Verify helper functions exist ─────────────────────────────────────────────
-- If these return errors, run migration 001_schema.sql first.
SELECT is_superadmin(), is_admin_or_above();
