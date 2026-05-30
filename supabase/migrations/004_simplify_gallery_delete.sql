-- Migration 004: Simplify gallery delete — any admin/superadmin can delete anything
-- Run in Supabase → SQL Editor → New query → Run

-- gallery_photos table: any authenticated admin or superadmin may delete any row
DROP POLICY IF EXISTS "gallery_delete" ON gallery_photos;

CREATE POLICY "gallery_delete" ON gallery_photos
  FOR DELETE TO authenticated
  USING (is_admin_or_above());

-- storage.objects: same rule for the gallery bucket
DROP POLICY IF EXISTS "gallery_storage_delete" ON storage.objects;

CREATE POLICY "gallery_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND is_admin_or_above());
