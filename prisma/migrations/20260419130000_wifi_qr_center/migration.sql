-- AlterTable
ALTER TABLE "organization"
  ADD COLUMN "wifiCenterType" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "wifiCenterText" TEXT;
