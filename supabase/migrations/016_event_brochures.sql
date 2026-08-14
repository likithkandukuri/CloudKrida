-- ── Event Brochures + Upcoming Events ──────────────────────────────────────
-- New work: homepage Events hub (Upcoming + Completed).
--
--  • events / pickleball_tournaments get nullable brochure_* columns. Their
--    existing RLS ("superadmin manage events" FOR ALL / the pickleball
--    tournaments update policy) already covers any new column on those
--    tables — no policy changes needed for these two ALTERs.
--
--  • upcoming_events is genuinely new: it's the only entity that can
--    represent an announced event with NO tournament/event row yet (e.g. a
--    Pickleball tournament that hasn't been created in the app yet).
--    Modeled directly on events' own shape and RLS style (public SELECT,
--    superadmin-only for all writes). linked_event_id /
--    linked_pickleball_tournament_id (both ON DELETE SET NULL, so deleting
--    the real tournament never cascades into deleting the announcement) let
--    a director associate the announcement with the real tournament once it
--    exists, instead of requiring manual deletion — the app stops
--    surfacing an announcement in "Upcoming" once its linked entity is
--    fully complete (checked client-side via the existing, unmodified
--    completion predicates), and the real Completed card takes over.
--
--  • event-brochures Storage bucket — same additive
--    INSERT ... ON CONFLICT DO NOTHING pattern as 015_pickleball_gallery_bucket.sql.
--    Write policies mirror the existing score-records bucket (001_schema.sql,
--    superadmin-only for both upload and delete) rather than the looser
--    admin-or-above gallery bucket, since brochures are event-administrative
--    content, not general admin+ media.
--
-- Column names (brochure_path/brochure_url/brochure_uploaded_at) mirror
-- gallery_photos' own storage_path/public_url/uploaded_at naming — prefixed
-- only because these live as columns on a multi-purpose table, not a
-- dedicated per-file table.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS brochure_path        TEXT,
  ADD COLUMN IF NOT EXISTS brochure_url         TEXT,
  ADD COLUMN IF NOT EXISTS brochure_uploaded_at TIMESTAMPTZ;

ALTER TABLE pickleball_tournaments
  ADD COLUMN IF NOT EXISTS brochure_path        TEXT,
  ADD COLUMN IF NOT EXISTS brochure_url         TEXT,
  ADD COLUMN IF NOT EXISTS brochure_uploaded_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- upcoming_events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS upcoming_events (
  id                               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sport                            TEXT        NOT NULL
                                      CHECK (sport IN ('chess', 'pickleball', 'tennis', 'darts')),
  name                             TEXT        NOT NULL,
  date                             DATE,
  location                         TEXT        DEFAULT '',
  description                      TEXT        DEFAULT '',
  brochure_path                    TEXT,
  brochure_url                     TEXT,
  brochure_uploaded_at             TIMESTAMPTZ,
  linked_event_id                  UUID REFERENCES events(id) ON DELETE SET NULL,
  linked_pickleball_tournament_id  UUID REFERENCES pickleball_tournaments(id) ON DELETE SET NULL,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE upcoming_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upcoming_events_select" ON upcoming_events
  FOR SELECT USING (true);

CREATE POLICY "upcoming_events_manage" ON upcoming_events
  FOR ALL TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

ALTER PUBLICATION supabase_realtime ADD TABLE upcoming_events;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: event-brochures bucket
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-brochures', 'event-brochures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "event_brochures_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-brochures' AND is_superadmin());

CREATE POLICY "event_brochures_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-brochures' AND is_superadmin());
