-- figure_submissions
-- Extend `curated_entities` to carry community submissions through a
-- lightweight moderation flow. Existing rows (seeded + scraped) are
-- defaulted to 'approved' so they continue appearing publicly.

ALTER TABLE curated_entities
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submission_status TEXT
    CHECK (submission_status IN ('approved', 'pending', 'rejected'))
    DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submission_proof TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Partial-ish index: directory + admin queue both filter on status, so
-- a plain b-tree index is fine. We also keep the queries simple by
-- never letting NULL leak — the backfill below normalizes pre-existing
-- rows to 'approved'.
CREATE INDEX IF NOT EXISTS idx_curated_entities_status
  ON curated_entities(submission_status);

UPDATE curated_entities
   SET submission_status = 'approved'
 WHERE submission_status IS NULL;
