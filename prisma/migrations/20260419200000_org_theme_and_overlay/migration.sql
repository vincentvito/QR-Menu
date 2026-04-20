-- AlterTable
ALTER TABLE "organization"
  ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'editorial',
  ADD COLUMN "seasonalOverlay" TEXT NOT NULL DEFAULT 'none';
