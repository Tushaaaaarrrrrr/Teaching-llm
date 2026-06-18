-- Taxonomy fields for the free-resources browser (Level + Subject + 3 tabs).
-- All IF NOT EXISTS so a re-run after a partial deploy or a hand-patched
-- prod database still converges to schema.prisma cleanly.
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'NOTE';
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "level" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "term" TEXT;

-- Indexes speed up the filter queries on the browser page. CREATE INDEX
-- IF NOT EXISTS so re-runs are no-ops.
CREATE INDEX IF NOT EXISTS "Material_category_idx" ON "Material"("category");
CREATE INDEX IF NOT EXISTS "Material_level_subject_idx" ON "Material"("level", "subject");
