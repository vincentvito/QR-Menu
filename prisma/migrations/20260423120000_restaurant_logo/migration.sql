-- Per-restaurant logo. Every venue needs its own branding in a
-- multi-restaurant world. Keep `organization.logo` around for now — the
-- settings form dual-writes during the transition, and several reads fall
-- back to it when `restaurant.logo` is null.

-- AlterTable
ALTER TABLE "restaurant" ADD COLUMN "logo" TEXT;

-- Backfill: copy the current org logo to every restaurant that doesn't
-- have one yet. Safe to re-run — only updates rows where logo IS NULL.
UPDATE "restaurant" r
SET "logo" = o."logo"
FROM "organization" o
WHERE r."organizationId" = o."id"
  AND r."logo" IS NULL
  AND o."logo" IS NOT NULL;
