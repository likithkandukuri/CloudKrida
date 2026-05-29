-- Migration 002: Gallery video support + per-uploader delete permissions
-- Run in Supabase → SQL Editor → New query → Run

-- ── New columns on gallery_photos ────────────────────────────────────────────

-- media_type: 'image' (default, backward-compatible) or 'video'
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video'));

-- uploader_role: snapshot of the uploader's role at the time of upload
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS uploader_role TEXT;

-- ── Updated DELETE policies ───────────────────────────────────────────────────
-- Old policy: superadmin only.
-- New policy: superadmin can delete anything; admins can delete their own uploads.

DROP POLICY IF EXISTS "gallery_delete" ON gallery_photos;

CREATE POLICY "gallery_delete" ON gallery_photos
  FOR DELETE TO authenticated
  USING (
    is_superadmin()
    OR (is_admin_or_above() AND uploaded_by = auth.uid())
  );

-- Storage objects: mirror the same ownership logic.
-- Supabase Storage sets owner = auth.uid() automatically on upload.
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
